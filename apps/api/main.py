from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import sqlite3, csv, io, math, sys, traceback, re, feedparser, requests
from pathlib import Path

root = Path(__file__).resolve().parents[2]
pkg_path = root / "packages"
if str(pkg_path) not in sys.path:
    sys.path.append(str(pkg_path))
import gde.core as gde

app = FastAPI(title="GWX API")
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DB_PATH = str((Path(__file__).parent / "gwx.sqlite").resolve())
def init_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("""CREATE TABLE IF NOT EXISTS decisions(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT, symbol TEXT, side TEXT, reason TEXT, size REAL, created_at TEXT
    )""")
    conn.commit(); conn.close()
init_db()

# ----- Models (unchanged) -----
class BarIn(BaseModel):
    ts: datetime; open: float; high: float; low: float; close: float
    volume: Optional[float] = None

class DecideIn(BaseModel):
    symbol: str = Field(examples=["EURUSD"])
    bars: List[BarIn]

class DecideOut(BaseModel):
    ts: str; symbol: str; side: str; reason: str; size: float
    rsi: Optional[float] = None; sma: Optional[float] = None; price: Optional[float] = None
    score: Optional[float] = None
    components: Optional[Dict[str, float]] = None
    notes: Optional[List[str]] = None
    # news add-ons:
    news_score: Optional[float] = None
    news_headlines: Optional[List[str]] = None
    combined_score: Optional[float] = None

class ProposedOrderOut(BaseModel):
    ts: str; symbol: str; side: str; entry: float; stop: float; take_profit: float
    atr: float; risk_amount: float; rr_ratio: float; size_fraction: float

# ----- News scoring -----
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
_an = SentimentIntensityAnalyzer()

RSS_FEEDS = [
    "https://www.reuters.com/finance/markets/rss",
    "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    "https://www.ft.com/?format=rss",
    "https://www.bloomberg.com/feeds/podcasts/etf-report.xml",  # still RSS
]

SYMBOL_KEYWORDS = {
    "EURUSD": [r"euro\b", r"eur\b", r"ecb\b", r"eurozone"],
    "GBPUSD": [r"pound\b", r"sterling\b", r"boe\b", r"uk\b", r"britain\b"],
    "XAUUSD": [r"gold\b", r"xau\b", r"safe haven"],
    "US500":  [r"s&p\b", r"sp500\b", r"equities\b", r"stocks\b", r"wall street"],
}

def match_symbol(symbol: str, text: str) -> bool:
    pats = SYMBOL_KEYWORDS.get(symbol.upper(), [])
    t = text.lower()
    return any(re.search(p, t) for p in pats)

def news_score_for_symbol(symbol: str, hours: int = 24):
    items = []
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    for url in RSS_FEEDS:
        try:
            feed = feedparser.parse(url)
            for e in feed.entries[:50]:
                title = e.get("title", "")
                published = e.get("published_parsed") or e.get("updated_parsed")
                ts = datetime(*published[:6]) if published else datetime.utcnow()
                if ts < cutoff: continue
                if not title: continue
                if not match_symbol(symbol, title): continue
                s = _an.polarity_scores(title)["compound"]  # -1..+1
                items.append((ts.isoformat(), title, s))
        except Exception:
            continue
    if not items:
        return 0.0, []
    # Weighted average (recent heavier)
    items.sort(key=lambda x: x[0], reverse=True)
    scores = []
    now = datetime.utcnow()
    for ts, title, s in items:
        dt = now - datetime.fromisoformat(ts)
        w = max(0.3, 1.0 - dt.total_seconds() / (hours*3600))  # 0.3..1
        scores.append(s * w)
    v = sum(scores) / len(scores)
    # map -1..+1 → -40..+40 (so news can sway but not dominate)
    gwx_news = max(-40.0, min(40.0, v * 40.0))
    headlines = [t for _, t, _ in items[:8]]
    return gwx_news, headlines

# ----- Utility -----
def _save_decision(d: gde.Decision):
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("INSERT INTO decisions(ts,symbol,side,reason,size,created_at) VALUES(?,?,?,?,?,?)",
                 (d.ts, d.symbol, d.side, d.reason, d.size, datetime.utcnow().isoformat()))
    conn.commit(); conn.close()

def _sanitize(d: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(d)
    for k in ("rsi","sma","price","size","score","news_score","combined_score"):
        v = out.get(k)
        if isinstance(v, float) and (math.isnan(v) or v is None):
            out[k] = None
    return out

# ----- Endpoints -----
@app.get("/")
def root():
    return {"ok": True, "service": "gwx-api",
            "endpoints": ["/health","/news/score","/signals/decide","/orders/proposed","/backtest/csv","/decisions/recent","/docs"]}

@app.get("/health")
def health(): return {"ok": True}

@app.get("/news/score")
def news_score(symbol: str = "EURUSD", hours: int = 24):
    try:
        s, heads = news_score_for_symbol(symbol, hours)
        return {"symbol": symbol, "hours": hours, "news_score": s, "headlines": heads}
    except Exception:
        print("ERROR /news/score:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail="news scoring failed")

@app.post("/signals/decide", response_model=DecideOut)
def signals_decide(payload: DecideIn, include_news: bool = True):
    try:
        bars = [gde.Bar(ts=b.ts.isoformat(), open=b.open, high=b.high, low=b.low, close=b.close, volume=b.volume) for b in payload.bars]
        d = gde.decide(payload.symbol, bars)
        news_s, heads = (0.0, [])
        if include_news:
            try:
                news_s, heads = news_score_for_symbol(payload.symbol, 24)
            except Exception:
                news_s, heads = (0.0, [])
        combined = (d.score or 0.0) + news_s
        out = dict(d.__dict__)
        out["news_score"] = news_s
        out["news_headlines"] = heads
        out["combined_score"] = combined
        _save_decision(d)
        return DecideOut(**_sanitize(out))
    except Exception:
        print("ERROR /signals/decide:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail="decide failed")
