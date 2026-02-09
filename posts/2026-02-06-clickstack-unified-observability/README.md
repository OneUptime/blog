# How to Use ClickStack (ClickHouse + OpenTelemetry) for Unified Logs, Traces, Metrics, and Session Replay

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, ClickHouse, ClickStack, Unified Observability

Description: Set up ClickStack to store and query logs, traces, metrics, and session replays in a single ClickHouse-backed observability platform.

ClickStack is an open-source observability stack built on top of ClickHouse and OpenTelemetry. It provides a unified storage layer for all four observability signals: logs, traces, metrics, and session replays. Instead of running separate backends for each signal type, everything goes into ClickHouse with optimized schemas for each data type.

## Why Unified Storage Matters

When your logs are in Elasticsearch, traces are in Jaeger, metrics are in Prometheus, and session replays are in a SaaS tool, correlating data across signals requires jumping between four different UIs. ClickStack puts everything in one place, making cross-signal queries straightforward.

## Setting Up ClickStack

Deploy ClickStack using Docker Compose:

```yaml
# docker-compose.yaml
version: "3.8"
services:
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - clickhouse-data:/var/lib/clickhouse
      - ./clickhouse-config.xml:/etc/clickhouse-server/config.d/custom.xml
    environment:
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: 1

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
    depends_on:
      - clickhouse

  clickstack-ui:
    image: clickstack/ui:latest
    ports:
      - "3000:3000"
    environment:
      CLICKHOUSE_URL: http://clickhouse:8123
      CLICKHOUSE_DATABASE: observability

volumes:
  clickhouse-data:
```

## ClickHouse Schema for All Signals

ClickStack uses optimized tables for each signal type:

```sql
-- Traces table
CREATE TABLE otel_traces (
    timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    trace_id FixedString(32),
    span_id FixedString(16),
    parent_span_id FixedString(16),
    service_name LowCardinality(String),
    operation_name LowCardinality(String),
    kind LowCardinality(String),
    duration_ns UInt64 CODEC(Delta, ZSTD(1)),
    status_code UInt8,
    status_message String CODEC(ZSTD(1)),
    attributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    resource_attributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    events Nested (
        timestamp DateTime64(9),
        name LowCardinality(String),
        attributes Map(String, String)
    ) CODEC(ZSTD(1))
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service_name, timestamp, trace_id)
TTL toDate(timestamp) + INTERVAL 30 DAY;

-- Logs table with full-text indexing
CREATE TABLE otel_logs (
    timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    trace_id FixedString(32),
    span_id FixedString(16),
    severity_number UInt8,
    severity_text LowCardinality(String),
    service_name LowCardinality(String),
    body String CODEC(ZSTD(1)),
    attributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    resource_attributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    -- Full-text index on log body
    INDEX body_idx body TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service_name, severity_number, timestamp)
TTL toDate(timestamp) + INTERVAL 14 DAY;

-- Metrics table using ClickHouse's native time series support
CREATE TABLE otel_metrics (
    timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    metric_name LowCardinality(String),
    metric_type LowCardinality(String),
    service_name LowCardinality(String),
    value Float64 CODEC(ZSTD(1)),
    attributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    resource_attributes Map(LowCardinality(String), String) CODEC(ZSTD(1))
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (metric_name, service_name, timestamp)
TTL toDate(timestamp) + INTERVAL 90 DAY;

-- Session replay table
CREATE TABLE session_replays (
    session_id String CODEC(ZSTD(1)),
    timestamp DateTime64(3) CODEC(Delta, ZSTD(1)),
    user_id String CODEC(ZSTD(1)),
    event_type LowCardinality(String),
    event_data String CODEC(ZSTD(3)),
    page_url String CODEC(ZSTD(1)),
    service_name LowCardinality(String),
    trace_id FixedString(32)
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (session_id, timestamp)
TTL toDate(timestamp) + INTERVAL 7 DAY;
```

## Collector Configuration

Configure the Collector to route each signal to the appropriate ClickHouse table:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000
    database: observability
    traces_table_name: otel_traces
    logs_table_name: otel_logs
    metrics_table_name: otel_metrics
    ttl: 720h
    create_schema: false

processors:
  batch:
    send_batch_size: 10000
    timeout: 2s

  resourcedetection:
    detectors: [env, system]

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [clickhouse]
    logs:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [clickhouse]
    metrics:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [clickhouse]
```

## Cross-Signal Queries

The real power of unified storage is cross-signal queries. Find errors and their associated logs in one query:

```sql
-- Find error traces and their logs in a single query
SELECT
    t.trace_id,
    t.service_name,
    t.operation_name,
    t.duration_ns / 1e6 as duration_ms,
    l.body as log_message,
    l.severity_text
FROM otel_traces t
LEFT JOIN otel_logs l ON t.trace_id = l.trace_id
WHERE t.status_code = 2  -- ERROR status
  AND t.timestamp > now() - INTERVAL 1 HOUR
ORDER BY t.timestamp DESC
LIMIT 50;

-- Correlate high latency traces with their metrics
SELECT
    t.service_name,
    t.operation_name,
    quantile(0.99)(t.duration_ns) / 1e6 as p99_ms,
    avg(m.value) as avg_cpu_usage
FROM otel_traces t
JOIN otel_metrics m ON t.service_name = m.service_name
  AND m.metric_name = 'process.cpu.utilization'
  AND abs(dateDiff('second', t.timestamp, m.timestamp)) < 60
WHERE t.timestamp > now() - INTERVAL 1 HOUR
GROUP BY t.service_name, t.operation_name
ORDER BY p99_ms DESC;
```

## Wrapping Up

ClickStack provides a single-backend approach to observability that eliminates the complexity of managing multiple storage systems. By leveraging ClickHouse's columnar storage, compression, and query performance, you get a unified platform where logs, traces, metrics, and session replays coexist and can be correlated with simple SQL joins.
