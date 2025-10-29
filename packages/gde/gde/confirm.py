# packages/gde/gde/confirm.py
from .types import Confirmation

def confirm(ok_range_break:bool=True, ok_volume_spike:bool=True)->Confirmation:
    ok = ok_range_break and ok_volume_spike
    reasons = []
    if not ok_range_break: reasons.append("No range-break")
    if not ok_volume_spike: reasons.append("No volume spike")
    return Confirmation(ok=ok, reasons=reasons)
