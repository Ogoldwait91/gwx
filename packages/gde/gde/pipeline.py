# packages/gde/gde/pipeline.py
from typing import List
from .types import Event, AssetImpact, Regime, Confirmation, Playbook, SizingDecision
from .types import SurpriseResult
from .surprise import zscore_surprise
from .mapping import affected_assets
from .regime import regime_label
from .confirm import confirm
from .playbook import trend_play, fade_play
from .sizing import sizing

def _impact_score(importance:int, z:float, weight:float)->float:
    return importance * abs(z) * weight

def _bias_from(z:float, dir_sign:int)->int:
    if z==0: return 0
    return +1 if (z>0 and dir_sign>0) or (z<0 and dir_sign<0) else -1

def decide_for_event(ev:Event, get_atr)->List[dict]:
    """Return a list of trade cards (dict) for affected assets."""
    if ev.actual is None:
        return []
    out = []
    s: SurpriseResult = zscore_surprise(ev.actual, ev.consensus, hist_sigma=0.10)
    reg: Regime = regime_label()
    assets = affected_assets(ev.country, ev.category)
    for a in assets:
        imp = _impact_score(ev.importance, s.z, a.weight)
        bias = _bias_from(s.z, a.dir_sign)
        atr = float(get_atr(a.symbol))

        # choose playbook
        play: Playbook
        if imp < 0.5:
            play = Playbook("no-trade", None, "No trade (low conviction)","",None,None,"Impact < 0.5")
        else:
            play = trend_play(a.symbol, bias, atr) if (reg.label=="trend" or imp>=1.0) else fade_play(a.symbol, bias, atr)

        # size & simple confirmation (stub true/true for now)
        conv = min(1.0, imp / 1.0)
        size: SizingDecision = sizing(conviction=conv, base_risk=0.5)
        conf: Confirmation = confirm(True, True)

        out.append({
            "event_id": ev.id,
            "country": ev.country,
            "category": ev.category,
            "consensus": ev.consensus,
            "actual": ev.actual,
            "unit": ev.unit,
            "z": round(s.z,2),
            "impact": round(imp,2),
            "regime": reg.label,
            "symbol": a.symbol,
            "playbook": {
                "mode": play.mode, "side": play.side,
                "entry": play.entry, "stop": play.stop,
                "tp1": play.tp1, "tp2": play.tp2, "notes": play.notes
            },
            "sizing_pct": size.trade_risk_pct,
            "confirmed": conf.ok,
            "confirm_reasons": conf.reasons
        })
    return out
