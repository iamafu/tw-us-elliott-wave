from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "market.db"
LABELS_DIR = DATA_DIR / "labels"
EXPORT_DIR = PROJECT_ROOT / "docs" / "data"

# TAIEX 在 Yahoo Finance 最早只到 1997-07，起始日設 1996 以涵蓋 SOX/NASDAQ 更早資料
BACKFILL_START = "1996-01-01"

INDICES = {
    "TAIEX": "^TWII",
    "SOX": "^SOX",
    "NASDAQ": "^IXIC",
}

# D 為原始日線不重採樣；其餘為 pandas resample 規則
TIMEFRAMES = {
    "D": None,
    "W": "W-FRI",
    "M": "ME",
    "Q": "QE",
    "Y": "YE",
}

# 日線採台灣慣用 6/12/24 加長期 72/240；長週期依可用樣本數遞減
BIAS_MA_PERIODS = {
    "D": [6, 12, 24, 72, 240],
    "W": [4, 13, 26, 52],
    "M": [6, 12, 24, 60],
    "Q": [4, 8, 20],
    "Y": [3, 5, 10],
}

# ZigZag 轉折門檻（價格反向變動比例），週期越長門檻越大以濾除雜訊
ZIGZAG_THRESHOLDS = {
    "D": 0.05,
    "W": 0.08,
    "M": 0.12,
    "Q": 0.18,
    "Y": 0.25,
}

# 乖離率歷史分位數，用於前端標示極端乖離帶
BIAS_QUANTILES = [0.05, 0.10, 0.90, 0.95]
