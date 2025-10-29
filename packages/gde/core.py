from dataclasses import dataclass
from typing import Optional, Literal, List
import numpy as np

Side = Literal["long","short","flat"]

@dataclass
class Bar:
    ts: str
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = None

@dataclass
class Decision:
    ts: str
    symbol: str
    side: Side
    reason: str
    size: float  # 0..1 gross exposure fraction
    rsi: float
    sma: float
    price: float

def rsi_value(closes: List[float], period: int = 14) -> float:
    if len(closes) < period + 1:
        return float("nan")
    deltas = np.diff(closes[-(period+1):])
    gains = np.where(deltas > 0, deltas, 0.0).sum() / period
    losses = -np.where(deltas < 0, deltas, 0.0).sum() / period
    if losses == 0:
        return 100.0
    rs = gains / losses
    return 100.0 - (100.0 / (1.0 + rs))

def sma_value(closes: List[float], n: int) -> float:
    if len(closes) < n:
        return float("nan")
    return float(np.mean(closes[-n:]))

def decide(symbol: str, bars: List[Bar]) -> Decision:
    closes = [b.close for b in bars]
    last = bars[-1]
    r = rsi_value(closes, 14)
    ma = sma_value(closes, 50)
    price = last.close

    if np.isnan(r) or np.isnan(ma):
        return Decision(last.ts, symbol, "flat", "insufficient_data", 0.0, r, ma, price)

    prev_r = rsi_value(closes[:-1], 14)

    if prev_r < 30 <= r and price > ma:
        size = min(0.5, abs((r - 50)/50))
        return Decision(last.ts, symbol, "long", "rsi_cross_up_and_above_ma", size, r, ma, price)

    if prev_r > 70 >= r and price < ma:
        size = min(0.5, abs((50 - r)/50))
        return Decision(last.ts, symbol, "short", "rsi_cross_down_and_below_ma", size, r, ma, price)

    return Decision(last.ts, symbol, "flat", "no_edge", 0.0, r, ma, price)
