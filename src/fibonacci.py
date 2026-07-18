RETRACEMENT_RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786]
EXTENSION_RATIOS = [1.272, 1.618, 2.618]


def swing_levels(p_from: float, p_to: float) -> dict:
    diff = p_to - p_from
    return {
        "retracements": {
            str(r): round(p_to - diff * r, 2) for r in RETRACEMENT_RATIOS
        },
        "extensions": {
            str(e): round(p_from + diff * e, 2) for e in EXTENSION_RATIOS
        },
    }


def latest_swing_levels(pivots: list[dict]) -> dict | None:
    if len(pivots) < 2:
        return None
    a, b = pivots[-2], pivots[-1]
    levels = swing_levels(a["p"], b["p"])
    return {"from": a, "to": b, **levels}
