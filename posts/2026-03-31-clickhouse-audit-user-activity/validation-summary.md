# Validation Summary: How to Audit ClickHouse User Activity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse system tables (`system.query_log`, `system.session_log`, `system.query_views_log`, `system.part_log`, `system.text_log`)
- ClickHouse server XML configuration (`<query_log>`, `<session_log>`, TTL config, per-user `<log_queries>`)
- ClickHouse SQL: `CREATE SETTINGS PROFILE`, `CREATE TABLE` with `MergeTree`, `PARTITION BY`, `TTL`
- ClickHouse functions: `arrayJoin`, `notEmpty`, `formatReadableSize`, `toHour`, `toYYYYMM`, `today()`, `yesterday()`, `now()`, `left()`

## Sources Consulted
- ClickHouse official docs — system tables: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse docs — `system.session_log`: https://clickhouse.com/docs/en/operations/system-tables/session_log
- ClickHouse docs — `system.part_log`: https://clickhouse.com/docs/en/operations/system-tables/part_log
- ClickHouse docs — server settings (`query_log`, `session_log` config): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse docs — `CREATE SETTINGS PROFILE`: https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse docs — TTL expression syntax for tables

## Issues Found
- **SQL operator precedence bug** in the "Auditing Failed Queries and Access Errors" example. The original `WHERE type = 'ExceptionBeforeStart' OR type = 'ExceptionWhileProcessing' AND event_time >= now() - INTERVAL 24 HOUR` parses (per SQL precedence: `AND` binds tighter than `OR`) as `type = 'ExceptionBeforeStart' OR (type = 'ExceptionWhileProcessing' AND event_time >= ...)`, which returns *all* `ExceptionBeforeStart` rows regardless of time. Replaced with `WHERE type IN ('ExceptionBeforeStart', 'ExceptionWhileProcessing') AND event_time >= ...` to apply the time filter to both branches.

## Review Notes
- All system tables and column names referenced (`event_time`, `user`, `client_hostname`, `query_kind`, `databases`, `tables`, `read_rows`, `read_bytes`, `result_rows`, `memory_usage`, `exception_code`, `exception`, `query_duration_ms`, `auth_type`, `interface`, `client_port`, etc.) are valid in current ClickHouse versions.
- `system.session_log.type` enum values include `LoginFailure`, `LoginSuccess`, `Logout` — the `LoginFailure` filter is correct.
- `system.part_log.event_type` values `NewPart`, `MutatePart`, `RemovePart` are valid; `MergeParts` is also a valid value but not included — the section header mentions "merges" so authors may want to add `'MergeParts'` to the `IN` list in a future revision (left as-is to preserve scope).
- The `<ttl>` element in the system log XML config is a documented child element, and the `event_date + INTERVAL 30 DAY DELETE` TTL expression is valid (DELETE is the default action and may be omitted).
- `databases` is technically `Array(LowCardinality(String))` rather than plain `Array(String)`, but for the `CREATE TABLE audit.query_audit` example, declaring it as `Array(String)` is fully compatible — the `INSERT … SELECT` will implicitly convert.
- `query_kind` values (`Select`, `Create`, `Alter`, `Drop`, `Rename`, `Truncate`, etc.) are not formally enumerated in the docs but are observable in practice and produced by ClickHouse interpreters. Safe to use.
