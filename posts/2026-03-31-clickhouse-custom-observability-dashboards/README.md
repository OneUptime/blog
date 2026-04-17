# How to Build Custom Observability Dashboards on ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Grafana, Dashboard, Observability, SQL

Description: Learn how to build custom observability dashboards using ClickHouse as the data source with Grafana, covering trace, metric, and log visualizations.

---

## Why Build Dashboards Directly on ClickHouse

Generic observability UIs (Jaeger, Prometheus, Loki) are optimized for single-signal queries. Custom dashboards on ClickHouse let you correlate traces, logs, and metrics in a single SQL query and visualize exactly what your business needs.

## Grafana ClickHouse Plugin Setup

Install a ClickHouse data source plugin in Grafana:

```bash
# Official Grafana Labs plugin:
grafana-cli plugins install grafana-clickhouse-datasource
# or the Altinity-maintained community plugin:
grafana-cli plugins install vertamedia-clickhouse-datasource
```

Configure the data source:

```text
URL:      http://clickhouse:8123
Database: otel
Username: default
Password: (your password)
```

## Error Rate Panel Query

```sql
SELECT
  toStartOfMinute(Timestamp) AS time,
  countIf(StatusCode = 'Error') / count() AS error_rate
FROM otel_traces
WHERE $__timeFilter(Timestamp)
  AND ServiceName = '$service'
GROUP BY time
ORDER BY time
```

## P95 Latency Panel

```sql
SELECT
  toStartOfMinute(Timestamp) AS time,
  quantile(0.95)(Duration) / 1e6 AS p95_ms
FROM otel_traces
WHERE $__timeFilter(Timestamp)
  AND ServiceName = '$service'
  AND SpanName = '$operation'
GROUP BY time
ORDER BY time
```

## Top Slow Endpoints Table Panel

```sql
SELECT
  SpanName AS endpoint,
  count() AS requests,
  round(quantile(0.50)(Duration) / 1e6, 1) AS p50_ms,
  round(quantile(0.95)(Duration) / 1e6, 1) AS p95_ms,
  round(quantile(0.99)(Duration) / 1e6, 1) AS p99_ms,
  countIf(StatusCode = 'Error') AS errors
FROM otel_traces
WHERE $__timeFilter(Timestamp)
  AND ServiceName = '$service'
GROUP BY endpoint
ORDER BY p95_ms DESC
LIMIT 20
```

## Log Volume Histogram

```sql
SELECT
  toStartOfMinute(Timestamp) AS time,
  countIf(SeverityText = 'ERROR') AS errors,
  countIf(SeverityText = 'WARN') AS warnings,
  countIf(SeverityText = 'INFO') AS info
FROM otel_logs
WHERE $__timeFilter(Timestamp)
  AND ServiceName = '$service'
GROUP BY time
ORDER BY time
```

## Service Dependency Map

```sql
SELECT
  ServiceName AS source,
  SpanAttributes['peer.service'] AS target,
  count() AS calls,
  avg(Duration) / 1e6 AS avg_ms
FROM otel_traces
WHERE $__timeFilter(Timestamp)
  AND mapContains(SpanAttributes, 'peer.service')
GROUP BY source, target
ORDER BY calls DESC
```

## Summary

Custom observability dashboards on ClickHouse use the Grafana ClickHouse plugin with Grafana template variables (`$service`, `$operation`) and `$__timeFilter()` macros. Build panels for error rates, latency percentiles, log volumes, and service dependency maps with plain SQL. ClickHouse's columnar storage makes these cross-signal aggregations significantly faster than querying separate Elasticsearch, Prometheus, and Loki backends.
