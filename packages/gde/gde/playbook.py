from .types import Playbook

def trend_play(symbol:str, bias:int, atr:float)->Playbook:
    side = "LONG" if bias>0 else "SHORT"
    return Playbook(
        mode="trend", side=side,
        entry="1-5m close beyond pre-event range in bias direction",
        stop=f"Pre-range mid ± {0.8*atr:.2f} ATR",
        tp1=f"{1.0*atr:.2f} ATR", tp2="Trail to VWAP",
        notes="Avoid first 2-3m if spreads widen"
    )

def fade_play(symbol:str, bias:int, atr:float)->Playbook:
    side = "SHORT" if bias>0 else "LONG"
    return Playbook(
        mode="fade", side=side,
        entry="Revert at VWAP after spike >2σ with weak surprise",
        stop=f"Outside spike hi/lo (~{0.6*atr:.2f} ATR)",
        tp1=f"{0.5*atr:.2f} ATR", tp2=None,
        notes="Prefer range regime"
    )
