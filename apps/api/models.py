from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from db import Base

class Signal(Base):
    __tablename__ = "signals"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    event_id = Column(String, index=True)
    country = Column(String)
    category = Column(String)
    consensus = Column(Float)
    actual = Column(Float)
    unit = Column(String)
    z = Column(Float)
    impact = Column(Float)
    regime = Column(String)
    symbol = Column(String, index=True)
    mode = Column(String)
    side = Column(String, nullable=True)
    entry = Column(String)
    stop = Column(String)
    tp1 = Column(String, nullable=True)
    tp2 = Column(String, nullable=True)
    notes = Column(String)
    sizing_pct = Column(Float)
    confirmed = Column(Boolean, default=False)
    confirm_reasons = Column(String)

