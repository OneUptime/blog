# How to Use ClickStack for Unified Logs, Traces, Metrics, and Session Replay

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

services:
  clickstack:
    image: clickhouse/clickstack-all-in-one:latest
    command: ["clickstack"]
    ports:
      - "8123:8123" # ClickHouse HTTP
      - "8080:8080" # HyperDX UI
      - "4317:4317" # OTLP gRPC
      - "4318:4318" # OTLP HTTP
    volumes:
      - clickstack-db:/data/db
      - clickhouse-data:/var/lib/clickhouse
      - clickhouse-logs:/var/log/clickhouse-server

volumes:
  clickstack-db:
  clickhouse-data:
  clickhouse-logs:
```

## ClickHouse Schema for All Signals

ClickStack uses optimized tables for each signal type. The default database is `default`, unless you change `HYPERDX_OTEL_EXPORTER_CLICKHOUSE_DATABASE`:

```sql
-- Traces table
CREATE TABLE default.otel_traces (
    `Timestamp` DateTime64(9) CODEC(Delta(8), ZSTD(1)),
    `TraceId` String CODEC(ZSTD(1)),
    `SpanId` String CODEC(ZSTD(1)),
    `ParentSpanId` String CODEC(ZSTD(1)),
    `TraceState` String CODEC(ZSTD(1)),
    `SpanName` LowCardinality(String) CODEC(ZSTD(1)),
    `SpanKind` LowCardinality(String) CODEC(ZSTD(1)),
    `ServiceName` LowCardinality(String) CODEC(ZSTD(1)),
    `ResourceAttributes` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    `ScopeName` String CODEC(ZSTD(1)),
    `ScopeVersion` String CODEC(ZSTD(1)),
    `SpanAttributes` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    `Duration` UInt64 CODEC(ZSTD(1)),
    `StatusCode` LowCardinality(String) CODEC(ZSTD(1)),
    `StatusMessage` String CODEC(ZSTD(1)),
    `Events.Timestamp` Array(DateTime64(9)) CODEC(ZSTD(1)),
    `Events.Name` Array(LowCardinality(String)) CODEC(ZSTD(1)),
    `Events.Attributes` Array(Map(LowCardinality(String), String)) CODEC(ZSTD(1)),
    `Links.TraceId` Array(String) CODEC(ZSTD(1)),
    `Links.SpanId` Array(String) CODEC(ZSTD(1)),
    `Links.TraceState` Array(String) CODEC(ZSTD(1)),
    `Links.Attributes` Array(Map(LowCardinality(String), String)) CODEC(ZSTD(1)),
    INDEX idx_trace_id TraceId TYPE bloom_filter(0.001) GRANULARITY 1,
    INDEX idx_duration Duration TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, SpanName, toDateTime(Timestamp))
TTL toDateTime(Timestamp) + INTERVAL 30 DAY
SETTINGS ttl_only_drop_parts = 1;

-- Logs table with full-text indexing
CREATE TABLE default.otel_logs (
    `Timestamp` DateTime64(9) CODEC(Delta(8), ZSTD(1)),
    `TraceId` String CODEC(ZSTD(1)),
    `SpanId` String CODEC(ZSTD(1)),
    `TraceFlags` UInt8,
    `SeverityText` LowCardinality(String) CODEC(ZSTD(1)),
    `SeverityNumber` UInt8,
    `ServiceName` LowCardinality(String) CODEC(ZSTD(1)),
    `Body` String CODEC(ZSTD(1)),
    `ResourceSchemaUrl` LowCardinality(String) CODEC(ZSTD(1)),
    `ResourceAttributes` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    `ScopeSchemaUrl` LowCardinality(String) CODEC(ZSTD(1)),
    `ScopeName` String CODEC(ZSTD(1)),
    `ScopeVersion` LowCardinality(String) CODEC(ZSTD(1)),
    `ScopeAttributes` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    `LogAttributes` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    `EventName` String CODEC(ZSTD(1)),
    INDEX idx_trace_id TraceId TYPE bloom_filter(0.001) GRANULARITY 1,
    INDEX idx_lower_body lower(Body) TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 8
) ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (toStartOfFiveMinutes(Timestamp), ServiceName, Timestamp)
TTL toDateTime(Timestamp) + INTERVAL 14 DAY
SETTINGS ttl_only_drop_parts = 1;

