# Validation Summary: How to Use AsyncIO with ClickHouse in Python

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Python asyncio
- ClickHouse (native TCP protocol on port 9000)
- `asynch` Python library (v0.3.x) — async ClickHouse driver
- `clickhouse-connect` (mentioned as alternative)
- `asyncio.gather`, `asyncio.Queue`, `asyncio.Semaphore`

## Sources Consulted
- asynch GitHub repository: https://github.com/long2ice/asynch
- asynch source code inspected: `asynch/__init__.py`, `asynch/connection.py`, `asynch/cursors.py`, `asynch/pool.py`, `asynch/proto/connection.py`
- asynch PyPI package: https://pypi.org/project/asynch/
- asynch README (covers v0.3.0 breaking changes)
- Python asyncio docs: https://docs.python.org/3/library/asyncio.html

## Issues Found

1. **`asynch.connect(...)` no longer exists (v0.3.0 breaking change).** The top-level `connect` function was removed; the library now exposes only `Connection`, `Cursor`, `DictCursor`, `Pool`. Fixed by replacing `asynch.connect(...)` with `from asynch import Connection` and `Connection(...)` as an async context manager in the basic query, insert worker, and semaphore examples.

2. **Concurrent queries on a single shared connection are broken.** The original "Running Multiple Queries Concurrently" example used one `asynch.connect(...)` wrapped around an `asyncio.gather(...)` of three cursor queries. asynch uses a single TCP socket per `Connection` guarded by `is_query_executing`, and `Cursor._check_query_executing` raises `ProgrammingError`/`PartiallyConsumedQueryError` when a second query starts before the first finishes fetching. This pattern fails at runtime. Fixed by switching the example to use `asynch.Pool` with `pool.connection()` to acquire a separate connection per task, and added a one-line explanation of why a pool is required.

3. **Insert worker section titled "Connection Pooling" but used a single worker.** Fixed by spawning `num_workers` workers and updating the producer to send one sentinel `None` per worker so all workers exit cleanly — this is now a true worker pool.

4. **Missing `from asynch import Connection` import in the semaphore example.** Fixed by adding the import.

## Review Notes
- `asynch.create_pool()` (from the pre-v0.3.0 API) was also removed; the corrected code uses the `Pool` class directly as an async context manager with `minsize`/`maxsize`, which is the current recommended API.
- The INSERT syntax `cursor.execute("INSERT INTO t (...) VALUES", batch)` with a list of tuples is correct and matches asynch's documented bulk insert pattern.
- The post mentions `clickhouse-connect` as an alternative with async support — this is accurate; `clickhouse_connect.get_async_client()` provides an async client (HTTP-based).
- The `default` port `9000` and default user `default`/empty password match ClickHouse's out-of-box configuration.
- The post is version-sensitive: the code now targets asynch v0.3.x+. Older asynch versions (pre-0.3.0) had the `asynch.connect` helper; readers pinning to old versions should be aware.
