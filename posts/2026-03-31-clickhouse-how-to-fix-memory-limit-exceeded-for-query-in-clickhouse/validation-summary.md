# Validation Summary: How to Fix 'Memory limit exceeded for query' in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL (system tables, settings)
- ClickHouse configuration (users.xml profiles)

## Sources Consulted
- [ClickHouse system.query_log docs](https://clickhouse.com/docs/en/operations/system-tables/query_log)
- [ClickHouse system.processes docs](https://clickhouse.com/docs/en/operations/system-tables/processes)
- [ClickHouse query complexity settings](https://clickhouse.com/docs/en/operations/settings/query-complexity)
- [ClickHouse joins - Partial Merge Join](https://clickhouse.com/blog/clickhouse-fully-supports-joins-full-sort-partial-merge-part3)
- [ClickHouse Sampling query profiler](https://clickhouse.com/docs/operations/optimizing-performance/sampling-query-profiler)

## Issues Found
- The `system.query_log` query referenced a `peak_memory_usage` column that does not exist in that table. Only `system.processes` has `peak_memory_usage`; `system.query_log` has only `memory_usage` (which already represents peak memory consumption over the query's lifetime). Removed the `peak_memory_usage` column reference and changed `ORDER BY peak_memory_usage DESC` to `ORDER BY memory_usage DESC` in the historical memory usage query.

## Review Notes
- `SET group_by_use_nulls = 0;` before external aggregation is effectively a no-op (0 is the default) and is unrelated to external aggregation, but it is syntactically valid and not technically wrong, so it was left intact.
- The `partial_merge` join algorithm is correctly documented as a lower-memory alternative to hash join.
- `max_memory_usage`, `max_memory_usage_for_user`, `max_bytes_before_external_group_by`, `max_bytes_in_join`, `memory_profiler_step`, and `memory_profiler_sample_probability` are all valid, current settings.
- The `system.processes` columns `memory_usage`, `peak_memory_usage`, `elapsed`, `query_id`, `user`, and `query` are all present.
