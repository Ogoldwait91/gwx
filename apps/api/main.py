from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import sqlite3, csv, io
from pathlib import Path
import sys, traceback

# ---- import decision engine ----
root = Path(__file__).resolve().parents[2]
pkg_path = root / "packages"
if str(pkg_path) not in sys.path:
    sys.path.append(str(pkg_path))
import gde.core as gde

app = FastAPI(title="GWX API")

origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

DB_PATH = str((Path(__file__).parent / "gwx.sqlite").resolve())

def init_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("""CREATE TABLE IF NOT EXISTS decisions(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT, symbol TEXT, side TEXT, reason TEXT, size REAL, created_at TEXT
    )""")
    conn.commit(); conn.close()
init_db()

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
    rsi: float
    sma: float
    price: float

@app.get("/")
def root_route():
    return {"ok": True, "service": "gwx-api", "endpoints": ["/health", "/signals/decide", "/signals/decide/csv", "/decisions/recent", "/docs"]}

@app.get("/health")
def health():
    return {"ok": True}

def _save(d):
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("INSERT INTO decisions(ts,symbol,side,reason,size,created_at) VALUES(?,?,?,?,?,?)",
                 (d.ts, d.symbol, d.side, d.reason, d.size, datetime.utcnow().isoformat()))
    conn.commit(); conn.close()

@app.post("/signals/decide", response_model=DecideOut)
def decide(payload: DecideIn):
    try:
        bars = [gde.Bar(ts=b.ts.isoformat(), open=b.open, high=b.high, low=b.low, close=b.close, volume=b.volume) for b in payload.bars]
        d = gde.decide(payload.symbol, bars)
        _save(d)
        return DecideOut(**d.__dict__)
    except Exception:
        print("ERROR /signals/decide:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail="decide failed")

@app.post("/signals/decide/csv", response_model=DecideOut)
def decide_csv(symbol: str = "EURUSD", csv_text: str = Body(..., media_type="text/plain")):
    """
    Accepts raw CSV text:
    ts,open,high,low,close,volume
    2025-10-28T09:00:00Z,1.0701,1.0710,1.0690,1.0705,1000
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
        if len(bars) == 0:
            raise ValueError("no rows parsed")
        d = gde.decide(symbol, bars)
        _save(d)
        return DecideOut(**d.__dict__)
    except Exception:
        print("ERROR /signals/decide/csv:\n", traceback.format_exc())
        raise HTTPException(status_code=400, detail="CSV parse or decide failed")

@app.get("/decisions/recent")
def recent(limit: int = 20):
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    cur = conn.execute("SELECT ts,symbol,side,reason,size,created_at FROM decisions ORDER BY id DESC LIMIT ?", (limit,))
    rows = [{"ts":r[0], "symbol":r[1], "side":r[2], "reason":r[3], "size":r[4], "created_at":r[5]} for r in cur.fetchall()]
    conn.close()
    return {"items": rows, "count": len(rows)}
