# How to Benchmark libcephsqlite Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, SQLite, libcephsqlite, Benchmark, Performance, RADOS

Description: Measure and optimize libcephsqlite performance using benchmark scripts to understand throughput, latency, and the impact of WAL mode and Ceph network settings.

---

libcephsqlite stores SQLite databases in RADOS, which adds network round-trips compared to local disk SQLite. Benchmarking helps you understand the actual performance characteristics for your workload and identify configuration changes that improve throughput.

## Benchmark Script

```python
#!/usr/bin/env python3
# benchmark_cephsqlite.py

import sqlite3
import ctypes
import time
import statistics

ctypes.CDLL("/usr/lib/x86_64-linux-gnu/libcephsqlite.so")

POOL = "benchmark-pool"
DB_OBJ = "bench.db"
URI = f"file:///{POOL}:/{DB_OBJ}?vfs=ceph"

def setup(conn):
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=20000")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bench (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()

def benchmark_inserts(conn, count=1000, batch_size=100):
    latencies = []
    for batch_start in range(0, count, batch_size):
        t0 = time.perf_counter()
        with conn:
            conn.executemany(
                "INSERT INTO bench (key, value) VALUES (?, ?)",
                [(f"key-{batch_start + i}", f"value-{batch_start + i}" * 10)
                 for i in range(batch_size)]
            )
        latencies.append(time.perf_counter() - t0)

    total = sum(latencies)
    print(f"INSERT: {count} rows in {total:.3f}s "
          f"({count/total:.0f} rows/sec, "
          f"p50={statistics.median(latencies)*1000:.1f}ms, "
          f"p99={sorted(latencies)[int(len(latencies)*0.99)]*1000:.1f}ms)")

def benchmark_selects(conn, count=1000):
    row_count = conn.execute("SELECT COUNT(*) FROM bench").fetchone()[0]
    latencies = []
    for i in range(count):
        t0 = time.perf_counter()
        conn.execute(
            "SELECT * FROM bench WHERE id = ?",
            (i % row_count + 1,)
        ).fetchone()
        latencies.append(time.perf_counter() - t0)

    total = sum(latencies)
    print(f"SELECT: {count} point reads in {total:.3f}s "
          f"({count/total:.0f} reads/sec, "
          f"p50={statistics.median(latencies)*1000:.1f}ms, "
          f"p99={sorted(latencies)[int(len(latencies)*0.99)]*1000:.1f}ms)")

def benchmark_scan(conn):
    t0 = time.perf_counter()
    rows = conn.execute("SELECT COUNT(*), AVG(length(value)) FROM bench").fetchone()
    elapsed = time.perf_counter() - t0
    print(f"SCAN: {rows[0]} rows in {elapsed:.3f}s ({rows[0]/elapsed:.0f} rows/sec)")

if __name__ == "__main__":
    print(f"Connecting to {URI}")
    conn = sqlite3.connect(URI, uri=True, timeout=60)
    setup(conn)

    print("\n--- Benchmark Results ---")
    benchmark_inserts(conn, count=5000, batch_size=100)
    benchmark_selects(conn, count=1000)
    benchmark_scan(conn)

    conn.close()
```

## Running the Benchmark

```bash
# Create the benchmark pool first
ceph osd pool create benchmark-pool 32
ceph osd pool application enable benchmark-pool cephsqlite

# Run the benchmark
python3 benchmark_cephsqlite.py
```

## Comparing WAL vs Journal Mode

```bash
# benchmark_modes.sh
for mode in DELETE WAL; do
  python3 - <<PYEOF
import sqlite3, ctypes, time
ctypes.CDLL("/usr/lib/x86_64-linux-gnu/libcephsqlite.so")
conn = sqlite3.connect("file:///benchmark-pool:/mode_test.db?vfs=ceph", uri=True)
conn.execute(f"PRAGMA journal_mode=${mode}")
conn.execute("CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, v TEXT)")
t0 = time.perf_counter()
for i in range(0, 1000, 50):
    with conn:
        conn.executemany("INSERT INTO t (v) VALUES (?)", [("x"*100,)]*50)
elapsed = time.perf_counter() - t0
print(f"${mode}: 1000 inserts in {elapsed:.3f}s")
conn.close()
PYEOF
done
```

## Expected Performance Characteristics

Typical results on a local Ceph cluster with 10GbE networking:

| Operation | Rows/sec | p50 latency | Notes |
|-----------|----------|-------------|-------|
| Batch INSERT (100/tx) | 2000-8000 | 5-20ms | WAL mode |
| Point SELECT | 500-2000 | 0.5-2ms | With cache |
| Table SCAN | 50k-200k | varies | RADOS read sequential |

## Key Tuning Parameters

```python
# Tune these PRAGMA settings for better performance
conn.execute("PRAGMA cache_size=50000")          # 50k page cache (~200MB)
conn.execute("PRAGMA temp_store=MEMORY")          # Keep temp tables in RAM
conn.execute("PRAGMA mmap_size=268435456")        # No effect with libcephsqlite (RADOS VFS does not support mmap)
conn.execute("PRAGMA page_size=8192")             # Larger pages for RADOS (new databases only; existing databases require VACUUM)
conn.execute("PRAGMA wal_autocheckpoint=2000")    # Less frequent checkpoints
```

## Summary

libcephsqlite performance is strongly influenced by batch size, WAL mode, and cache settings. Batch inserts in transactions of 50-200 rows achieve the best throughput by amortizing RADOS lock round-trips. WAL mode typically doubles write throughput compared to default journal mode. Cache size directly impacts read performance - allocate as much as your application can afford. Benchmark with your actual workload patterns to find the right configuration before deploying to production.
