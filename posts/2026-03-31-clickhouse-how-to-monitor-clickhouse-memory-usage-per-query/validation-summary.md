# Validation Summary: How to Monitor ClickHouse Memory Usage Per Query

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, system tables, settings)
- ClickHouse `system.processes`, `system.query_log`, `system.asynchronous_metrics`
- ClickHouse query settings: `max_memory_usage`, `max_memory_usage_for_user`, `max_bytes_before_external_group_by`, `max_bytes_before_external_sort`
- ClickHouse user profile XML configuration
- ClickHouse Prometheus metrics endpoint
- Prometheus alerting rules (YAML)

## Sources Consulted
- ClickHouse `system.processes` docs: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse `system.query_log` docs: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse query complexity / memory settings: https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse `KILL QUERY` syntax: https://clickhouse.com/docs/en/sql-reference/statements/kill
- ClickHouse source `src/Core/Settings.cpp` (obsolete setting verification)
- ClickHouse source `src/Server/PrometheusMetricsWriter.cpp` (Prometheus metric prefix verification)

## Issues Found
1. **`system.query_log.peak_memory_usage` does not exist.** The post referenced a `peak_memory_usage` column in `system.query_log` in three sections (Historical Peak Memory, Aggregated Memory Report Per User, Identifying Memory-Heavy Query Patterns). In `system.query_log`, only `memory_usage` exists as a top-level column, and it already records the peak memory consumption of the query (the separate `peak_memory_usage` column only exists in `system.processes`). Fix: replaced all `peak_memory_usage` references in `system.query_log` queries with `memory_usage`, and added a short clarifying note after the first such query.

2. **`max_memory_usage_for_all_queries` is obsolete.** The XML user-profile example used `max_memory_usage_for_all_queries`, which is marked `MAKE_OBSOLETE` in `src/Core/Settings.cpp`. The current setting is `max_memory_usage_for_user`. Fix: renamed the XML tag accordingly.

## Review Notes
- `system.processes` columns (`query_id`, `user`, `elapsed`, `memory_usage`, `peak_memory_usage`, `query`) are all correct.
- Settings `max_memory_usage`, `max_bytes_before_external_group_by`, and `max_bytes_before_external_sort` are correctly spelled.
- The Prometheus metric name `ClickHouseMetrics_MemoryTracking` is correct: ClickHouse exposes `CurrentMetric` values (like `MemoryTracking` from `system.metrics`) under the `ClickHouseMetrics_` prefix on its built-in `/metrics` endpoint.
- `KILL QUERY WHERE query_id = '...'` syntax is valid per official docs.
- `system.query_log.tables` has type `Array(LowCardinality(String))`; the post only uses `arrayStringConcat(tables, ', ')`, which works for this type, so no change required.
- For users who want true peak memory from `query_log` (different from the `memory_usage` top-level column in some versions), it is also available via `ProfileEvents['MemoryTrackerPeakUsage']` — this could be a useful future addition.
