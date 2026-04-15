# Validation Summary: How to Monitor and Manage Active Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system tables, query management, user settings)
- SQL (ClickHouse SQL dialect)

## Sources Consulted
- ClickHouse official documentation: system.processes table (https://clickhouse.com/docs/en/operations/system-tables/processes)
- ClickHouse official documentation: system.query_log table (https://clickhouse.com/docs/en/operations/system-tables/query_log)
- ClickHouse official documentation: KILL QUERY statement (https://clickhouse.com/docs/en/sql-reference/statements/kill)
- ClickHouse official documentation: max_execution_time setting (https://clickhouse.com/docs/en/operations/settings/query-complexity#max-execution-time)
- ClickHouse official documentation: ALTER USER statement (https://clickhouse.com/docs/en/sql-reference/statements/alter/user)
- ClickHouse official documentation: formatReadableSize function (https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize)

## Issues Found
No technical issues found.

## Review Notes
- The statement that `KILL QUERY` "terminates the query immediately" is a slight simplification. In practice, ClickHouse sets a cancellation flag and the query stops at the next cancellation checkpoint, which may not be truly instantaneous. The accompanying caution about using `KILL QUERY` carefully is appropriate and the simplification is acceptable for the target audience.
- All column names referenced in `system.processes` and `system.query_log` are accurate.
- The progress percentage calculation correctly guards against division by zero with the `WHERE total_rows_approx > 0` filter.
- The `type = 'QueryFinish'` filter value for `system.query_log` is correct (other valid values include `QueryStart`, `ExceptionBeforeStart`, `ExceptionWhileProcessing`).
