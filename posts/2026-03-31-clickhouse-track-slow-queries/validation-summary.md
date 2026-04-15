# Validation Summary: How to Track Slow Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse (system tables: query_log, query_thread_log, trace_log, processes)
- ClickHouse SQL dialect (EXPLAIN, EXPLAIN PIPELINE, KILL QUERY, normalizeQuery, quantile, formatReadableSize)
- ClickHouse server configuration (config.xml, query_log engine settings, TTL)
- ClickHouse access control (ALTER USER, CREATE SETTINGS PROFILE)
- ClickHouse query profiling (query_profiler_real_time_period_ns, query_profiler_cpu_time_period_ns, addressToSymbol, demangle)

## Sources Consulted
- ClickHouse official documentation on system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse official documentation on system.query_thread_log: https://clickhouse.com/docs/en/operations/system-tables/query_thread_log
- ClickHouse official documentation on system.trace_log: https://clickhouse.com/docs/en/operations/system-tables/trace_log
- ClickHouse official documentation on system.processes: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse official documentation on EXPLAIN statement: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse official documentation on settings (log_queries, query profiler): https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse official documentation on settings profiles: https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile

## Issues Found

### Issue 1: Invalid `path` column in trace_log query
- **What was wrong:** The query against `system.trace_log` selected a `path` column and used it in `GROUP BY path, stack_trace`. The `system.trace_log` table does not have a `path` column. Its relevant columns are `trace_type`, `thread_id`, `query_id`, and `trace` (the stack trace array).
- **What was changed:** Removed `path` from the SELECT list and changed `GROUP BY path, stack_trace` to `GROUP BY trace` (grouping by the raw trace array, which is the correct way to aggregate unique stack traces).
- **Why:** The original query would fail with a "column not found" error. Grouping by `trace` correctly deduplicates identical stack traces and the `count()` reflects how many samples hit each unique call path.

### Issue 2: Alias shadowing in query_thread_log query
- **What was wrong:** The query against `system.query_thread_log` used `formatReadableSize(read_bytes) AS read_bytes`, creating an alias that shadows the original numeric `read_bytes` column. The `ORDER BY read_bytes DESC` would then sort by the human-readable string (e.g., "1.00 GiB", "500.00 MiB") alphabetically rather than by the actual byte count numerically.
- **What was changed:** Renamed the alias from `read_bytes` to `read_bytes_readable` so the `ORDER BY read_bytes DESC` correctly references the original numeric column.
- **Why:** Alphabetical sorting of formatted sizes produces incorrect ordering (e.g., "9.00 KiB" > "10.00 GiB" alphabetically). The numeric column must be used for correct descending sort.

## Review Notes
- The `<log_queries>` and `<log_queries_min_query_duration_ms>` elements placed directly under `<clickhouse>` in `config.xml` are user-level settings that are more conventionally placed in `users.xml` under `<profiles>`. They may be silently ignored depending on the ClickHouse version. However, the post also demonstrates the correct approaches via `SET` and `ALTER USER`, so users have working alternatives.
- All other SQL queries, system table column references, ClickHouse functions (normalizeQuery, formatReadableSize, quantile, countIf, demangle, addressToSymbol), EXPLAIN variants, KILL QUERY syntax, and CREATE SETTINGS PROFILE syntax are correct.
- The query_log configuration XML (MergeTree engine, TTL, partition scheme, flush interval) is accurate.