-- Gauge metrics table. Sum, histogram, exponential histogram, and summary
-- metrics use separate tables with the same prefix.
CREATE TABLE default.otel_metrics_gauge (
    `ResourceAttributes` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    `ResourceSchemaUrl` String CODEC(ZSTD(1)),
    `ScopeName` String CODEC(ZSTD(1)),
    `ScopeVersion` String CODEC(ZSTD(1)),
    `ScopeAttributes` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    `ScopeDroppedAttrCount` UInt32 CODEC(ZSTD(1)),
    `ScopeSchemaUrl` String CODEC(ZSTD(1)),
    `ServiceName` LowCardinality(String) CODEC(ZSTD(1)),
    `MetricName` String CODEC(ZSTD(1)),
    `MetricDescription` String CODEC(ZSTD(1)),
    `MetricUnit` String CODEC(ZSTD(1)),
    `Attributes` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    `StartTimeUnix` DateTime64(9) CODEC(Delta(8), ZSTD(1)),
    `TimeUnix` DateTime64(9) CODEC(Delta(8), ZSTD(1)),
    `Value` Float64 CODEC(ZSTD(1)),
    `Flags` UInt32 CODEC(ZSTD(1)),
    `Exemplars.FilteredAttributes` Array(Map(LowCardinality(String), String)) CODEC(ZSTD(1)),
    `Exemplars.TimeUnix` Array(DateTime64(9)) CODEC(ZSTD(1)),
    `Exemplars.Value` Array(Float64) CODEC(ZSTD(1)),
    `Exemplars.SpanId` Array(String) CODEC(ZSTD(1)),
    `Exemplars.TraceId` Array(String) CODEC(ZSTD(1))
) ENGINE = MergeTree()
PARTITION BY toDate(TimeUnix)
ORDER BY (ServiceName, MetricName, Attributes, toUnixTimestamp64Nano(TimeUnix))
TTL toDateTime(TimeUnix) + INTERVAL 90 DAY
SETTINGS ttl_only_drop_parts = 1;

-- Session replay table
CREATE TABLE default.hyperdx_sessions (
    `Timestamp` DateTime64(9) CODEC(Delta(8), ZSTD(1)),
    `TimestampTime` DateTime DEFAULT toDateTime(Timestamp),
    `TraceId` String CODEC(ZSTD(1)),
    `SpanId` String CODEC(ZSTD(1)),
    `TraceFlags` UInt8,
    `SeverityText` LowCardinality(String) CODEC(ZSTD(1)),
    `SeverityNumber` UInt8,
    `ServiceName` LowCardinality(String) CODEC(ZSTD(1)),
    `Body` String CODEC(ZSTD(1)),
    `ResourceSchemaUrl` LowCardinality(String) CODEC(ZSTD(1)),
    `ResourceAttributes` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    `ScopeSchemaUrl` LowCardinality(String) CODEC(ZSTD(1)),
    `ScopeName` String CODEC(ZSTD(1)),
    `ScopeVersion` LowCardinality(String) CODEC(ZSTD(1)),
    `ScopeAttributes` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    `LogAttributes` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    INDEX idx_trace_id TraceId TYPE bloom_filter(0.001) GRANULARITY 1,
    INDEX idx_lower_body lower(Body) TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 8
) ENGINE = MergeTree()
PARTITION BY toDate(TimestampTime)
PRIMARY KEY (ServiceName, TimestampTime)
ORDER BY (ServiceName, TimestampTime, Timestamp)
TTL TimestampTime + INTERVAL 7 DAY
SETTINGS ttl_only_drop_parts = 1;
```

## Collector Configuration

If you run a separate OpenTelemetry Collector instead of the collector bundled with ClickStack, configure the ClickHouse exporter to route each signal to the appropriate ClickHouse tables:

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
    endpoint: tcp://clickstack:9000?dial_timeout=10s&compress=lz4&async_insert=1
    database: default
    traces_table_name: otel_traces
    logs_table_name: otel_logs
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
        name: otel_metrics_exponential_histogram
    ttl: 720h
    create_schema: true
    timeout: 5s
    sending_queue:
      queue_size: 1000
    retry_on_failure:
      enabled: true

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
    t.TraceId,
    t.ServiceName,
    t.SpanName,
    t.Duration / 1e6 as duration_ms,
    l.Body as log_message,
    l.SeverityText
FROM otel_traces t
LEFT JOIN otel_logs l ON t.TraceId = l.TraceId
WHERE t.StatusCode = 'Error'
  AND t.Timestamp > now() - INTERVAL 1 HOUR
ORDER BY t.Timestamp DESC
LIMIT 50;

-- Correlate high latency traces with their metrics
SELECT
    t.ServiceName,
    t.SpanName,
    quantile(0.99)(t.Duration) / 1e6 as p99_ms,
    avg(m.Value) as avg_cpu_usage
FROM otel_traces t
JOIN otel_metrics_gauge m ON t.ServiceName = m.ServiceName
  AND m.MetricName = 'process.cpu.utilization'
  AND abs(dateDiff('second', t.Timestamp, m.TimeUnix)) < 60
WHERE t.Timestamp > now() - INTERVAL 1 HOUR
GROUP BY t.ServiceName, t.SpanName
ORDER BY p99_ms DESC;
```

## Wrapping Up

ClickStack provides a single-backend approach to observability that eliminates the complexity of managing multiple storage systems. By leveraging ClickHouse's columnar storage, compression, and query performance, you get a unified platform where logs, traces, metrics, and session replays coexist and can be correlated with simple SQL joins.
