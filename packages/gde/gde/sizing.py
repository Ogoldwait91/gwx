# packages/gde/gde/sizing.py
from dataclasses import dataclass
from .types import SizingDecision

class DailyRiskGuard:
    def __init__(self, cap_pct:float=1.5):
        self.cap_pct = cap_pct
        self.today_loss_pct = 0.0
    def register_pnl(self, pnl_pct:float):
        self.today_loss_pct += pnl_pct
    def can_trade(self)->bool:
        return self.today_loss_pct > -self.cap_pct

_guard = DailyRiskGuard()

def sizing(conviction:float, base_risk:float=0.5)->SizingDecision:
    if not _guard.can_trade():
        return SizingDecision(trade_risk_pct=0.0, blocked=True, reason="Daily loss cap reached")
    risk = base_risk + min(max(conviction,0.0),1.0)*0.5  # 0.5%..1.0%
    return SizingDecision(trade_risk_pct=round(risk,2), blocked=False, reason=None)
