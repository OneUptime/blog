from pathlib import Path

root = Path("ydb-size-16g-lab/data/pdisks")
files = sorted(path for path in root.glob("*") if path.is_file())
if not files:
    raise SystemExit("No PDisk files found; inspect initialization and mounts.")
for path in files:
    print(path.relative_to(root), path.stat().st_size)
