IMPULSE_SEQUENCE = ["1", "2", "3", "4", "5"]


def _check_group(points: dict[str, float], start_t: str) -> list[str]:
    violations: list[str] = []
    if "0" in points and "1" in points:
        up = points["1"] > points["0"]
    elif "1" in points and "2" in points:
        up = points["1"] > points["2"]
    else:
        return violations
    sign = 1 if up else -1

    if "0" in points and "2" in points:
        if sign * (points["2"] - points["0"]) <= 0:
            violations.append(
                f"[{start_t}] 鐵律 1 違規：浪 2 回撤超過浪 1 起點"
                f"（浪 2 = {points['2']}，起點 = {points['0']}）"
            )
    if "1" in points and "4" in points:
        if sign * (points["4"] - points["1"]) <= 0:
            violations.append(
                f"[{start_t}] 鐵律 3 違規：浪 4 進入浪 1 價格區間"
                f"（浪 4 = {points['4']}，浪 1 終點 = {points['1']}）"
            )
    if all(k in points for k in ["0", "1", "2", "3", "4", "5"]):
        l1 = sign * (points["1"] - points["0"])
        l3 = sign * (points["3"] - points["2"])
        l5 = sign * (points["5"] - points["4"])
        if l3 < l1 and l3 < l5:
            violations.append(
                f"[{start_t}] 鐵律 2 違規：浪 3 為最短推動浪"
                f"（浪1 = {round(l1, 2)}，浪3 = {round(l3, 2)}，浪5 = {round(l5, 2)}）"
            )
    return violations


def validate(pivots: list[dict], labels: list[dict]) -> list[str]:
    """以三大鐵律檢核人工波浪標記；標記掛在 ZigZag 轉折點日期上。

    浪 N 的標記代表「浪 N 的終點」；浪 1 的起點取標記 1 前一個轉折點。
    """
    violations: list[str] = []
    label_by_t = {item["t"]: str(item["label"]) for item in labels}
    seq = [dict(p, label=label_by_t.get(p["t"])) for p in pivots]

    group: dict[str, float] | None = None
    group_start = ""
    expect_idx = 0
    for i, p in enumerate(seq):
        lab = p["label"]
        if lab is None or lab not in IMPULSE_SEQUENCE:
            continue
        if lab == "1":
            if group:
                violations.extend(_check_group(group, group_start))
            group = {"1": p["p"]}
            group_start = p["t"]
            if i > 0:
                group["0"] = seq[i - 1]["p"]
            expect_idx = 1
        elif group is not None:
            expected = IMPULSE_SEQUENCE[expect_idx] if expect_idx < 5 else None
            if lab != expected:
                violations.append(
                    f"[{p['t']}] 標記順序錯誤：預期浪 {expected or '（已完成 1-5）'}，實際標記浪 {lab}"
                )
                group = None
                continue
            group[lab] = p["p"]
            expect_idx += 1
        else:
            violations.append(f"[{p['t']}] 標記順序錯誤：浪 {lab} 之前缺少浪 1 起始標記")
    if group:
        violations.extend(_check_group(group, group_start))
    return violations
