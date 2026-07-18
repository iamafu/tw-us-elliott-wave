import sqlite3

import pandas as pd
import yfinance as yf

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS daily_ohlc (
    symbol TEXT NOT NULL,
    date   TEXT NOT NULL,
    open   REAL,
    high   REAL,
    low    REAL,
    close  REAL,
    volume REAL,
    PRIMARY KEY (symbol, date)
)
"""


def get_conn() -> sqlite3.Connection:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(SCHEMA)
    return conn


def _download(symbol: str, start: str) -> pd.DataFrame:
    # auto_adjust=False 保留指數原始收盤價，指數無除權息不需還原
    df = yf.download(symbol, start=start, progress=False, auto_adjust=False)
    if df is None or df.empty:
        return pd.DataFrame()
    # yfinance 1.x 單一 ticker 也回傳 (Price, Ticker) MultiIndex 欄位
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.rename(columns=str.lower)[["open", "high", "low", "close", "volume"]]
    if getattr(df.index, "tz", None) is not None:
        df.index = df.index.tz_localize(None)
    df.index = df.index.normalize()
    df = df.dropna(subset=["close"])
    return df


def _upsert(conn: sqlite3.Connection, symbol: str, df: pd.DataFrame) -> int:
    rows = [
        (
            symbol,
            d.strftime("%Y-%m-%d"),
            float(o),
            float(h),
            float(l),
            float(c),
            float(v) if pd.notna(v) else 0.0,
        )
        for d, o, h, l, c, v in df.reset_index().itertuples(index=False, name=None)
    ]
    conn.executemany(
        "INSERT OR REPLACE INTO daily_ohlc VALUES (?,?,?,?,?,?,?)", rows
    )
    conn.commit()
    return len(rows)


def last_date(conn: sqlite3.Connection, symbol: str) -> str | None:
    cur = conn.execute(
        "SELECT MAX(date) FROM daily_ohlc WHERE symbol = ?", (symbol,)
    )
    return cur.fetchone()[0]


def update_symbol(conn: sqlite3.Connection, symbol: str, full: bool = False) -> int:
    start = config.BACKFILL_START
    if not full:
        ld = last_date(conn, symbol)
        if ld:
            # 從最後一天重抓（含當天），確保盤後修正的收盤資料會覆寫舊值
            start = ld
    df = _download(symbol, start)
    if df.empty:
        return 0
    return _upsert(conn, symbol, df)


def update_all(full: bool = False) -> dict[str, int]:
    conn = get_conn()
    try:
        return {
            name: update_symbol(conn, symbol, full=full)
            for name, symbol in config.INDICES.items()
        }
    finally:
        conn.close()


def load_daily(symbol: str) -> pd.DataFrame:
    conn = get_conn()
    try:
        df = pd.read_sql_query(
            "SELECT date, open, high, low, close, volume FROM daily_ohlc "
            "WHERE symbol = ? ORDER BY date",
            conn,
            params=(symbol,),
            parse_dates=["date"],
            index_col="date",
        )
    finally:
        conn.close()
    return df
