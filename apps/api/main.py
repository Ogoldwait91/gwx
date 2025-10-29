from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import sqlite3, csv, io, math
from pathlib import Path
import sys, traceback

# ---- import decision engine ----
root = Path(__file__).resolve().parents[2]
pkg_path = root / "packages"
if str(pkg_path) not in sys.path:
    sys.path.append(str(pkg_path))
import gde.core as gde

# ---- app + CORS ----
app = FastAPI(title="GWX API")
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# ---- DB (decisions history) ----
DB_PATH = str((Path(__file__).parent / "gwx.sqlite").resolve())
def init_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("""CREATE TABLE IF NOT EXISTS decisions(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT, symbol TEXT, side TEXT, reason TEXT, size REAL, created_at TEXT
    )""")
    conn.commit(); conn.close()
init_db()

# ---- Schemas ----
class BarIn(BaseModel):
    ts: datetime
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = None

class DecideIn(BaseModel):
    symbol: str = Field(examples=["EURUSD"])
    bars: List[BarIn]

class DecideOut(BaseModel):
    ts: str
    symbol: str
    side: str
    reason: str
    size: float
    rsi: Optional[float] = None
    sma: Optional[float] = None
    price: Optional[float] = None

class ProposedOrderOut(BaseModel):
    ts: str
    symbol: str
    side: str
    entry: float
    stop: float
    take_profit: float
    atr: float
    risk_amount: float
    rr_ratio: float
    size_fraction: float

# ---- Helpers ----
def _save_decision(d: gde.Decision):
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("INSERT INTO decisions(ts,symbol,side,reason,size,created_at) VALUES(?,?,?,?,?,?)",
                 (d.ts, d.symbol, d.side, d.reason, d.size, datetime.utcnow().isoformat()))
    conn.commit(); conn.close()

def _to_dict_sanitized(d) -> dict:
    out = dict(d.__dict__)
    for k in ("rsi","sma","price","size"):
        v = out.get(k)
        if isinstance(v, float) and math.isnan(v):
            out[k] = None
    return out

# ---- Endpoints ----
@app.get("/")
def root_route():
    return {"ok": True, "service": "gwx-api",
            "endpoints": ["/health", "/signals/decide", "/signals/decide/csv", "/orders/proposed", "/backtest/csv", "/decisions/recent", "/docs"]}

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/signals/decide", response_model=DecideOut)
def signals_decide(payload: DecideIn):
    try:
        bars = [gde.Bar(ts=b.ts.isoformat(), open=b.open, high=b.high, low=b.low, close=b.close, volume=b.volume) for b in payload.bars]
        d = gde.decide(payload.symbol, bars)
        _save_decision(d)
        return DecideOut(**_to_dict_sanitized(d))
    except Exception:
        print("ERROR /signals/decide:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail="decide failed")

@app.post("/signals/decide/csv", response_model=DecideOut)
def signals_decide_csv(symbol: str = "EURUSD", csv_text: str = Body(..., media_type="text/plain")):
    try:
        f = io.StringIO(csv_text.strip())
        reader = csv.DictReader(f)
        bars = []
        for row in reader:
            bars.append(gde.Bar(
                ts=row["ts"], open=float(row["open"]), high=float(row["high"]),
                low=float(row["low"]), close=float(row["close"]),
                volume=float(row.get("volume", "0") or 0.0)
            ))
        if len(bars) == 0:
            raise ValueError("no rows parsed")
        d = gde.decide(symbol, bars)
        _save_decision(d)
        return DecideOut(**_to_dict_sanitized(d))
    except Exception:
        print("ERROR /signals/decide/csv:\n", traceback.format_exc())
        raise HTTPException(status_code=400, detail="CSV parse or decide failed")

@app.post("/orders/proposed", response_model=ProposedOrderOut)
def orders_proposed(
    symbol: str = "EURUSD",
    risk_percent: float = 0.5,
    account_equity: float = 10000.0,
    atr_mult_sl: float = 1.5,
    tp_r_multiple: float = 2.0,
    payload: DecideIn = Body(...)
):
    try:
        bars = [gde.Bar(ts=b.ts.isoformat(), open=b.open, high=b.high, low=b.low, close=b.close, volume=b.volume) for b in payload.bars]
        d = gde.decide(symbol, bars)
        po = gde.propose_order(symbol, bars, d, risk_percent, account_equity, atr_mult_sl, tp_r_multiple)
        if po is None:
            raise HTTPException(status_code=400, detail="no_order: need ATR and side context")
        return ProposedOrderOut(**po.__dict__)
    except HTTPException:
        raise
    except Exception:
        print("ERROR /orders/proposed:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail="orders proposed failed")

@app.post("/backtest/csv")
def backtest_csv(
    symbol: str = "EURUSD",
    risk_percent: float = 0.5,
    account_equity: float = 10000.0,
    atr_mult_sl: float = 1.5,
    tp_r_multiple: float = 2.0,
    min_warmup: int = 60,
    csv_text: str = Body(..., media_type="text/plain")
):
    """
    Upload candles CSV (ts,open,high,low,close,volume) to run a simple backtest.
    min_warmup controls how many bars are kept for indicator warm-up (default 60).
    """
    try:
        f = io.StringIO(csv_text.strip())
        reader = csv.DictReader(f)
        bars = []
        for row in reader:
            bars.append(gde.Bar(
                ts=row["ts"], open=float(row["open"]), high=float(row["high"]),
                low=float(row["low"]), close=float(row["close"]),
                volume=float(row.get("volume", "0") or 0.0)
            ))
        need = max(20, min_warmup)
        got = len(bars)
        if got < need:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough data: got {got} bars. Need at least {need} for indicators. "
                       f"Tip: export ~100 bars. Columns must be ts,open,high,low,close,volume."
            )
        res = gde.backtest_from_bars(
            symbol=symbol, bars=bars,
            risk_percent=risk_percent, account_equity=account_equity,
            atr_mult_sl=atr_mult_sl, tp_r_multiple=tp_r_multiple
        )
        return res
    except HTTPException:
        raise
    except Exception:
        print("ERROR /backtest/csv:\n", traceback.format_exc())
        raise HTTPException(status_code=400, detail="Backtest failed. Check CSV header and numeric values.")

@app.get("/decisions/recent")
def recent(limit: int = 20):
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    cur = conn.execute("SELECT ts,symbol,side,reason,size,created_at FROM decisions ORDER BY id DESC LIMIT ?", (limit,))
    rows = [{"ts":r[0], "symbol":r[1], "side":r[2], "reason":r[3], "size":r[4], "created_at":r[5]} for r in cur.fetchall()]
    conn.close()
    return {"items": rows, "count": len(rows)}
