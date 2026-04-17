# Validation Summary: How to Configure Connection Pooling for ClickHouse Clients

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse (server-side `config.xml` / `users.xml` connection limits)
- Python: `clickhouse-connect` (HTTP interface via urllib3 pool)
- Python: `clickhouse-driver` (native TCP protocol) with `queue.Queue` pooling
- Node.js: `@clickhouse/client` with Node's `http.Agent` keep-alive
- Go: `github.com/ClickHouse/clickhouse-go/v2` via `database/sql`
- `system.processes` and `system.metrics` monitoring

## Sources Consulted
- ClickHouse Python client advanced usage docs — https://clickhouse.com/docs/integrations/language-clients/python/advanced-usage
- `clickhouse-connect` source (`httpclient.py`, `httputil.py`) — https://github.com/ClickHouse/clickhouse-connect/blob/main/clickhouse_connect/driver/httpclient.py and https://github.com/ClickHouse/clickhouse-connect/blob/main/clickhouse_connect/driver/httputil.py
- `@clickhouse/client` JS docs — https://clickhouse.com/docs/en/integrations/language-clients/javascript
- `clickhouse-go` v2 package docs — https://pkg.go.dev/github.com/ClickHouse/clickhouse-go/v2
- ClickHouse `system.metrics` docs and `CurrentMetrics.cpp` — https://clickhouse.com/docs/operations/system-tables/metrics
- Node.js `http.Agent` docs (`keepAlive`, `maxSockets`, `maxFreeSockets`)

## Issues Found

1. **Python `clickhouse-connect` used a non-existent `http_options` kwarg.**
   The original example passed `http_options={'pool_maxsize': 20, 'pool_block': False, 'max_retries': 3}` to `clickhouse_connect.get_client()`. Inspection of `HttpClient.__init__` in the clickhouse-connect source confirms this parameter does not exist. The documented way to customize pool size is to build a `PoolManager` via `clickhouse_connect.driver.httputil.get_pool_manager(maxsize=..., num_pools=..., block=...)` and pass it as the `pool_mgr` kwarg. Retries are configured via the top-level `query_retries` kwarg. Fixed the example to use `pool_mgr` and `query_retries`.

2. **Node.js `http_agent` was passed as a plain options object.**
   The `@clickhouse/client` docs require `http_agent` to be an actual `http.Agent` (or `https.Agent`) instance — not an object of agent options. Changed the example to construct `new http.Agent({...})` and pass the instance to `http_agent`.

3. **"Peak connections metric" comment was misleading.**
   `system.metrics.TCPConnection` is a current (instantaneous) gauge, not a peak value. Rewrote the monitoring query to query both `TCPConnection` and `HTTPConnection` and updated the comment to "Current connection count (native and HTTP)".

## Review Notes
- The `@clickhouse/client` `http_agent` option is flagged as experimental in upstream docs. A simpler, non-experimental alternative is to set `max_open_connections` and `keep_alive: { enabled: true }` at the client level; the post keeps the `http_agent` approach because it showcases `maxFreeSockets`, which is only available on the underlying agent.
- The `clickhouse-driver` native-protocol `Client` object is not thread-safe across concurrent queries on the same instance, which is exactly why the `queue.Queue` wrapper (one client per pool slot) is the right pattern.
- The Go DSN `clickhouse://…?dial_timeout=5s&max_execution_time=60` is valid for `clickhouse-go/v2`; `dial_timeout` accepts Go duration strings, and `max_execution_time` is forwarded as a server setting.
- `max_concurrent_queries_for_user` is a valid per-user profile setting in `users.xml`.
- `system.processes` fields (`user`, `client_hostname`, `client_name`, `elapsed`, `query`) are all correct.
