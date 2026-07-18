import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import exporter, fetcher


def main() -> None:
    counts = fetcher.update_all(full=True)
    for name, n in counts.items():
        print(f"{name}: {n} rows")
    files = exporter.export_all()
    print(f"exported {len(files)} files")


if __name__ == "__main__":
    main()
