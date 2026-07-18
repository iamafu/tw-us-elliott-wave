import pandas as pd


def compute(df: pd.DataFrame, threshold: float) -> list[dict]:
    """百分比門檻 ZigZag：以 high/low 追蹤極值，反向變動達門檻即確認轉折。

    回傳 [{"t", "p", "k"("H"/"L"), "provisional"?}, ...]，
    最後一筆為尚未確認的進行中極值，標記 provisional 供前端區別顯示。
    """
    n = len(df)
    if n == 0:
        return []
    highs = df["high"].to_numpy()
    lows = df["low"].to_numpy()
    dates = df.index

    pivots: list[dict] = []
    direction = 0
    max_i, min_i = 0, 0
    max_p, min_p = float(highs[0]), float(lows[0])

    def add(i: int, price: float, kind: str, provisional: bool = False) -> None:
        p = {"t": dates[i].strftime("%Y-%m-%d"), "p": round(price, 2), "k": kind}
        if provisional:
            p["provisional"] = True
        pivots.append(p)

    for i in range(1, n):
        h, l = float(highs[i]), float(lows[i])
        if direction == 0:
            if h > max_p:
                max_p, max_i = h, i
            if l < min_p:
                min_p, min_i = l, i
            # 高低點分離且振幅過門檻後，較早的極值成為首個轉折點
            if max_i != min_i and max_p >= min_p * (1 + threshold):
                if min_i < max_i:
                    add(min_i, min_p, "L")
                    direction = 1
                else:
                    add(max_i, max_p, "H")
                    direction = -1
        elif direction == 1:
            if h > max_p:
                max_p, max_i = h, i
            elif l <= max_p * (1 - threshold):
                add(max_i, max_p, "H")
                direction = -1
                min_p, min_i = l, i
        else:
            if l < min_p:
                min_p, min_i = l, i
            elif h >= min_p * (1 + threshold):
                add(min_i, min_p, "L")
                direction = 1
                max_p, max_i = h, i

    if direction == 1:
        add(max_i, max_p, "H", provisional=True)
    elif direction == -1:
        add(min_i, min_p, "L", provisional=True)
    return pivots
