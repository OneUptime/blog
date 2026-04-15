# Validation Summary: How to Use system.events for Cumulative Counters in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, SQL dialect)
- system.events table
- system.metrics table (comparison)
- system.asynchronous_metrics (mentioned)
- Prometheus (integration)
- Grafana (mentioned for dashboards)

## Sources Consulted
- ClickHouse official documentation: system.events table — https://clickhouse.com/docs/operations/system-tables/events
- ClickHouse official documentation: system tables overview — https://clickhouse.com/docs/operations/system-tables
- ClickHouse Prometheus integration docs — https://clickhouse.com/docs/integrations/prometheus
- ClickHouse source: ProfileEvents.cpp — https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp

## Issues Found
No technical issues found.

## Review Notes
- All 12 event names referenced (Query, SelectQuery, InsertQuery, FailedQuery, QueryTimeMicroseconds, DiskReadElapsedMicroseconds, DiskWriteElapsedMicroseconds, NetworkReceiveBytes, NetworkSendBytes, MergedRows, MarkCacheHits, MarkCacheMisses) are valid ClickHouse profile events defined in ProfileEvents.cpp.
- The system.events table columns (event, value, description) are correctly described. There is also a `name` column which is an alias for `event`, but omitting it is fine for a focused tutorial.
- The distinction between system.events (cumulative counters/odometer) and system.metrics (instantaneous gauges/speedometer) is accurate and well-explained.
- All SQL syntax is valid ClickHouse SQL: sumIf() aggregate function, CREATE TABLE with ENGINE = Memory, JOIN syntax, and round() function all work as shown.
- The Prometheus integration section is accurate. ClickHouse exposes system.events via a built-in Prometheus-compatible endpoint (configurable in server config) with the `ClickHouseProfileEvents_` prefix. The post could mention that this is a built-in endpoint rather than a separate exporter, but the current wording is not incorrect.
- The rate computation approach (snapshot into a Memory table, wait, then JOIN) is a valid manual technique for ad-hoc rate calculation.
