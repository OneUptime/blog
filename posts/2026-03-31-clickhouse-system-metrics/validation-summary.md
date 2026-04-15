# Validation Summary: How to Use system.metrics in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system tables: system.metrics, system.events, system.asynchronous_metrics, system.metric_log)
- ClickHouse SQL dialect
- ClickHouse Prometheus endpoint
- Mermaid diagrams

## Sources Consulted
- [system.metrics | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/metrics)
- [system.metric_log | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/metric_log)
- [system.events | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/events)
- [system.asynchronous_metrics | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics)
- [Prometheus protocols | ClickHouse Docs](https://clickhouse.com/docs/interfaces/prometheus)
- [Server Settings (asynchronous_metrics_update_period_s) | ClickHouse Docs](https://clickhouse.com/docs/operations/server-configuration-parameters/settings)
- [ClickHouse source: src/Common/CurrentMetrics.cpp](https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/CurrentMetrics.cpp)

## Issues Found

1. **Incorrect metric name `MemoryTrackingInBackgroundProcessingPool`**: This metric does not exist in current ClickHouse. Replaced with the correct metric name `MergesMutationsMemoryTracking`, which tracks memory used by background merge and mutation operations.

2. **Wrong Prometheus metric prefix**: The post used `clickhouse_metrics_` (snake_case) as the Prometheus metric prefix. ClickHouse actually exports metrics with the `ClickHouseMetrics_` prefix (PascalCase). Fixed the curl grep filter and example output to use `ClickHouseMetrics_Query`.

3. **Incorrect `InterserverConnection` description**: The post described this metric as "Active inter-shard connections." ClickHouse defines it as connections from other replicas to fetch parts — it is inter-replica, not inter-shard. Fixed to "Active inter-replica connections."

4. **Wrong `system.asynchronous_metrics` update interval**: The mermaid diagram stated "computed every 1s." The default value of `asynchronous_metrics_update_period_s` is 60 seconds, not 1 second. Fixed to "computed every 60s by default."

## Review Notes
- The mermaid diagram uses `Query` as the example for both `system.metrics` (gauge) and `system.events` (counter). While both are technically valid metric/event names, using a different event name (e.g., `SelectQuery`) for the `system.events` example would make the distinction clearer. Not changed since it is not technically incorrect.
- All SQL queries use correct ClickHouse SQL syntax and reference valid column names.
- The `system.metric_log` column naming convention (`CurrentMetric_Query`, `CurrentMetric_Merge`) is correct.
- The table schema (columns: metric, value, description) is accurate per official documentation.
