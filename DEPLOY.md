# DEPLOY.md

## Runtime

- Python 3.11（GitHub Actions 使用 `actions/setup-python@v5` 指定 3.11）
- 前端為純靜態 HTML/JS/CSS，無建置步驟

## Environment Variables

無。本專案不需要任何 env 變數（資料來源 yfinance 為免金鑰公開 API）。

## Required Services

- GitHub Actions（每日排程更新，免費額度即可）
- Yahoo Finance（經 yfinance 套件抓取，無需帳號）
- SQLite（隨 repo 攜帶 `data/market.db`，無外部 DB 伺服器）

## Build & Start

```bash
pip install -r requirements.txt

# 一次性 30 年回填（僅首次或重建 DB 時）
python scripts/backfill.py

# 每日增量更新（Actions 排程執行的同一支）
python scripts/update.py

# 本機伺服器（瀏覽 + 波浪標記編輯）
python -m src.server
```

## Ports

- `8765`：本機 FastAPI（靜態頁 + `/api/labels` 標記儲存 API）
- 線上版由 GitHub Pages 服務，無自管 port

## Deploy Steps

1. Repo：`https://github.com/iamafu/tw-us-elliott-wave`（Public，2026-07-18 由 Private 轉換以啟用免費 Pages）
2. 排程：`.github/workflows/daily-update.yml` — UTC 06:30（台北 14:30，台股收盤後）與 UTC 21:30 Mon-Fri（台北隔日 05:30，美股收盤後）自動更新並 commit `data/` 與 `docs/data/`
3. 網頁：GitHub Pages 已啟用，`main` 分支 `/docs` 目錄 → https://iamafu.github.io/tw-us-elliott-wave/
4. 波浪標記：線上版唯讀；標記於本機 `python -m src.server` 編輯後 commit push，Pages 於數分鐘內自動重建
