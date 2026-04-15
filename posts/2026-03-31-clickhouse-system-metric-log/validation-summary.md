# Validation Summary: How to Use system.metric_log in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system.metric_log table)
- ClickHouse server configuration (config.xml)
- SQL (ClickHouse dialect)
- Grafana (ClickHouse data source plugin)
- Mermaid diagrams

## Sources Consulted
- ClickHouse official documentation: system.metric_log — https://clickhouse.com/docs/en/operations/system-tables/metric_log
- ClickHouse official documentation: system.metrics — https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse official documentation: system.events — https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse official documentation: server configuration parameters — https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse source code (MetricLog.cpp) for column naming conventions
- Grafana ClickHouse data source plugin documentation for macro syntax ($__timeInterval, $__timeFilter)

## Issues Found
1. **Incorrect data source reference (line 31)**: The post stated that `system.metric_log` columns come from `system.metrics` and `system.asynchronous_metrics`. This is incorrect — the columns come from `system.metrics` and `system.events`. Asynchronous metrics are stored in a separate table (`system.asynchronous_metric_log`). Changed "system.asynchronous_metrics" to "system.events".

2. **Non-existent column name (line 42)**: The post referenced `ProfileEvent_MergedRows` as a column for "Rows merged since server start." No event named `MergedRows` exists in `system.events`. Replaced with `ProfileEvent_InsertedRows` ("Rows inserted since server start"), which is a verified event in ClickHouse.

## Review Notes
- All SQL queries are syntactically correct and use valid ClickHouse functions (toStartOfMinute, toStartOfHour, formatReadableSize, avg, max).
- The config.xml snippet uses valid keys: database, table, flush_interval_milliseconds, collect_interval_milliseconds, and ttl.
- The Grafana macros ($__timeInterval and $__timeFilter) use correct syntax for the ClickHouse Grafana data source plugin.
- All other column names (CurrentMetric_Query, CurrentMetric_Merge, CurrentMetric_MemoryTracking, CurrentMetric_OpenFileForRead, CurrentMetric_OpenFileForWrite, CurrentMetric_ReplicatedChecks, CurrentMetric_QueryThread, ProfileEvent_Query) were verified as correct.
