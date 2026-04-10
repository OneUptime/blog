# Validation Summary: How to Benchmark libcephsqlite Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RADOS)
- Rook
- SQLite
- libcephsqlite (Ceph SQLite VFS)
- Python 3 (sqlite3, ctypes, statistics modules)
- Bash scripting

## Sources Consulted
- Ceph libcephsqlite official documentation: https://docs.ceph.com/en/latest/rados/api/libcephsqlite/
- SQLite PRAGMA documentation: https://sqlite.org/pragma.html
- SQLite Memory-Mapped I/O documentation: https://sqlite.org/mmap.html
- SQLite Write-Ahead Logging documentation: https://sqlite.org/wal.html
- Ceph pool management documentation: https://docs.ceph.com/en/latest/rados/operations/pools/

## Issues Found

### 1. Incorrect libcephsqlite URI format (Critical)
- **What was wrong:** The URI format used throughout the post was `file:POOL/DB?vfs=ceph` (e.g., `file:benchmark-pool/bench.db?vfs=ceph`). This is incorrect and would cause the scripts to fail.
- **What was changed:** Corrected to `file:///POOL:/DB?vfs=ceph` (e.g., `file:///benchmark-pool:/bench.db?vfs=ceph`), matching the official Ceph documentation format which requires three slashes and a colon after the pool name.
- **Why:** The libcephsqlite VFS parses the URI using the format `file:///<poolname>:[namespace]/<dbname>?vfs=ceph`. The original format would not be recognized.

### 2. Misleading mmap_size PRAGMA comment
- **What was wrong:** The comment `# 256MB memory-mapped I/O` implied that setting `PRAGMA mmap_size` would enable memory-mapped I/O and improve performance.
- **What was changed:** Updated the comment to `# No effect with libcephsqlite (RADOS VFS does not support mmap)`.
- **Why:** libcephsqlite's VFS implementation does not implement xFetch/xUnfetch (the memory-mapped I/O methods), since data lives in RADOS objects, not local files. SQLite silently ignores this PRAGMA when the VFS doesn't support mmap. The original comment was misleading to readers who would expect a performance improvement.

### 3. Missing page_size PRAGMA caveat
- **What was wrong:** The `PRAGMA page_size=8192` comment only said `# Larger pages for RADOS` without noting its important limitation.
- **What was changed:** Updated the comment to `# Larger pages for RADOS (new databases only; existing databases require VACUUM)`.
- **Why:** `PRAGMA page_size` only takes effect on a new/empty database. For existing databases, a VACUUM is required after setting the page size. Without this caveat, readers applying this to existing databases would see no effect and not understand why.

## Review Notes
- The WAL vs DELETE journal mode comparison script (`benchmark_modes.sh`) reuses the same database file (`mode_test.db`) without cleanup between iterations. The DELETE-mode run creates the table and inserts 1000 rows; the WAL-mode run then inserts into a database that already has data. For a fairer comparison, the database should be recreated between iterations. This is a methodology issue rather than a code error.
- The p99 calculation `sorted(latencies)[int(len(latencies)*0.99)]` gives the maximum value when there are only 50 batches (for the INSERT benchmark). This is technically correct but may surprise readers expecting a more nuanced percentile. For production benchmarking, a larger number of samples would give more meaningful percentile statistics.
- The `ceph osd pool create benchmark-pool 32` command uses a fixed PG count of 32. In modern Ceph clusters with the PG autoscaler enabled, the explicit PG count may be overridden. This is not wrong but worth noting for readers on newer Ceph versions.
- All Python code is syntactically correct, uses standard library modules, and follows correct sqlite3 API usage patterns.
