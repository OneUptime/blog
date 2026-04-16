# Validation Summary: How to Handle Runaway Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- ClickHouse (SQL engine, system tables, settings, profiles)
- ClickHouse server XML configuration
- ClickHouse access control (ALTER USER ... SETTINGS)
- OneUptime (referenced as the alerting destination)

## Sources Consulted
- ClickHouse `system.processes` docs: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse `KILL QUERY` statement: https://clickhouse.com/docs/en/sql-reference/statements/kill
- ClickHouse query complexity / restrictions on query execution: https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse `ALTER USER` reference: https://clickhouse.com/docs/en/sql-reference/statements/alter/user
- ClickHouse `system.query_log` docs: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found
- **`peak_memory_usage` column does not exist in `system.query_log`.** The documented column for peak memory usage by a query is `memory_usage`. Changed `peak_memory_usage / 1e9 AS peak_gb` to `memory_usage / 1e9 AS peak_gb` in the post-incident analysis query so it actually executes against `system.query_log`.

## Review Notes
- `system.processes` columns (`query_id`, `user`, `elapsed`, `read_rows`, `read_bytes`, `memory_usage`, `query`) are all valid.
- `KILL QUERY WHERE …` syntax filtering on `query_id` and `user` is correct.
- Profile XML keys (`max_execution_time`, `max_memory_usage`, `timeout_before_checking_execution_speed`, `min_execution_speed`) are valid in `<profiles><default>`.
- `ALTER USER analyst SETTINGS variable = value, …` (bare `SETTINGS`, no `MODIFY`) matches the documented grammar in the ClickHouse `ALTER USER` reference and is accepted by the parser.
- `max_rows_to_read` and `max_bytes_to_read` are valid session settings.
- `'ExceptionWhileProcessing'` is a valid value for the `type` column in `system.query_log` (alongside `QueryStart`, `QueryFinish`, `ExceptionBeforeStart`).
- Caveat on `min_execution_speed`: it does not literally kill stuck queries with zero progress — it throws after `timeout_before_checking_execution_speed` seconds if the observed rate is below the threshold. The post's wording ("queries that are stuck making no progress") is a fair summary for the operational audience, but readers tuning the value should consult the docs for exact semantics.
