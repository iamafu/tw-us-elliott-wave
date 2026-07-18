(function () {
  "use strict";

  var COLORS = {
    bg: "#131722",
    panel: "#1E222D",
    grid: "#2A2E39",
    text: "#D1D4DC",
    textDim: "#787B86",
    accent: "#FFB74D",
    twUp: "#EF5350",
    twDown: "#26A69A",
    blue: "#42A5F5",
  };

  var TF_LABELS = { D: "日線", W: "週線", M: "月線", Q: "季線", Y: "年線" };
  var INDEX_LABELS = { TAIEX: "加權指數", SOX: "費城半導體", NASDAQ: "那斯達克" };
  // 各週期預設 MA 參數，對應台灣慣用中期均線
  var DEFAULT_MA = { D: "24", W: "13", M: "12", Q: "8", Y: "5" };

  var state = {
    index: "TAIEX",
    tf: "D",
    ma: null,
    twColor: true,
    showFib: false,
    payload: null,
    labels: [],
    editMode: false,
  };

  var chartOpts = {
    layout: {
      background: { type: "solid", color: COLORS.panel },
      textColor: COLORS.text,
      fontFamily: "'Segoe UI', 'Microsoft JhengHei', sans-serif",
    },
    grid: {
      vertLines: { color: COLORS.grid },
      horzLines: { color: COLORS.grid },
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: COLORS.grid },
    timeScale: { borderColor: COLORS.grid, timeVisible: false },
  };

  var mainEl = document.getElementById("main-chart");
  var biasEl = document.getElementById("bias-chart");
  var mainChart = LightweightCharts.createChart(mainEl, chartOpts);
  var biasChart = LightweightCharts.createChart(biasEl, chartOpts);

  var candleSeries = mainChart.addCandlestickSeries();
  var zigzagSeries = mainChart.addLineSeries({
    color: COLORS.accent,
    lineWidth: 2,
    lineStyle: LightweightCharts.LineStyle.Solid,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
  });
  var biasSeries = biasChart.addLineSeries({
    color: COLORS.blue,
    lineWidth: 2,
    priceLineVisible: false,
  });

  var fibLines = [];
  var biasLines = [];

  function applyCandleColors() {
    var up = state.twColor ? COLORS.twUp : COLORS.twDown;
    var down = state.twColor ? COLORS.twDown : COLORS.twUp;
    candleSeries.applyOptions({
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    });
  }

  // 兩圖共用時間軸：任一圖縮放平移時同步另一圖
  var syncing = false;
  function syncRange(from, to) {
    from.timeScale().subscribeVisibleLogicalRangeChange(function (range) {
      if (syncing || range === null) return;
      syncing = true;
      to.timeScale().setVisibleLogicalRange(range);
      syncing = false;
    });
  }
  syncRange(mainChart, biasChart);
  syncRange(biasChart, mainChart);

  function observeResize(el, chart) {
    new ResizeObserver(function () {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    }).observe(el);
  }
  observeResize(mainEl, mainChart);
  observeResize(biasEl, biasChart);

  function clearPriceLines() {
    fibLines.forEach(function (l) { candleSeries.removePriceLine(l); });
    fibLines = [];
    biasLines.forEach(function (l) { biasSeries.removePriceLine(l); });
    biasLines = [];
  }

  function renderFib() {
    fibLines.forEach(function (l) { candleSeries.removePriceLine(l); });
    fibLines = [];
    if (!state.showFib || !state.payload || !state.payload.fib) return;
    var fib = state.payload.fib;
    Object.keys(fib.retracements).forEach(function (r) {
      fibLines.push(candleSeries.createPriceLine({
        price: fib.retracements[r],
        color: COLORS.textDim,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: "回撤 " + r,
      }));
    });
    Object.keys(fib.extensions).forEach(function (e) {
      fibLines.push(candleSeries.createPriceLine({
        price: fib.extensions[e],
        color: COLORS.accent,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.SparseDotted,
        axisLabelVisible: true,
        title: "延伸 " + e,
      }));
    });
  }

  function renderBias() {
    var p = state.payload;
    if (!p) return;
    var keys = Object.keys(p.bias);
    if (keys.length === 0) return;
    if (!state.ma || keys.indexOf(state.ma) === -1) {
      state.ma = keys.indexOf(DEFAULT_MA[state.tf]) !== -1 ? DEFAULT_MA[state.tf] : keys[0];
    }
    var entry = p.bias[state.ma];
    biasSeries.setData(entry.series.map(function (d) {
      return { time: d.t, value: d.v };
    }));

    biasLines.forEach(function (l) { biasSeries.removePriceLine(l); });
    biasLines = [];
    biasLines.push(biasSeries.createPriceLine({
      price: 0, color: COLORS.textDim, lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: false, title: "",
    }));
    var q = entry.quantiles;
    [["p95", COLORS.twUp], ["p05", COLORS.twDown]].forEach(function (pair) {
      if (q[pair[0]] === undefined) return;
      biasLines.push(biasSeries.createPriceLine({
        price: q[pair[0]], color: pair[1], lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dotted,
        axisLabelVisible: true, title: pair[0],
      }));
    });

    var maTabs = document.getElementById("ma-tabs");
    maTabs.innerHTML = "";
    keys.forEach(function (k) {
      var btn = document.createElement("button");
      btn.className = "tab" + (k === state.ma ? " active" : "");
      btn.textContent = k + "MA";
      btn.addEventListener("click", function () {
        state.ma = k;
        renderBias();
        updateInfoBar();
      });
      maTabs.appendChild(btn);
    });
  }

  function updateInfoBar() {
    var p = state.payload;
    if (!p || p.ohlc.length === 0) return;
    var last = p.ohlc[p.ohlc.length - 1];
    var prev = p.ohlc.length > 1 ? p.ohlc[p.ohlc.length - 2] : last;
    var chg = last.c - prev.c;
    var pct = prev.c !== 0 ? (chg / prev.c) * 100 : 0;
    var cls = chg >= 0 ? (state.twColor ? "up" : "down") : (state.twColor ? "down" : "up");
    document.getElementById("main-title").textContent =
      INDEX_LABELS[p.index] + "（" + p.symbol + "）" + TF_LABELS[p.timeframe];
    document.getElementById("quote-info").innerHTML =
      last.t + " 收盤 <span class='" + cls + "'>" + last.c.toLocaleString() +
      "（" + (chg >= 0 ? "+" : "") + chg.toFixed(2) + " / " +
      (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%）</span>" +
      (last.provisional ? "〔本期未完成〕" : "");

    var entry = p.bias[state.ma];
    if (entry && entry.series.length > 0) {
      var lb = entry.series[entry.series.length - 1];
      document.getElementById("bias-info").textContent =
        state.ma + "MA 乖離 " + lb.v + "%（極端帶 " +
        entry.quantiles.p05 + "% ~ " + entry.quantiles.p95 + "%）";
    }
    var d = new Date(p.updated);
    document.getElementById("meta-info").textContent =
      "資料更新：" + d.toLocaleString("zh-TW", { hour12: false });
  }

  function render() {
    var p = state.payload;
    if (!p) return;
    candleSeries.setData(p.ohlc.map(function (d) {
      return { time: d.t, open: d.o, high: d.h, low: d.l, close: d.c };
    }));
    zigzagSeries.setData(p.zigzag.map(function (d) {
      return { time: d.t, value: d.p };
    }));
    renderMarkers();
    runValidation();
    renderFib();
    renderBias();
    updateInfoBar();
    mainChart.timeScale().fitContent();
  }

  // ===== 波浪標記（半自動：轉折點吸附 + 人工標籤 + 鐵律檢核）=====

  var WAVE_LABELS = ["1", "2", "3", "4", "5", "A", "B", "C"];

  function timeToStr(t) {
    if (typeof t === "string") return t;
    return t.year + "-" + String(t.month).padStart(2, "0") + "-" +
      String(t.day).padStart(2, "0");
  }

  function nearestPivot(tStr) {
    if (!state.payload) return null;
    var target = new Date(tStr).getTime();
    var best = null;
    var bestDiff = Infinity;
    state.payload.zigzag.forEach(function (p) {
      var diff = Math.abs(new Date(p.t).getTime() - target);
      if (diff < bestDiff) { bestDiff = diff; best = p; }
    });
    return best;
  }

  function renderMarkers() {
    var p = state.payload;
    if (!p) return;
    var kinds = {};
    p.zigzag.forEach(function (d) { kinds[d.t] = d.k; });
    var markers = [];
    p.zigzag.forEach(function (d) {
      if (!d.provisional) return;
      markers.push({
        time: d.t,
        position: d.k === "H" ? "aboveBar" : "belowBar",
        color: COLORS.accent,
        shape: "circle",
        text: "進行中",
      });
    });
    state.labels.forEach(function (l) {
      var k = kinds[l.t] || l.k || "H";
      markers.push({
        time: l.t,
        position: k === "H" ? "aboveBar" : "belowBar",
        color: WAVE_LABELS.indexOf(l.label) >= 5 ? "#CE93D8" : "#FFFFFF",
        shape: k === "H" ? "arrowDown" : "arrowUp",
        text: String(l.label),
      });
    });
    markers.sort(function (a, b) {
      return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
    });
    candleSeries.setMarkers(markers);
  }

  // 與 src/elliott_validator.py 相同邏輯，前端即時回饋、後端儲存時複核
  function validateLabels(pivots, labels) {
    var IMP = ["1", "2", "3", "4", "5"];
    var byT = {};
    labels.forEach(function (l) { byT[l.t] = String(l.label); });
    var violations = [];

    function checkGroup(pts, startT) {
      var up;
      if ("0" in pts && "1" in pts) up = pts["1"] > pts["0"];
      else if ("1" in pts && "2" in pts) up = pts["1"] > pts["2"];
      else return;
      var sign = up ? 1 : -1;
      if ("0" in pts && "2" in pts && sign * (pts["2"] - pts["0"]) <= 0) {
        violations.push("[" + startT + "] 鐵律 1 違規：浪 2 回撤超過浪 1 起點");
      }
      if ("1" in pts && "4" in pts && sign * (pts["4"] - pts["1"]) <= 0) {
        violations.push("[" + startT + "] 鐵律 3 違規：浪 4 進入浪 1 價格區間");
      }
      if (["0", "1", "2", "3", "4", "5"].every(function (k) { return k in pts; })) {
        var l1 = sign * (pts["1"] - pts["0"]);
        var l3 = sign * (pts["3"] - pts["2"]);
        var l5 = sign * (pts["5"] - pts["4"]);
        if (l3 < l1 && l3 < l5) {
          violations.push("[" + startT + "] 鐵律 2 違規：浪 3 為最短推動浪");
        }
      }
    }

    var group = null;
    var groupStart = "";
    var expect = 1;
    pivots.forEach(function (p, i) {
      var lab = byT[p.t];
      if (!lab || IMP.indexOf(lab) === -1) return;
      if (lab === "1") {
        if (group) checkGroup(group, groupStart);
        group = { "1": p.p };
        groupStart = p.t;
        if (i > 0) group["0"] = pivots[i - 1].p;
        expect = 1;
      } else if (group) {
        var expected = expect < 5 ? IMP[expect] : null;
        if (lab !== expected) {
          violations.push("[" + p.t + "] 標記順序錯誤：預期浪 " +
            (expected || "（已完成 1-5）") + "，實際標記浪 " + lab);
          group = null;
          return;
        }
        group[lab] = p.p;
        expect++;
      } else {
        violations.push("[" + p.t + "] 標記順序錯誤：浪 " + lab + " 之前缺少浪 1");
      }
    });
    if (group) checkGroup(group, groupStart);
    return violations;
  }

  function runValidation() {
    var el = document.getElementById("label-status");
    if (!state.payload || state.labels.length === 0) {
      el.textContent = "";
      el.title = "";
      return [];
    }
    var v = validateLabels(state.payload.zigzag, state.labels);
    if (v.length > 0) {
      el.className = "label-status warn";
      el.textContent = "⚠ 鐵律違規 " + v.length + " 項（滑鼠停留看明細）";
      el.title = v.join("\n");
    } else {
      el.className = "label-status ok";
      el.textContent = "✓ 標記 " + state.labels.length + " 筆，鐵律檢核通過";
      el.title = "";
    }
    return v;
  }

  function setLabel(pivot, label) {
    state.labels = state.labels.filter(function (l) { return l.t !== pivot.t; });
    if (label) {
      state.labels.push({ t: pivot.t, p: pivot.p, k: pivot.k, label: label });
      state.labels.sort(function (a, b) { return a.t < b.t ? -1 : 1; });
    }
    renderMarkers();
    runValidation();
  }

  function openLabelMenu(x, y, pivot) {
    var menu = document.getElementById("label-menu");
    menu.innerHTML = "";
    var title = document.createElement("div");
    title.className = "menu-title";
    title.textContent = pivot.t + "（" + (pivot.k === "H" ? "高點" : "低點") +
      " " + pivot.p.toLocaleString() + "）";
    menu.appendChild(title);
    WAVE_LABELS.concat(["✕"]).forEach(function (lab) {
      var btn = document.createElement("button");
      btn.textContent = lab;
      btn.title = lab === "✕" ? "清除標記" : "標記浪 " + lab;
      btn.addEventListener("click", function () {
        setLabel(pivot, lab === "✕" ? null : lab);
        menu.hidden = true;
      });
      menu.appendChild(btn);
    });
    menu.hidden = false;
    var maxX = mainEl.clientWidth - menu.offsetWidth - 8;
    var maxY = mainEl.clientHeight - menu.offsetHeight - 8;
    menu.style.left = Math.max(0, Math.min(x, maxX)) + "px";
    menu.style.top = Math.max(0, Math.min(y, maxY)) + "px";
  }

  mainChart.subscribeClick(function (param) {
    if (!state.editMode || !param.point || !param.time) return;
    var pivot = nearestPivot(timeToStr(param.time));
    if (pivot) openLabelMenu(param.point.x, param.point.y, pivot);
  });

  document.addEventListener("mousedown", function (ev) {
    var menu = document.getElementById("label-menu");
    if (!menu.hidden && !menu.contains(ev.target)) menu.hidden = true;
  });

  function saveLabels() {
    var el = document.getElementById("label-status");
    fetch("api/labels/" + state.index + "/" + state.tf, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels: state.labels }),
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (res) {
      if (res.violations && res.violations.length > 0) {
        el.className = "label-status warn";
        el.textContent = "已儲存，但鐵律違規 " + res.violations.length + " 項（滑鼠停留看明細）";
        el.title = res.violations.join("\n");
      } else {
        el.className = "label-status ok";
        el.textContent = "✓ 已儲存 " + state.labels.length + " 筆標記";
      }
    }).catch(function () {
      el.className = "label-status warn";
      el.textContent = "唯讀模式：請在本機執行 python -m src.server 後再儲存標記";
    });
  }

  function load() {
    var url = "data/" + state.index + "-" + state.tf + ".json";
    var labelUrl = "data/labels/" + state.index + "-" + state.tf + ".json";
    Promise.all([
      fetch(url).then(function (res) {
        if (!res.ok) throw new Error(url + " HTTP " + res.status);
        return res.json();
      }),
      fetch(labelUrl).then(function (res) {
        return res.ok ? res.json() : { labels: [] };
      }).catch(function () { return { labels: [] }; }),
    ]).then(function (results) {
      state.payload = results[0];
      state.labels = results[1].labels || [];
      clearPriceLines();
      render();
    }).catch(function (err) {
      document.getElementById("quote-info").textContent = "資料載入失敗：" + err.message;
    });
  }

  function bindTabs(containerId, attr, onChange) {
    var container = document.getElementById(containerId);
    container.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".tab");
      if (!btn) return;
      container.querySelectorAll(".tab").forEach(function (t) {
        t.classList.remove("active");
      });
      btn.classList.add("active");
      onChange(btn.dataset[attr]);
    });
  }

  bindTabs("index-tabs", "index", function (v) {
    state.index = v;
    load();
  });
  bindTabs("tf-tabs", "tf", function (v) {
    state.tf = v;
    state.ma = null;
    load();
  });

  document.getElementById("toggle-edit").addEventListener("click", function () {
    state.editMode = !state.editMode;
    this.classList.toggle("active", state.editMode);
    document.getElementById("label-menu").hidden = true;
  });

  document.getElementById("save-labels").addEventListener("click", saveLabels);

  document.getElementById("toggle-fib").addEventListener("click", function () {
    state.showFib = !state.showFib;
    this.classList.toggle("active", state.showFib);
    renderFib();
  });

  document.getElementById("toggle-color").addEventListener("click", function () {
    state.twColor = !state.twColor;
    this.textContent = state.twColor ? "紅漲綠跌" : "綠漲紅跌";
    applyCandleColors();
    updateInfoBar();
  });

  applyCandleColors();
  load();
})();
