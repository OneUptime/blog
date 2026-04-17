# Validation Summary: ClickHouse Client Libraries Feature Comparison

## Status
validated

## Post Type
Reference / Comparison guide

## Technologies Covered
- ClickHouse (HTTP interface on port 8123, native TCP interface on port 9000)
- Python: `clickhouse-connect`, `asynch`
- Go: `clickhouse-go` (v2)
- Node.js: `@clickhouse/client`
- Java: `clickhouse-java` (JDBC driver)
- Rust: `clickhouse-rs`

## Sources Consulted
- ClickHouse Python client docs: https://clickhouse.com/docs/integrations/language-clients/python/intro
- ClickHouse Go client: https://github.com/ClickHouse/clickhouse-go and https://clickhouse.com/docs/integrations/go
- ClickHouse JavaScript client: https://clickhouse.com/docs/integrations/javascript
- ClickHouse Java / JDBC driver: https://clickhouse.com/docs/integrations/language-clients/java/jdbc
- ClickHouse HTTP interface docs (port 8123): https://clickhouse.com/docs/interfaces/http
- ClickHouse native TCP interface docs (port 9000): https://clickhouse.com/docs/interfaces/tcp
- `asynch` project: https://github.com/long2ice/asynch
- `clickhouse-rs` project: https://github.com/suharev7/clickhouse-rs

## Issues Found
- **Node.js `@clickhouse/client` config parameter**: The snippet used `host: 'http://localhost:8123'`, which reflects an older configuration key. The current `@clickhouse/client` (1.x) documents the parameter as `url`. Updated the example to use `url:` instead of `host:` to match the current official docs.

## Review Notes
- The Python `clickhouse-connect` example is correct: `get_client()` accepts `host`/`port`/`username`/`password`/`database`, and `query()` returns an object exposing `result_rows`; `insert(table, data, column_names=[...])` matches the documented signature.
- The Go `clickhouse-go` v2 example is correct: `clickhouse.Open(&clickhouse.Options{Addr, Auth, MaxOpenConns, MaxIdleConns})` and `conn.Query(ctx, ...)` are current. Worth noting that v2 supports both native TCP (default) and HTTP via the `Protocol` option, which matches the post's comparison table entry "Native + HTTP".
- The Java JDBC example is correct. Both `jdbc:ch://` and `jdbc:clickhouse://` URL prefixes are supported by the official driver; the example uses `jdbc:ch://localhost:8123/...` which goes over HTTP, consistent with the port.
- Minor caveat on the Java row: the legacy `clickhouse-java` / JDBC driver supports both native and HTTP transports, but the newer `client-v2` is currently HTTP-only. The post references the JDBC driver specifically, so "Native + HTTP" is acceptable.
- The port assignments (HTTP 8123 / native TCP 9000) are correct ClickHouse defaults.
- `asynch` (native TCP, async) and `clickhouse-rs` (native TCP) classifications are correct.
- `clickhouse-connect` is accurately marked as non-async; its public API is synchronous.
