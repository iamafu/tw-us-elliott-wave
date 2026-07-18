# tw-us-elliott-wave

台灣加權指數（TAIEX）、費城半導體（SOX）、那斯達克（NASDAQ）的波浪理論與乖離率分析系統。

## 功能

- **資料**：yfinance 抓取近 30 年日線，SQLite 儲存，每日增量更新
- **時間週期**：日 / 週 / 月 / 季 / 年（由日線重採樣產生）
- **乖離率**：多組 MA 參數（日線 6/12/24/72/240），含歷史分位數極端帶
- **ZigZag 轉折點**：各週期獨立門檻（日 5%、週 8%、月 12%、季 18%、年 25%）
- **費波納契**：最新擺動的回撤 / 延伸位
- **波浪標記**：半自動 — 系統偵測轉折點，人工標記波浪計數，艾略特鐵律檢核

## 使用方式

```bash
pip install -r requirements.txt

# 一次性 30 年回填
python scripts/backfill.py

# 每日增量更新（收盤後執行）
python scripts/update.py

# 啟動本機伺服器（http://localhost:8765，含波浪標記儲存 API）
python -m src.server
```

### 波浪標記操作

1. 點「標記模式」啟用編輯
2. 點擊圖上任一 ZigZag 轉折點附近 → 彈出選單選 1~5 / A~C（✕ 清除）
3. 狀態列即時顯示鐵律檢核結果（浪 2 不破浪 1 起點、浪 3 非最短、浪 4 不入浪 1 區間）
4. 點「儲存標記」寫入 `data/labels/`（GitHub Pages 線上版為唯讀，標記需在本機編輯後 commit）

輸出 JSON 位於 `docs/data/`，前端頁面位於 `docs/`。

## 專案結構

```
src/        分析引擎（fetcher / resampler / indicators / zigzag / fibonacci / exporter）
scripts/    backfill.py（回填）、update.py（每日更新）
data/       market.db（SQLite 日線）、labels/（人工波浪標記）
docs/       GitHub Pages 發布目錄（前端 + JSON 資料）
```

## 資料範圍

| 指數 | 代碼 | 起始日 |
|-----|------|-------|
| TAIEX | ^TWII | 1997-07-02（Yahoo Finance 上限） |
| SOX | ^SOX | 1996-01-02 |
| NASDAQ | ^IXIC | 1996-01-02 |
