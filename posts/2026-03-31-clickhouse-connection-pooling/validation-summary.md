# Validation Summary: How to Use Connection Pooling with ClickHouse Clients

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- clickhouse-connect (Python HTTP client)
- urllib3 (PoolManager)
- clickhouse-sqlalchemy / SQLAlchemy
- Python threading and asyncio

## Sources Consulted
- ClickHouse Python client advanced usage docs: https://clickhouse.com/docs/integrations/language-clients/python/advanced-usage
- clickhouse-connect GitHub (source: `clickhouse_connect/common.py`, `clickhouse_connect/driver/__init__.py`, `clickhouse_connect/driver/httpclient.py`)
- clickhouse-connect CHANGELOG (https://github.com/ClickHouse/clickhouse-connect/blob/main/CHANGELOG.md) — confirming `max_connection_age` is a common setting introduced in 0.5.23
- SQLAlchemy engine pool documentation: https://docs.sqlalchemy.org/en/20/core/pooling.html
- ClickHouse system tables documentation for `system.processes`

## Issues Found
- **Incorrect `get_client()` parameters in the first example.** The original post passed `max_connection_age=600` and `pool_mgr_connections=10` as keyword arguments to `clickhouse_connect.get_client()`. Neither is a valid `get_client()` parameter:
  - `max_connection_age` is a **common setting** (defined in `clickhouse_connect/common.py`) and must be applied via `clickhouse_connect.common.set_setting("max_connection_age", ...)`, not as a `get_client` kwarg.
  - `pool_mgr_connections` does not exist in clickhouse-connect at all. The correct way to size the pool is to construct a custom pool manager (`httputil.get_pool_manager(maxsize=..., num_pools=...)`) and pass it through the `pool_mgr` argument.
  Fixed by rewriting the first example to call `common.set_setting(...)` and updating the "Custom urllib3 Pool Manager" section to use `clickhouse_connect.driver.httputil.get_pool_manager` (the officially documented helper) instead of a raw `urllib3.PoolManager`.

## Review Notes
- The SQLAlchemy example (`pool_size`, `max_overflow`, `pool_timeout`, `pool_recycle`, `pool_pre_ping`) uses stock SQLAlchemy `QueuePool` parameters and is correct.
- `asyncio.to_thread` is the correct pattern for wrapping the synchronous `clickhouse-connect` client in async code, since clickhouse-connect's main `Client` is synchronous. Note that an `AsyncClient` (`clickhouse_connect.get_async_client`) is also available and would be more idiomatic for heavy async workloads, but the example as written is not wrong.
- The threaded example relies on `clickhouse-connect`'s documented thread-safety of a shared `Client`; this is accurate. The embedded f-string SQL is fine for the demo but readers should note it is a SQL-injection anti-pattern in real code — parameters should be passed via the `parameters` argument.
- `system.processes.interface` is a valid column (UInt8 enum: TCP=1, HTTP=2, MySQL=3, PostgreSQL=4, etc.) and the monitoring query is correct.
- Default pool size of 8 keep-alive connections per server is noted in the official docs; the rewritten intro now mentions this.
