# packages/gde/gde/surprise.py
from .types import SurpriseResult

def zscore_surprise(actual:float, consensus:float, hist_sigma:float=0.10)->SurpriseResult:
    sigma = hist_sigma if hist_sigma>0 else 0.10
    z = (actual - consensus) / max(sigma, 1e-6)
    return SurpriseResult(z=z, hist_sigma=sigma)
