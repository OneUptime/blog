# Validation Summary: How to Build a ClickHouse Connection Pool in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface on port 8123, native TCP protocol on port 9000)
- Python 3 (`queue.Queue`, `threading`, `concurrent.futures`)
- `clickhouse-connect` (official HTTP client, uses `urllib3`)
- `clickhouse-driver` (native TCP client)

## Sources Consulted
- ClickHouse Connect Python docs: https://clickhouse.com/docs/integrations/python
- `clickhouse-connect` source — `create_client` signature: https://github.com/ClickHouse/clickhouse-connect/blob/main/clickhouse_connect/driver/__init__.py
- `clickhouse-connect` source — `get_pool_manager` / `get_pool_manager_options`: https://github.com/ClickHouse/clickhouse-connect/blob/main/clickhouse_connect/driver/httputil.py
- `clickhouse-driver` docs for `Client` constructor parameters (`host`, `port`, `user`, `password`, `connect_timeout`, `send_receive_timeout`): https://clickhouse-driver.readthedocs.io/
- Python stdlib docs for `queue.Queue` (blocking `get(timeout=...)` / `put`)

## Issues Found
- **Invalid `clickhouse_connect.get_client()` kwargs.** The original example passed `pool_size=10, max_overflow=5`. Neither parameter is accepted by `clickhouse_connect.get_client()` — they look like SQLAlchemy pool options. The clickhouse-connect API expects a pre-built `urllib3` `PoolManager` passed via the `pool_mgr` kwarg (the helper `clickhouse_connect.driver.httputil.get_pool_manager` builds one and accepts `maxsize` / `num_pools`). In practice, the `pool_size`/`max_overflow` kwargs would either be silently captured as ClickHouse settings or cause an error rather than configuring the HTTP pool. Fixed the snippet to import `httputil`, build a `pool_mgr` with `maxsize=16, num_pools=12`, and pass it via `pool_mgr=pool_mgr`.

## Review Notes
- The `clickhouse-driver` `Client` uses the kwarg `user` (not `username`), which the post correctly uses for the native-protocol pool — worth noting because it differs from `clickhouse-connect`, which uses `username`.
- `clickhouse-driver`'s `Client` is not thread-safe per the project's README, so the pool pattern (one connection per in-flight query) in the post is the right approach.
- The `_acquire_healthy` method returns a freshly created connection directly on failure rather than retrying in a loop; callers still get a healthy connection but the pool's effective size can drift down by 1 per replacement because the dead connection is dropped on the floor. This is a minor design point, not a bug — left as-is to respect the author's scope.
- Default `urllib3` `maxsize` in `get_pool_manager_options` is 8; the snippet's `maxsize=16` is a reasonable uplift for "hundreds of concurrent requests."
- Port assignments (8123 HTTP, 9000 native TCP) are accurate.
