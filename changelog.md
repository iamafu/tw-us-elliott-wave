# Changelog

## 2026-07-18

- 新增：前端主頁（深色交易終端風，K 線 + ZigZag + 乖離率副圖，3 指數 × 5 週期切換）
- 新增：波浪標記編輯（轉折點吸附、1-5/A-C 標籤、艾略特三大鐵律即時檢核）
- 新增：本機 FastAPI server（靜態頁 + 標記儲存 API，前後端雙重鐵律驗證）
- 修復：美股排程 cron 改 UTC Mon-Fri，補齊週五收盤更新
- 修復：月/季/年未完成 bar 標記 provisional，前端顯示〔本期未完成〕
- 修復：GET /api/labels 補上 index/tf 白名單驗證

- 新增：資料層（yfinance 抓取 + SQLite 儲存 + 30 年回填 + 每日增量更新）
- 新增：分析層（乖離率含分位數、ZigZag 轉折點、費波納契回撤/延伸）
- 新增：輸出層（3 指數 × 5 週期 JSON + manifest）
