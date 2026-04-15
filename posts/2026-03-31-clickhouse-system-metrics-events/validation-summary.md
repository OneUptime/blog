# Validation Summary: How to Use system.metrics and system.events in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system.metrics, system.events, system.asynchronous_metrics tables)
- ClickHouse SQL dialect
- ClickHouse built-in Prometheus endpoint
- Prometheus scrape configuration
- Bash scripting with clickhouse-client CLI

## Sources Consulted
- ClickHouse official documentation on system.metrics: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse official documentation on system.events: https://clickhouse.com/docs/operations/system-tables/events
- ClickHouse official documentation on system.asynchronous_metrics: https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics
- ClickHouse Prometheus integration documentation: https://clickhouse.com/docs/interfaces/prometheus
- ClickHouse server settings documentation (asynchronous_metrics_update_period_s): https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse blog on Prometheus monitoring: https://clickhouse.com/blog/clickhouse-cloud-now-supports-prometheus-monitoring
- Grafana ClickHouse integration documentation: https://grafana.com/docs/grafana-cloud/monitor-infrastructure/integrations/integration-reference/integration-clickhouse/

## Issues Found
1. **Incorrect Prometheus metric prefixes in grep command and example output**: The blog used `ClickHouseMetric_` and `ClickHouseEvent_` as Prometheus metric prefixes. The correct prefixes are `ClickHouseMetrics_` (with trailing 's') for system.metrics and `ClickHouseProfileEvents_` for system.events. Fixed the grep pattern from `"^ClickHouse(Metric|Event)_Query"` to `"^ClickHouse(Metrics|ProfileEvents)_Query"` and updated all four lines of example output accordingly.

## Review Notes
- All SQL queries are syntactically correct and use valid ClickHouse functions (`formatReadableSize`, `nullIf`, `round`, `toInt64`).
- The table schemas for system.metrics (metric String, value Int64, description String) and system.events (event String, value UInt64, description String) are accurate.
- All metric and event names referenced in the queries are valid ClickHouse identifiers.
- The bash script for computing query rates uses integer arithmetic, which is fine for an approximation but will truncate fractional QPS values. This is acceptable for a demonstration script.
- The Prometheus XML configuration block and scrape config are correct for ClickHouse's built-in Prometheus endpoint on port 9363.
- The claim that asynchronous_metrics refreshes every minute by default is correct (default `asynchronous_metrics_update_period_s` is 60).
- The Common Pitfalls section is accurate and provides useful operational guidance.
