# Validation Summary: How to Build a ClickHouse Query Performance Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system tables: `system.query_log`, `system.processes`)
- Grafana (ClickHouse data source plugin)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse system.processes documentation: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse date-time functions (toStartOfMinute): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse quantile aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse aggregate function combinators (countIf): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse Enum data type (string comparison behavior): https://clickhouse.com/docs/sql-reference/data-types/enum
- ClickHouse formatReadableSize function: https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse substring function: https://clickhouse.com/docs/en/sql-reference/functions/string-functions

## Issues Found
- **Memory Usage by User query: incorrect ORDER BY on formatted string** — The query used `ORDER BY peak_memory DESC` where `peak_memory` is the alias for `formatReadableSize(max(memory_usage))`, which returns a human-readable string (e.g., "183.92 MiB", "9.00 KiB"). Sorting by this string produces alphabetical ordering, not numeric ordering, leading to incorrect results. Fixed by adding a `peak_memory_bytes` column (`max(memory_usage)`) and ordering by that numeric value instead.

## Review Notes
- All column names in `system.query_log` (`event_time`, `query_duration_ms`, `type`, `memory_usage`, `read_rows`, `query_id`, `user`, `query`, `event_date`) and `system.processes` (`query_id`, `user`, `elapsed`, `memory_usage`, `read_rows`, `query`) are verified correct.
- The `type` column in `system.query_log` is an `Enum8`, but ClickHouse supports string comparison with enum values (e.g., `type = 'QueryFinish'`), so the syntax used is correct and idiomatic.
- All ClickHouse functions used (`toStartOfMinute`, `quantile`, `formatReadableSize`, `countIf`, `substring`) are valid and use correct syntax.
- The `quantile()` function uses reservoir sampling and is approximate; for exact percentiles, `quantileExact()` could be used, but the approximate version is appropriate for a dashboard context.
- The Grafana connection example uses port 8123, which is the correct default HTTP interface port for ClickHouse.
