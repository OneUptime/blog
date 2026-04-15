# How to Use ClickHouse with Open Source Observability Stacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Observability, OpenTelemetry, Grafana, Open Source

Description: Integrate ClickHouse into open source observability stacks with OpenTelemetry, Grafana, and Vector to build a cost-effective logs-metrics-traces platform.

---

## The Open Source Observability Stack

A modern open source observability stack combines:

- **Collection**: OpenTelemetry Collector or Vector
- **Storage**: ClickHouse for logs, metrics, and traces
- **Visualization**: Grafana with ClickHouse plugin
- **Alerting**: Grafana alerts or OneUptime

This stack competes directly with commercial observability platforms at a fraction of the cost.

## ClickHouse Schema for All Three Pillars

### Logs

```sql
CREATE TABLE otel_logs (
    timestamp    DateTime64(9),
    trace_id     String,
    span_id      String,
    severity     LowCardinality(String),
    service_name LowCardinality(String),
    body         String,
    attributes   Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service_name, severity, timestamp)
TTL toDate(timestamp) + INTERVAL 30 DAY DELETE;
```

### Metrics

```sql
CREATE TABLE otel_metrics (
    timestamp    DateTime64(3),
    metric_name  LowCardinality(String),
    service_name LowCardinality(String),
    attributes   Map(String, String),
    value        Float64
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (metric_name, service_name, timestamp)
TTL toDate(timestamp) + INTERVAL 90 DAY DELETE;
```

### Traces

```sql
CREATE TABLE otel_traces (
    timestamp          DateTime64(9),
    trace_id           String,
    span_id            String,
    parent_span_id     String,
    service_name       LowCardinality(String),
    operation_name     String,
    duration_ns        UInt64,
    status_code        LowCardinality(String),
    attributes         Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service_name, timestamp)
TTL toDate(timestamp) + INTERVAL 7 DAY DELETE;
```

## OpenTelemetry Collector Configuration

Route all signals to ClickHouse using the ClickHouse exporter:

```text
exporters:
  clickhouse:
    endpoint: tcp://ch.internal:9000
    database: default
    username: otel_writer
    password: ${CH_PASSWORD}
    logs_table_name: otel_logs
    metrics_table_name: otel_metrics
    traces_table_name: otel_traces
    ttl: 720h

service:
  pipelines:
    logs:
      receivers: [otlp]
      exporters: [clickhouse]
    metrics:
      receivers: [otlp]
      exporters: [clickhouse]
    traces:
      receivers: [otlp]
      exporters: [clickhouse]
```

## Grafana Dashboard Queries

Error rate panel:

```sql
SELECT
    toStartOfMinute(timestamp) AS time,
    countIf(severity = 'ERROR') / count() AS error_rate
FROM otel_logs
WHERE timestamp >= $__fromTime AND timestamp <= $__toTime
  AND service_name = '$service'
GROUP BY time
ORDER BY time;
```

## Correlating Logs and Traces

ClickHouse enables cross-pillar correlation with a JOIN:

```sql
SELECT l.timestamp, l.body, t.duration_ns
FROM otel_logs l
JOIN otel_traces t ON t.trace_id = l.trace_id
WHERE l.trace_id = '4bf92f3577b34da6a3ce929d0e0e4736'
ORDER BY l.timestamp;
```

## Summary

ClickHouse as the storage backend for an open source observability stack with OpenTelemetry and Grafana provides a unified, SQL-queryable store for logs, metrics, and traces at significantly lower cost than commercial alternatives.
