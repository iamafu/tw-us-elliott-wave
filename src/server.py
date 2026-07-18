import json
from datetime import datetime, timezone

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, elliott_validator

app = FastAPI(title="tw-us-elliott-wave local server")


class LabelPayload(BaseModel):
    labels: list[dict]


def _label_paths(index: str, tf: str):
    fname = f"{index}-{tf}.json"
    # 同步寫入 docs/data/labels，讓純靜態模式（GitHub Pages）也能讀到標記
    return (
        config.LABELS_DIR / fname,
        config.EXPORT_DIR / "labels" / fname,
    )


@app.get("/api/labels/{index}/{tf}")
def get_labels(index: str, tf: str) -> dict:
    if index not in config.INDICES or tf not in config.TIMEFRAMES:
        raise HTTPException(status_code=404, detail="unknown index or timeframe")
    path, _ = _label_paths(index, tf)
    if not path.exists():
        return {"index": index, "timeframe": tf, "labels": []}
    return json.loads(path.read_text(encoding="utf-8"))


@app.post("/api/labels/{index}/{tf}")
def save_labels(index: str, tf: str, payload: LabelPayload) -> dict:
    if index not in config.INDICES or tf not in config.TIMEFRAMES:
        raise HTTPException(status_code=404, detail="unknown index or timeframe")
    export_file = config.EXPORT_DIR / f"{index}-{tf}.json"
    pivots: list[dict] = []
    if export_file.exists():
        pivots = json.loads(export_file.read_text(encoding="utf-8"))["zigzag"]
    violations = elliott_validator.validate(pivots, payload.labels)
    doc = {
        "index": index,
        "timeframe": tf,
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "labels": payload.labels,
    }
    text = json.dumps(doc, ensure_ascii=False, indent=1)
    for p in _label_paths(index, tf):
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
    return {"saved": True, "violations": violations}


app.mount(
    "/",
    StaticFiles(directory=str(config.PROJECT_ROOT / "docs"), html=True),
    name="static",
)


def main() -> None:
    uvicorn.run(app, host="127.0.0.1", port=8765)


if __name__ == "__main__":
    main()
