# Validation Summary: How to Debug Materialized View Processing in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse
- ClickHouse materialized views
- ClickHouse system tables (`system.tables`, `system.query_log`, `system.detached_tables`)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse `system.tables` docs: https://clickhouse.com/docs/operations/system-tables/tables
- ClickHouse `system.detached_tables` docs: https://clickhouse.com/docs/operations/system-tables/detached_tables
- ClickHouse `system.query_log` docs: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse `DESCRIBE TABLE` docs: https://clickhouse.com/docs/sql-reference/statements/describe-table
- ClickHouse `ATTACH` docs: https://clickhouse.com/docs/sql-reference/statements/attach
- ClickHouse `CREATE MATERIALIZED VIEW` docs: https://clickhouse.com/docs/sql-reference/statements/create/view

## Issues Found

1. **Non-existent column `is_temporarily_detached` in `system.tables`.** The original "Check View is Attached" section queried `is_temporarily_detached` from `system.tables`, but this column does not exist. Additionally, detached tables do not appear in `system.tables` at all, so the approach itself was incorrect. Replaced the query with one against `system.detached_tables` (which exposes `database`, `table`, `engine`, `is_permanently`, etc.) and added a brief note explaining why.

2. **Non-canonical `ATTACH MATERIALIZED VIEW` syntax.** The documented form for reattaching a detached table (including materialized views, which are tables internally) is `ATTACH TABLE [db.]name`. Replaced `ATTACH MATERIALIZED VIEW your_view_name;` with `ATTACH TABLE your_view_name;` to match the canonical documented syntax.

## Review Notes

- All other SQL is technically correct: `system.query_log.type = 'ExceptionWhileProcessing'` is a valid enum value; `stack_trace` and `written_rows` are valid columns; `DESCRIBE (SELECT ...)` on a subquery is supported; `as_select`, `dependencies_table`, and `engine` are all valid columns in `system.tables`; `currentDatabase()` and `toStartOfHour()` are correct function names; `INTERVAL 1 HOUR` / `INTERVAL 10 MINUTE` syntax is valid.
- `system.detached_tables` was introduced in ClickHouse 24.x. On older versions, users may need to rely on detecting the absence of an expected MV from `system.tables` instead — out of scope for this post, but worth noting for readers on legacy deployments.
- The `query LIKE '%materialized%'` filter in the exceptions query is a heuristic and will miss many materialized view failures (since the executed INSERT SELECT from an MV does not necessarily contain the word "materialized"). It is reasonable as a first-pass filter but not exhaustive — could be improved in a future revision.
