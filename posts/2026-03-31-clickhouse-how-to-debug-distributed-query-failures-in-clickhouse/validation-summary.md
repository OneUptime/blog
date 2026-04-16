# Validation Summary: How to Debug Distributed Query Failures in ClickHouse

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- ClickHouse (distributed tables, cluster, system tables)
- `clusterAllReplicas` / `remote` table functions
- `system.query_log`, `system.clusters`, `system.processes`, `system.tables`
- OpenTelemetry tracing in ClickHouse
- `clickhouse-client` CLI
- ClickHouse distributed insert queue (`broken/` directory)

## Sources Consulted
- [Tracing ClickHouse with OpenTelemetry | ClickHouse Docs](https://clickhouse.com/docs/operations/opentelemetry)
- [HTTP interface | ClickHouse Docs](https://clickhouse.com/docs/interfaces/http)
- [ClickHouse PR #39170 — Add setting opentelemetry_trace_processors](https://github.com/ClickHouse/ClickHouse/pull/39170)
- ClickHouse docs for `system.query_log`, `system.clusters`, `clusterAllReplicas`, Distributed table engine, and settings (`opentelemetry_start_trace_probability`, `distributed_connections_pool_size`, `receive_timeout`).

## Issues Found
- **Step 1**: The snippet began with `SET send_progress_in_http_headers = 1;` under a comment claiming it "enables detailed error messages." This setting controls the `X-ClickHouse-Progress` HTTP response headers for query progress — it has nothing to do with error verbosity. The misleading line and its comment were removed; the remaining `system.query_log` query already accomplishes the step's goal.

## Review Notes
- `system.query_log` columns (`query`, `exception`, `stack_trace`, `type`, `event_time`) and type enums (`ExceptionWhileProcessing`, `ExceptionBeforeStart`) are correct.
- `system.clusters` columns used (`cluster`, `shard_num`, `replica_num`, `host_name`, `host_address`, `port`, `errors_count`, `estimated_recovery_time`) are correct.
- `clusterAllReplicas('cluster', db, table)` signature is correct, and its use against `system.query_log` and `system.processes` is valid.
- `opentelemetry_start_trace_probability` and `opentelemetry_trace_processors` are both real ClickHouse settings (the latter was added in PR #39170).
- In Step 5, filtering the query_log with `type != 'QueryStart'` is valid but a bit loose — `type IN ('QueryFinish','ExceptionWhileProcessing','ExceptionBeforeStart')` would be a touch more precise. Not incorrect, so left unchanged.
- Step 9's recovery trick (moving files out of `broken/` back into the parent distributed directory) is a real, widely used approach; the reader should still investigate the root cause before replaying, as corrupt payloads will re-break.
- Date literal `'2024-01-01'` in Step 10 is only an illustrative example and fine as-is.
