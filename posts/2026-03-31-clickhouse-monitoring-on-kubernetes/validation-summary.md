# Validation Summary: How to Set Up ClickHouse Monitoring on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (database and built-in Prometheus exporter)
- Kubernetes (Services, resource definitions)
- Prometheus (scraping, ServiceMonitor, PrometheusRule, PromQL)
- Grafana (dashboards, community dashboard ID 14192)
- Prometheus Operator (monitoring.coreos.com/v1 CRDs)

## Sources Consulted
- ClickHouse Prometheus interface documentation: https://clickhouse.com/docs/en/interfaces/prometheus
- ClickHouse server configuration parameters: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#prometheus
- ClickHouse system.metrics table: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse system.asynchronous_metrics table: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse system.events table: https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse system.query_log table: https://clickhouse.com/docs/en/operations/system-tables/query_log
- Grafana dashboard registry: https://grafana.com/grafana/dashboards/14192
- Prometheus Operator CRD documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found

1. **Incorrect metric name `ClickHouseProfileEvents_QueryTime`**: No profile event called `QueryTime` exists in ClickHouse. Changed to `ClickHouseProfileEvents_SelectQueryTimeMicroseconds`, which is the actual metric tracking cumulative select query execution time.

2. **Incorrect metric name `ClickHouseAsyncMetrics_ReplicaDelay`**: No asynchronous metric called `ReplicaDelay` exists. The correct metric is `ReplicasMaxAbsoluteDelay`, which tracks the maximum absolute delay across replicas in seconds. Fixed in both the metrics list and the alerting rule expression.

3. **Incorrect metric name `ClickHouseMetrics_BackgroundMerges`**: No metric called `BackgroundMerges` exists in `system.metrics`. The correct metric is `Merge`, which counts currently executing background merges. Fixed in both the metrics list and the SQL query against `system.metrics`.

4. **Misleading "official" label for Grafana dashboard**: Dashboard ID 14192 is a community-maintained dashboard (originally by Weastur, hosted on Grafana Labs), not an official ClickHouse product. Changed "official ClickHouse Grafana dashboard" to "popular ClickHouse community Grafana dashboard".

## Review Notes
- The Prometheus endpoint configuration is valid but only shows three of the six available sub-elements (`metrics`, `events`, `asynchronous_metrics`). The `errors`, `histograms`, and `dimensional_metrics` sub-elements are also available but omitted. This is acceptable for a tutorial-style post but readers should be aware additional options exist.
- The Kubernetes Service and ServiceMonitor YAML are syntactically correct and follow standard patterns for the Prometheus Operator.
- The PrometheusRule YAML structure is correct for the monitoring.coreos.com/v1 API.
- All `system.query_log` column names (`query_start_time`, `query_duration_ms`, `read_rows`, `memory_usage`, `query`) and the `QueryFinish` type filter are verified correct.
- The PromQL expressions (`rate()` on a counter, dividing bytes by 1073741824 for GiB) are syntactically and semantically correct.
