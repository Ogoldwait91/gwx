# packages/gde/gde/mapping.py
from typing import List, Tuple, Dict
from .types import AssetImpact

EVENT_ASSET_MAP: Dict[Tuple[str,str], List[AssetImpact]] = {
  ("US","CPI_YoY"): [
    AssetImpact("DXY",     0.8, +1),
    AssetImpact("XAUUSD",  0.9, -1),
    AssetImpact("NAS100",  0.7, -1),
    AssetImpact("EURUSD",  0.8, -1),
  ],
  ("UK","CPI_YoY"): [
    AssetImpact("GBPUSD",  0.9, +1),
    AssetImpact("FTSE100", 0.6, -1),
    AssetImpact("XAUUSD",  0.4, -1),
  ],
}

def affected_assets(country:str, category:str)->List[AssetImpact]:
    return EVENT_ASSET_MAP.get((country, category), [])
