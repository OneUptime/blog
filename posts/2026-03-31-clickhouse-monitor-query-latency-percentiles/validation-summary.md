# Validation Summary: How to Monitor ClickHouse Query Latency Percentiles

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system.query_log table, aggregate functions, date/time functions)
- Prometheus (recording rules, histogram_quantile)
- SQL

## Sources Consulted
- ClickHouse official documentation for system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse quantile function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse normalizeQuery function documentation: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#normalizequery
- ClickHouse formatReadableSize documentation: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize
- ClickHouse date/time functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
No technical issues found.

## Review Notes
- All SQL queries use correct ClickHouse syntax and reference valid `system.query_log` column names (`query_start_time`, `query_duration_ms`, `type`, `query_kind`, `tables`, `memory_usage`).
- The parametric aggregate function syntax `quantile(level)(column)` is correctly used throughout.
- The Prometheus recording rule references a metric name `clickhouse_query_duration_bucket` which is not a built-in ClickHouse metric but would come from a third-party exporter. The surrounding text appropriately notes that ClickHouse doesn't export query duration histograms natively and suggests building a custom scraper, making this acceptable.
- ClickHouse 1-based array indexing is correctly used with `tables[1]`.
- The `normalizeQuery()` function is correctly recommended for grouping similar queries by replacing literal values with placeholders.
