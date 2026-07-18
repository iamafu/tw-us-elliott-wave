import pandas as pd

from . import config

AGG = {
    "open": "first",
    "high": "max",
    "low": "min",
    "close": "last",
    "volume": "sum",
}


def resample(daily: pd.DataFrame, timeframe: str) -> pd.DataFrame:
    rule = config.TIMEFRAMES[timeframe]
    if rule is None:
        return daily
    out = daily.resample(rule).agg(AGG).dropna(subset=["close"])
    return out
