# Validation Summary: How to Monitor ClickHouse Insert Rates and Throughput

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (system tables: `system.query_log`, `system.processes`, `system.distribution_queue`, `system.part_log`)
- Prometheus (ClickHouse built-in exporter metrics)
- Grafana (alerting rules using PromQL)

## Sources Consulted
- ClickHouse documentation on system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse documentation on system.processes: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse documentation on system.distribution_queue: https://clickhouse.com/docs/en/operations/system-tables/distribution_queue
- ClickHouse documentation on system.part_log: https://clickhouse.com/docs/en/operations/system-tables/part_log
- ClickHouse Prometheus integration: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#prometheus
- Prometheus documentation on PromQL subqueries and comments: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
1. **SQL operator precedence bug in "Detect Insert Failures" query**: The `WHERE` clause used `OR` without parentheses: `WHERE type = 'ExceptionBeforeStart' OR type = 'ExceptionWhileProcessing' AND query_kind = 'Insert' AND ...`. Because `AND` binds tighter than `OR`, this would match ALL `ExceptionBeforeStart` rows regardless of `query_kind` or time range, returning far more results than intended. Fixed by wrapping the `OR` condition in parentheses: `WHERE (type = 'ExceptionBeforeStart' OR type = 'ExceptionWhileProcessing') AND query_kind = 'Insert' AND ...`.

2. **Wrong comment syntax in PromQL examples**: The Grafana alert rules section used `--` (SQL-style comments) inside PromQL expressions. PromQL uses `#` for comments; `--` would cause a parse error in Prometheus or Grafana. Changed `--` to `#`.

## Review Notes
- The PromQL subquery syntax `avg_over_time(rate(...)[1h:5m])` is valid but requires Prometheus 2.7+. This is not an issue in practice since that version is very old, but worth noting.
- The 300 parts/min threshold mentioned for small inserts is a reasonable rule of thumb, though the actual limit depends on hardware, MergeTree settings, and table configuration.
- The Prometheus metric names follow the correct naming convention for the ClickHouse built-in Prometheus exporter (`ClickHouseProfileEvents_*`, `ClickHouseMetrics_*`).
