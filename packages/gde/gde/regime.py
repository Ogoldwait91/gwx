# packages/gde/gde/regime.py
from .types import Regime

def regime_label(vol_percentile:float=70.0)->Regime:
    label = "trend" if vol_percentile>=60 else "range"
    return Regime(label=label, meta={"vol_pct":vol_percentile})
