import json
from datetime import datetime, timezone

import pandas as pd

from . import config, fetcher, fibonacci, indicators, resampler, zigzag


def _series_points(s: pd.Series) -> list[dict]:
    return [
        {"t": d.strftime("%Y-%m-%d"), "v": round(float(v), 2)}
        for d, v in s.dropna().items()
    ]


def _ohlc_points(df: pd.DataFrame) -> list[dict]:
    return [
        {
            "t": d.strftime("%Y-%m-%d"),
            "o": round(float(o), 2),
            "h": round(float(h), 2),
            "l": round(float(l), 2),
            "c": round(float(c), 2),
            "v": float(v),
        }
        for d, o, h, l, c, v in df.reset_index().itertuples(index=False, name=None)
    ]


def export_index(name: str, symbol: str) -> list[str]:
    daily = fetcher.load_daily(symbol)
    if daily.empty:
        return []
    config.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    updated = datetime.now(timezone.utc).isoformat(timespec="seconds")
    files: list[str] = []
    for tf in config.TIMEFRAMES:
        df = resampler.resample(daily, tf)
        ohlc = _ohlc_points(df)
        # 高週期最後一根 bar 的期末日期若晚於最新日線，代表本期尚未走完，標記供前端區別
        if tf != "D" and ohlc and df.index[-1] > daily.index[-1]:
            ohlc[-1]["provisional"] = True
        ind = indicators.bias_with_quantiles(
            df["close"], config.BIAS_MA_PERIODS[tf], config.BIAS_QUANTILES
        )
        pivots = zigzag.compute(df, config.ZIGZAG_THRESHOLDS[tf])
        payload = {
            "index": name,
            "symbol": symbol,
            "timeframe": tf,
            "updated": updated,
            "ohlc": ohlc,
            "ma": {str(n): _series_points(v["ma"]) for n, v in ind.items()},
            "bias": {
                str(n): {
                    "series": _series_points(v["bias"]),
                    "quantiles": v["quantiles"],
                }
                for n, v in ind.items()
            },
            "zigzag": pivots,
            "fib": fibonacci.latest_swing_levels(pivots),
        }
        path = config.EXPORT_DIR / f"{name}-{tf}.json"
        path.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        files.append(path.name)
    return files


def _sync_labels() -> None:
    # 人工標記的正本在 data/labels，發布時複製到 docs 讓靜態頁面讀取
    if not config.LABELS_DIR.exists():
        return
    dest = config.EXPORT_DIR / "labels"
    dest.mkdir(parents=True, exist_ok=True)
    for f in config.LABELS_DIR.glob("*.json"):
        (dest / f.name).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")


def export_all() -> list[str]:
    files: list[str] = []
    for name, symbol in config.INDICES.items():
        files.extend(export_index(name, symbol))
    _sync_labels()
    manifest = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "indices": list(config.INDICES.keys()),
        "timeframes": list(config.TIMEFRAMES.keys()),
        "files": files,
    }
    config.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    (config.EXPORT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return files
