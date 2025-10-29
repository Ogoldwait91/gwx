# packages/gde/gde/types.py
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Dict

@dataclass
class Event:
    id: str
    time_utc: datetime
    country: str
    category: str
    importance: int
    consensus: float
    actual: Optional[float]
    unit: str

@dataclass
class AssetImpact:
    symbol: str
    weight: float
    dir_sign: int  # +1 if positive surprise -> asset up; -1 otherwise

@dataclass
class SurpriseResult:
    z: float
    hist_sigma: float

@dataclass
class Regime:
    label: str
    meta: Dict

@dataclass
class Confirmation:
    ok: bool
    reasons: List[str]

@dataclass
class Playbook:
    mode: str
    side: Optional[str]
    entry: str
    stop: str
    tp1: Optional[str]
    tp2: Optional[str]
    notes: str

@dataclass
class SizingDecision:
    trade_risk_pct: float
    blocked: bool
    reason: Optional[str]
