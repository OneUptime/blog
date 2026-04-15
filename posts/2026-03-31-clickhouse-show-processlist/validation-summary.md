# Validation Summary: How to Use SHOW PROCESSLIST in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL database)
- `SHOW PROCESSLIST` statement
- `system.processes` system table
- ClickHouse SQL functions (`formatReadableSize`, `round`, `left`, `if`, `count`, `sum`, `max`)
- `clickhouse-client` CLI
- `KILL QUERY` statement
- Linux `watch` command

## Sources Consulted
- ClickHouse official documentation: SHOW PROCESSLIST (https://clickhouse.com/docs/en/sql-reference/statements/show#show-processlist)
- ClickHouse official documentation: system.processes table (https://clickhouse.com/docs/en/operations/system-tables/processes)
- ClickHouse official documentation: formatReadableSize function (https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize)
- ClickHouse official documentation: String functions - left() (https://clickhouse.com/docs/en/sql-reference/functions/string-functions#left)
- ClickHouse official documentation: KILL QUERY (https://clickhouse.com/docs/en/sql-reference/statements/kill)

## Issues Found
No technical issues found.

## Review Notes
- All column names referenced (`query_id`, `user`, `elapsed`, `memory_usage`, `read_bytes`, `read_rows`, `peak_memory_usage`, `total_rows_approx`) are real columns in `system.processes`.
- All ClickHouse functions used (`formatReadableSize`, `round`, `left`, `if`, `count`, `sum`, `max`) are valid and correctly invoked.
- The sample output uses pipe-separated formatting rather than ClickHouse's default `PrettyCompact` format, but this is clearly labeled as abbreviated and is a reasonable simplification for readability.
- The `watch` + `clickhouse-client` shell pattern is a practical and correct approach for monitoring a specific query over time.
- The post correctly notes that `SHOW PROCESSLIST` is equivalent to querying `system.processes` but with less flexibility for filtering and aggregation.
