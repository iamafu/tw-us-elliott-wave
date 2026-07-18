import pandas as pd


def bias_with_quantiles(
    close: pd.Series, periods: list[int], quantiles: list[float]
) -> dict[int, dict]:
    out: dict[int, dict] = {}
    for n in periods:
        if len(close) < n:
            continue
        ma = close.rolling(n).mean()
        bias = (close - ma) / ma * 100
        q = {
            f"p{int(p * 100):02d}": round(float(bias.quantile(p)), 2)
            for p in quantiles
        }
        out[n] = {"ma": ma, "bias": bias, "quantiles": q}
    return out
