# How to Set Up ClickHouse Monitoring on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kubernetes, Monitoring, Prometheus, Grafana

Description: Set up comprehensive ClickHouse monitoring on Kubernetes using Prometheus and Grafana to track query performance, memory usage, and replication health.

---

Monitoring ClickHouse on Kubernetes requires scraping built-in metrics, setting up dashboards, and configuring alerts. ClickHouse exposes Prometheus-compatible metrics out of the box, making integration straightforward.

## Enabling the Prometheus Endpoint

ClickHouse has a built-in Prometheus exporter. Enable it in your configuration:

```xml
<clickhouse>
  <prometheus>
    <endpoint>/metrics</endpoint>
    <port>9363</port>
    <metrics>true</metrics>
    <events>true</events>
    <asynchronous_metrics>true</asynchronous_metrics>
  </prometheus>
</clickhouse>
```

Expose port 9363 in your Kubernetes service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: clickhouse-metrics
  labels:
    app: clickhouse
spec:
  ports:
    - name: metrics
      port: 9363
      targetPort: 9363
  selector:
    app: clickhouse
```

## Configuring Prometheus Scraping

Create a ServiceMonitor if you use the Prometheus Operator:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: clickhouse
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: clickhouse
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
  namespaceSelector:
    matchNames:
      - clickhouse
```

## Key Metrics to Watch

ClickHouse exposes hundreds of metrics. The most important ones to monitor are:

```text
ClickHouseMetrics_Query              - currently running queries
ClickHouseMetrics_MemoryTracking     - memory currently in use
ClickHouseProfileEvents_SelectQueryTimeMicroseconds - cumulative select query time
ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay     - replication lag in seconds
ClickHouseMetrics_Merge              - active merge operations
```

Query them directly for quick checks:

```sql
SELECT metric, value
FROM system.metrics
WHERE metric IN ('Query', 'MemoryTracking', 'Merge')
ORDER BY metric;
```

## Grafana Dashboard Setup

Import the popular ClickHouse community Grafana dashboard (ID 14192) or create custom panels. A useful PromQL expression for query rate:

```text
rate(ClickHouseProfileEvents_Query[5m])
```

For memory pressure:

```text
ClickHouseAsyncMetrics_MemoryResident / 1073741824
```

## Alerting Rules

Define PrometheusRule resources for critical conditions:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: clickhouse-alerts
spec:
  groups:
    - name: clickhouse
      rules:
        - alert: ClickHouseHighMemory
          expr: ClickHouseAsyncMetrics_MemoryResident > 14e9
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "ClickHouse memory usage above 14GB"
        - alert: ClickHouseReplicaDelay
          expr: ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay > 300
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "ClickHouse replica is more than 5 minutes behind"
```

## Using system.query_log

For historical query analysis, query ClickHouse's internal tables:

```sql
SELECT
    query_start_time,
    query_duration_ms,
    read_rows,
    memory_usage,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_start_time > now() - INTERVAL 1 HOUR
ORDER BY query_duration_ms DESC
LIMIT 10;
```

## Summary

Monitoring ClickHouse on Kubernetes involves enabling the built-in Prometheus endpoint, configuring scraping with ServiceMonitors, and building Grafana dashboards for key metrics. Combine metrics-based alerting with periodic queries against `system.query_log` and `system.metrics` for a complete observability picture.
