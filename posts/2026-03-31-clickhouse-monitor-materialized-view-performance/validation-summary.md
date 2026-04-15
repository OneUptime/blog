# Validation Summary: How to Monitor Materialized View Performance in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables: `system.query_log`, `system.tables`, `system.events`)
- SQL (ClickHouse SQL dialect)
- Prometheus (metrics endpoint)
- Grafana (dashboarding)

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse system.tables documentation: https://clickhouse.com/docs/en/operations/system-tables/tables
- ClickHouse system.events documentation: https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse system.metrics documentation: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse Prometheus integration source (PrometheusMetricsWriter.cpp)

## Issues Found
1. **`peak_memory_usage` column does not exist in `system.query_log`** — The "Monitor Memory Usage During View Processing" query referenced `peak_memory_usage`, which is not a valid column. The correct column is `memory_usage`. Fixed by replacing `peak_memory_usage` with `memory_usage` and updating the alias accordingly.

2. **Fabricated Prometheus metric names** — The post listed `ClickHouseMetrics_NumberOfMaterializedViews` and `ClickHouseProfileEvents_MaterializedViewsMicroseconds` as available Prometheus metrics. Neither of these metrics exists in ClickHouse. There are no built-in Prometheus metrics specifically for materialized view count or processing time. Fixed by replacing the section with a query against `system.events` for insert-related metrics and recommending custom Grafana dashboards based on `system.query_log` data.

3. **Hardcoded literal in INSERT latency query** — The "Monitor Insert Latency" query used `query LIKE 'INSERT INTO source_table%'`, which matches the literal string "source_table" rather than filtering for INSERT queries generally. This was inconsistent with the `tables[1] AS source_table` alias used in the SELECT/GROUP BY. Fixed by replacing the LIKE filter with `query_kind = 'Insert'`, which is the proper way to filter for INSERT queries in `system.query_log`.

## Review Notes
- The `system.tables` query using `total_rows` and `total_bytes` is correct but these values are estimates for MergeTree tables, not exact counts. The post could mention this caveat.
- The "Detect Processing Lag" query uses user-specific table names (`raw_events`, `events_hourly`) which is expected for an example, but readers need to adapt to their schema.
- The `EXPLAIN` example is valid (supported since ClickHouse v20.6+). For deeper analysis, `EXPLAIN PIPELINE` or `EXPLAIN PLAN` could also be mentioned.
- The claim that "slow view processing can block inserts" is accurate for synchronous materialized views, which is the default behavior in ClickHouse.
