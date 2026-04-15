# Validation Summary: How to Use system.metrics for Real-Time Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables: system.metrics, system.events, system.asynchronous_metrics)
- ClickHouse SQL (formatReadableSize, LIKE, IN, now())
- ClickHouse Prometheus exporter
- Prometheus / Grafana (mentioned for integration)

## Sources Consulted
- [system.metrics | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/metrics) — verified column schema (metric, value, description), gauge semantics, and listed metric names
- [system.events | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/events) — confirmed cumulative counter behavior and reset-on-restart semantics
- [system.asynchronous_metrics | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics) — confirmed periodic background refresh behavior
- [Prometheus-compatible metrics endpoint | ClickHouse Docs](https://clickhouse.com/docs/integrations/prometheus) — confirmed embedded Prometheus endpoint scrapes system.metrics automatically
- [ClickHouse Other Functions | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/functions/other-functions) — verified formatReadableSize() function exists and is valid
- [ClickHouse Server Settings | ClickHouse Docs](https://clickhouse.com/docs/operations/server-configuration-parameters/settings) — confirmed `background_pool_size` setting name and purpose
- [ClickHouse/src/Common/CurrentMetrics.cpp](https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/CurrentMetrics.cpp) — verified all specific metric names (Query, BackgroundMergesAndMutationsPoolTask, BackgroundFetchesPoolTask, DistributedSend, MemoryTracking, OpenFileForRead, OpenFileForWrite, ReplicatedChecks, Connection)

## Issues Found
No technical issues found.

## Review Notes
- All nine metric names referenced in the post (Query, BackgroundMergesAndMutationsPoolTask, BackgroundFetchesPoolTask, DistributedSend, MemoryTracking, OpenFileForRead, OpenFileForWrite, ReplicatedChecks, Connection) are valid and present in ClickHouse's CurrentMetrics source.
- The comparison table between system.metrics, system.events, and system.asynchronous_metrics is accurate. The Prometheus endpoint exports system.events as counters and system.metrics as gauges, consistent with the post's characterization.
- All SQL syntax is valid ClickHouse SQL, including formatReadableSize(), LIKE pattern matching, and the IN clause with string literals.
- The `background_pool_size` server setting is correctly named and accurately described as controlling the merge/mutation thread pool size.
