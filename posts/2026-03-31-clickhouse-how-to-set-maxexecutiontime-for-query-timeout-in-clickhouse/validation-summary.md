# Validation Summary: How to Set max_execution_time for Query Timeout in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- ClickHouse `users.xml` profile configuration
- ClickHouse system tables (`system.processes`, `system.query_log`)

## Sources Consulted
- ClickHouse `max_execution_time` docs: https://clickhouse.com/docs/operations/settings/settings#max_execution_time
- ClickHouse `timeout_overflow_mode` and query complexity: https://clickhouse.com/docs/operations/settings/query-complexity
- ClickHouse `system.processes`: https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse `system.query_log`: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse `KILL QUERY`: https://clickhouse.com/docs/sql-reference/statements/kill
- ClickHouse settings profiles: https://clickhouse.com/docs/operations/settings/settings-profiles

## Issues Found
- **SQL operator precedence bug in historical slow-queries query.** The original `WHERE` clause was:
  ```sql
  WHERE type = 'ExceptionBeforeStart' OR type = 'ExceptionWhileProcessing'
    AND exception LIKE '%Timeout%'
  ```
  Because `AND` binds tighter than `OR` in standard SQL, this was being parsed as `type = 'ExceptionBeforeStart' OR (type = 'ExceptionWhileProcessing' AND exception LIKE '%Timeout%')`, returning ALL `ExceptionBeforeStart` rows regardless of whether they were timeout-related. Fixed by wrapping the `OR` in parentheses so the `LIKE '%Timeout%'` filter applies to both exception types.

## Review Notes
- The section heading "max_execution_time vs. max_execution_speed" is slightly misleading because the body does not actually discuss `max_execution_speed`; it discusses `max_rows_to_read` and `max_bytes_to_read`. Not a technical error, but an inconsistency a future edit could tighten.
- All other technical claims verified against official docs: default value of 0, error code 159 (TIMEOUT_EXCEEDED), `timeout_overflow_mode` values (`throw`/`break`), system table column names and `type` enum values, `KILL QUERY ... SYNC` syntax, and `users.xml` nested profile structure.
