from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List
import os, sys

# add packages/gde to import path
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(os.path.join(repo_root, "packages", "gde"))

from gde.types import Event
from gde.pipeline import decide_for_event

from db import SessionLocal, init_db
from models import Signal as SignalModel

app = FastAPI(title="GWX - Goldwait Exchange API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EventOut(BaseModel):
    id: str
    time_utc: datetime
    country: str
    category: str
    importance: int
    consensus: float
    unit: str
    has_actual: bool

class SignalOut(BaseModel):
    created_at: datetime
    event_id: str
    country: str
    category: str
    consensus: float
    actual: float
    unit: str
    z: float
    impact: float
    regime: str
    symbol: str
    mode: str
    side: str | None
    entry: str
    stop: str
    tp1: str | None
    tp2: str | None
    notes: str
    sizing_pct: float
    confirmed: bool
    confirm_reasons: str

def _stub_events() -> List[Event]:
    now = datetime.utcnow()
    return [
        Event(id="us_cpi_yoy", time_utc=now, country="US", category="CPI_YoY", importance=3, consensus=3.3, actual=3.5, unit="%"),
        Event(id="uk_cpi_yoy", time_utc=now + timedelta(minutes=30), country="UK", category="CPI_YoY", importance=3, consensus=2.8, actual=2.7, unit="%"),
    ]

def _get_atr(symbol: str) -> float:
    defaults = {"XAUUSD":0.6, "GBPUSD":0.3, "EURUSD":0.25, "NAS100":1.2, "DXY":0.2, "FTSE100":0.8}
    return defaults.get(symbol, 0.5)

@app.on_event("startup")
def _startup():
    init_db()

@app.get("/health")
def health():
    return {"ok": True, "service":"GWX API"}

@app.get("/events", response_model=List[EventOut])
def events():
    out = []
    for ev in _stub_events():
        out.append(EventOut(
            id=ev.id, time_utc=ev.time_utc, country=ev.country, category=ev.category,
            importance=ev.importance, consensus=ev.consensus, unit=ev.unit,
            has_actual=ev.actual is not None
        ))
    return out

@app.post("/run-decisions")
def run_decisions():
    """Generate signals from stub events, persist to DB, and return them."""
    signals = []
    for ev in _stub_events():
        for s in decide_for_event(ev, get_atr=_get_atr):
            signals.append(s)
            _save_signal(s)
    return {"signals": signals}

@app.get("/signals", response_model=List[SignalOut])
def get_signals(limit: int = 50):
    db = SessionLocal()
    try:
        rows = db.query(SignalModel).order_by(SignalModel.id.desc()).limit(limit).all()
        rows.reverse()
        return [SignalOut(
            created_at=r.created_at, event_id=r.event_id, country=r.country, category=r.category,
            consensus=r.consensus, actual=r.actual, unit=r.unit, z=r.z, impact=r.impact, regime=r.regime,
            symbol=r.symbol, mode=r.mode, side=r.side, entry=r.entry, stop=r.stop, tp1=r.tp1, tp2=r.tp2,
            notes=r.notes, sizing_pct=r.sizing_pct, confirmed=r.confirmed, confirm_reasons=r.confirm_reasons or ""
        ) for r in rows]
    finally:
        db.close()

def _save_signal(s: dict):
    db = SessionLocal()
    try:
        row = SignalModel(
            event_id=s["event_id"], country=s["country"], category=s["category"],
            consensus=s["consensus"], actual=s["actual"], unit=s["unit"], z=s["z"], impact=s["impact"],
            regime=s["regime"], symbol=s["symbol"], mode=s["playbook"]["mode"], side=s["playbook"]["side"],
            entry=s["playbook"]["entry"], stop=s["playbook"]["stop"], tp1=s["playbook"]["tp1"], tp2=s["playbook"]["tp2"],
            notes=s["playbook"]["notes"], sizing_pct=s["sizing_pct"], confirmed=s["confirmed"],
            confirm_reasons=",".join(s.get("confirm_reasons", []))
        )
        db.add(row)
        db.commit()
    finally:
        db.close()

