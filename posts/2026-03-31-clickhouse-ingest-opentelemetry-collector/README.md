# How to Ingest Data from OpenTelemetry Collector to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, OpenTelemetry, OTEL Collector, Trace, Metric, Log

Description: Learn how to configure the OpenTelemetry Collector to export traces, metrics, and logs to ClickHouse using the clickhouse exporter.

---

The OpenTelemetry Collector's ClickHouse exporter writes traces, metrics, and logs directly into ClickHouse, making it a powerful observability backend for OTEL-instrumented services.

## Installing the ClickHouse Exporter

Use the OpenTelemetry Collector Contrib distribution which includes the ClickHouse exporter:

```bash
docker pull otel/opentelemetry-collector-contrib:latest
```

## Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

processors:
  batch:
    timeout: 5s
    send_batch_size: 5000

exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000
    database: otel
    username: default
    password: ${CLICKHOUSE_PASSWORD}
    ttl: 72h
    create_schema: true
    logs_table_name: otel_logs
    traces_table_name: otel_traces
    metrics_tables:
      gauge:
        name: otel_metrics_gauge
      sum:
        name: otel_metrics_sum
      summary:
        name: otel_metrics_summary
      histogram:
        name: otel_metrics_histogram
      exponential_histogram:
        name: otel_metrics_exp_histogram
    compress: lz4

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [clickhouse]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [clickhouse]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [clickhouse]
```

## Auto-Created Schema

With `create_schema: true`, the exporter creates tables automatically:

```sql
-- Example auto-created traces table
SHOW CREATE TABLE otel.otel_traces;
```

## Querying OTEL Data

Query traces for slow operations:

```sql
SELECT
    TraceId,
    SpanName,
    Duration / 1e6 AS duration_ms
FROM otel.otel_traces
WHERE Duration > 1000000000  -- 1 second in nanoseconds
ORDER BY Duration DESC
LIMIT 20;
```

Query error logs:

```sql
SELECT Timestamp, Body, ServiceName, SeverityText
FROM otel.otel_logs
WHERE SeverityText IN ('ERROR', 'FATAL')
  AND Timestamp >= now() - INTERVAL 1 HOUR
ORDER BY Timestamp DESC;
```

## Running with Docker Compose

```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib
    volumes:
      - ./otel-collector-config.yaml:/etc/otel/config.yaml
    command: ["--config=/etc/otel/config.yaml"]
    environment:
      CLICKHOUSE_PASSWORD: secret
    ports:
      - "4317:4317"
      - "4318:4318"
```

## Summary

The OpenTelemetry Collector ClickHouse exporter writes traces, metrics, and logs to ClickHouse with automatic schema creation. Use the Contrib distribution, configure batch processors for throughput, and set a TTL to manage storage costs.
