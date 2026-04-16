# Validation Summary: How to Audit User Activity in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system.query_log, system.session_log, config.xml system log settings)
- SQL (ClickHouse dialect — `left()`, `countIf()`, `formatReadableSize()`, `INTERVAL` arithmetic, `toDate()`)
- Bash / clickhouse-client
- AWS CLI (`aws s3 cp`)

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse system.session_log documentation: https://clickhouse.com/docs/en/operations/system-tables/session_log
- ClickHouse server configuration parameters: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse `formatReadableSize` function docs: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize
- ClickHouse parser `IAST::getQueryKind()` values (Select, Insert, Create, Alter, Drop, Rename, Truncate, Optimize, Grant, Revoke, System, Set, Use, Show, Describe, Explain, Backup, Restore)

## Issues Found
No technical issues found.

- All referenced `system.query_log` columns exist (`event_time`, `query_id`, `type`, `query_duration_ms`, `read_rows`, `query`, `user`, `query_kind`, `exception_code`, `exception`, `client_hostname`, `client_name`, `result_rows`, `result_bytes`, `read_bytes`).
- All `type` values used (`QueryFinish`, `ExceptionWhileProcessing`, `ExceptionBeforeStart`) are valid enum values.
- `query_kind` values (`Create`, `Drop`, `Alter`, `Rename`, `Truncate`) are all valid — `Rename` is a distinct query kind in the ClickHouse parser, not an alias of `Alter`.
- The `<query_log>` and `<session_log>` XML configuration examples are valid, including `<ttl>` as a direct sub-element.
- `system.session_log` columns used (`event_time`, `user`, `client_hostname`, `client_port`, `interface`, `type`) all exist.
- `formatReadableSize()`, `countIf()`, `left()`, and `INTERVAL` arithmetic are all valid ClickHouse SQL.

## Review Notes
- `session_log` is not enabled by default in modern ClickHouse versions — the post correctly instructs readers to enable it via the `<session_log>` config block.
- The post uses `exception LIKE '%Authentication%'` as a heuristic for failed auth in `query_log`. A more reliable source is `system.session_log` where `type = 'LoginFailure'`, but the `query_log` approach is a valid complementary signal.
- The TTL example (`event_date + INTERVAL 90 DAY`) as a direct `<ttl>` sub-element works when no custom `<engine>` string is specified. If a user provides a custom engine, TTL should be embedded in the engine definition instead — not relevant to the examples shown, but worth noting for readers who customize further.
