# How to Stream OpenTelemetry Data to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, OpenTelemetry, Observability, Trace, Metric, Log, Database, Monitoring

Description: A comprehensive guide to using ClickHouse as an observability backend for OpenTelemetry data, covering schema design for traces, metrics, and logs, plus configuration of the OpenTelemetry Collector.

---

ClickHouse makes an excellent backend for OpenTelemetry data. It handles the high-volume writes from telemetry pipelines while providing fast queries for dashboards and troubleshooting. This guide covers how to configure the OpenTelemetry Collector to send data to ClickHouse and design efficient schemas.

## Why ClickHouse for Observability?

- **Cost-effective**: Store months of telemetry data affordably
- **Fast queries**: Sub-second aggregations over billions of spans
- **Flexible**: Custom schemas optimized for your query patterns
- **Scalable**: Handles millions of events per second
- **Open**: No vendor lock-in, full data ownership

## Architecture Overview

```mermaid
flowchart LR
    App[Applications]
    OTelSDK[OTel SDK]
    Collector[OTel Collector]
    CH[(ClickHouse)]
    Grafana[Grafana]

    App --> OTelSDK
    OTelSDK --> Collector
    Collector --> CH
    CH --> Grafana
```

## Schema Design: Traces

### Spans Table

Store individual spans with their attributes:

```sql
CREATE TABLE otel_traces
(
    -- Identifiers
    Timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    TraceId String CODEC(ZSTD(1)),
    SpanId String CODEC(ZSTD(1)),
    ParentSpanId String CODEC(ZSTD(1)),
    TraceState String CODEC(ZSTD(1)),

    -- Span info
    SpanName LowCardinality(String) CODEC(ZSTD(1)),
    SpanKind LowCardinality(String) CODEC(ZSTD(1)),
    ServiceName LowCardinality(String) CODEC(ZSTD(1)),
    ScopeName String CODEC(ZSTD(1)),
    ScopeVersion String CODEC(ZSTD(1)),

    -- Timing
    Duration UInt64 CODEC(ZSTD(1)),

    -- Status
    StatusCode LowCardinality(String) CODEC(ZSTD(1)),
    StatusMessage String CODEC(ZSTD(1)),

    -- Attributes as maps for flexibility
    SpanAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),

    -- Events and links stored as nested
    Events Nested
    (
        Timestamp DateTime64(9),
        Name LowCardinality(String),
        Attributes Map(LowCardinality(String), String)
    ) CODEC(ZSTD(1)),

    Links Nested
    (
        TraceId String,
        SpanId String,
        TraceState String,
        Attributes Map(LowCardinality(String), String)
    ) CODEC(ZSTD(1)),

    INDEX idx_trace_id TraceId TYPE bloom_filter(0.001) GRANULARITY 1,
    INDEX idx_res_attr_key mapKeys(ResourceAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_res_attr_value mapValues(ResourceAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_span_attr_key mapKeys(SpanAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_span_attr_value mapValues(SpanAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_duration Duration TYPE minmax GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, SpanName, toDateTime(Timestamp))
TTL toDateTime(Timestamp) + INTERVAL 30 DAY
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;
```

### Trace Search Materialized View

Pre-aggregate for trace list queries:

```sql
CREATE TABLE otel_traces_trace_id_ts
(
    TraceId String,
    Start DateTime,
    End DateTime,
    INDEX idx_trace_id TraceId TYPE bloom_filter(0.01) GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toDate(Start)
ORDER BY (TraceId, Start)
TTL Start + INTERVAL 30 DAY
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

CREATE MATERIALIZED VIEW otel_traces_trace_id_mv TO otel_traces_trace_id_ts AS
SELECT
    TraceId,
    min(Timestamp) AS Start,
    max(Timestamp) AS End
FROM otel_traces
WHERE TraceId != ''
GROUP BY TraceId;
```

## Schema Design: Metrics

### Metrics Tables

The ClickHouse exporter stores metrics in separate tables by metric type. For example, gauges and histograms use compatible but different schemas:

```sql
CREATE TABLE otel_metrics_gauge
(
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ResourceSchemaUrl String CODEC(ZSTD(1)),
    ScopeName String CODEC(ZSTD(1)),
    ScopeVersion String CODEC(ZSTD(1)),
    ScopeAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ScopeDroppedAttrCount UInt32 CODEC(ZSTD(1)),
    ScopeSchemaUrl String CODEC(ZSTD(1)),
    ServiceName LowCardinality(String) CODEC(ZSTD(1)),
    MetricName String CODEC(ZSTD(1)),
    MetricDescription String CODEC(ZSTD(1)),
    MetricUnit String CODEC(ZSTD(1)),
    Attributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    StartTimeUnix DateTime64(9) CODEC(Delta, ZSTD(1)),
    TimeUnix DateTime64(9) CODEC(Delta, ZSTD(1)),
    Value Float64 CODEC(ZSTD(1)),
    Flags UInt32 CODEC(ZSTD(1)),
    Exemplars Nested
    (
        FilteredAttributes Map(LowCardinality(String), String),
        TimeUnix DateTime64(9),
        Value Float64,
        SpanId String,
        TraceId String
    ) CODEC(ZSTD(1)),

    INDEX idx_res_attr_key mapKeys(ResourceAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_res_attr_value mapValues(ResourceAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_scope_attr_key mapKeys(ScopeAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_scope_attr_value mapValues(ScopeAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_attr_key mapKeys(Attributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_attr_value mapValues(Attributes) TYPE bloom_filter(0.01) GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toDate(TimeUnix)
ORDER BY (ServiceName, MetricName, Attributes, toUnixTimestamp64Nano(TimeUnix))
TTL toDateTime(TimeUnix) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

CREATE TABLE otel_metrics_histogram
(
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ResourceSchemaUrl String CODEC(ZSTD(1)),
    ScopeName String CODEC(ZSTD(1)),
    ScopeVersion String CODEC(ZSTD(1)),
    ScopeAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ScopeDroppedAttrCount UInt32 CODEC(ZSTD(1)),
    ScopeSchemaUrl String CODEC(ZSTD(1)),
    ServiceName LowCardinality(String) CODEC(ZSTD(1)),
    MetricName String CODEC(ZSTD(1)),
    MetricDescription String CODEC(ZSTD(1)),
    MetricUnit String CODEC(ZSTD(1)),
    Attributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    StartTimeUnix DateTime64(9) CODEC(Delta, ZSTD(1)),
    TimeUnix DateTime64(9) CODEC(Delta, ZSTD(1)),
    Count UInt64 CODEC(T64, ZSTD(1)),
    Sum Float64 CODEC(ZSTD(1)),
    BucketCounts Array(UInt64) CODEC(ZSTD(1)),
    ExplicitBounds Array(Float64) CODEC(ZSTD(1)),
    Exemplars Nested
    (
        FilteredAttributes Map(LowCardinality(String), String),
        TimeUnix DateTime64(9),
        Value Float64,
        SpanId String,
        TraceId String
    ) CODEC(ZSTD(1)),
    Flags UInt32 CODEC(ZSTD(1)),
    Min Float64 CODEC(ZSTD(1)),
    Max Float64 CODEC(ZSTD(1)),
    AggregationTemporality Int32 CODEC(ZSTD(1)),

    INDEX idx_res_attr_key mapKeys(ResourceAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_res_attr_value mapValues(ResourceAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_scope_attr_key mapKeys(ScopeAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_scope_attr_value mapValues(ScopeAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_attr_key mapKeys(Attributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_attr_value mapValues(Attributes) TYPE bloom_filter(0.01) GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toDate(TimeUnix)
ORDER BY (ServiceName, MetricName, Attributes, toUnixTimestamp64Nano(TimeUnix))
TTL toDateTime(TimeUnix) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;
```

### Pre-Aggregated Metrics

Create rollups for dashboard queries:

```sql
CREATE TABLE otel_metrics_hourly
(
    Hour DateTime,
    MetricName String,
    ServiceName LowCardinality(String),
    Attributes Map(LowCardinality(String), String),

    ValueSum AggregateFunction(sum, Float64),
    ValueCount AggregateFunction(count),
    ValueMin AggregateFunction(min, Float64),
    ValueMax AggregateFunction(max, Float64),
    ValueAvg AggregateFunction(avg, Float64)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(Hour)
ORDER BY (MetricName, ServiceName, Hour)
TTL Hour + INTERVAL 1 YEAR;

CREATE MATERIALIZED VIEW otel_metrics_hourly_mv TO otel_metrics_hourly AS
SELECT
    toStartOfHour(TimeUnix) AS Hour,
    MetricName,
    ServiceName,
    Attributes,
    sumState(Value) AS ValueSum,
    countState() AS ValueCount,
    minState(Value) AS ValueMin,
    maxState(Value) AS ValueMax,
    avgState(Value) AS ValueAvg
FROM otel_metrics_gauge
GROUP BY Hour, MetricName, ServiceName, Attributes;
```

## Schema Design: Logs

### Logs Table

```sql
CREATE TABLE otel_logs
(
    -- Time and identity
    Timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    TraceId String CODEC(ZSTD(1)),
    SpanId String CODEC(ZSTD(1)),
    TraceFlags UInt8,

    -- Log info
    SeverityText LowCardinality(String) CODEC(ZSTD(1)),
    SeverityNumber UInt8 CODEC(ZSTD(1)),
    Body String CODEC(ZSTD(3)),

    -- Context
    ServiceName LowCardinality(String) CODEC(ZSTD(1)),
    ResourceSchemaUrl LowCardinality(String) CODEC(ZSTD(1)),
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ScopeSchemaUrl LowCardinality(String) CODEC(ZSTD(1)),
    ScopeName String CODEC(ZSTD(1)),
    ScopeVersion LowCardinality(String) CODEC(ZSTD(1)),
    ScopeAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    LogAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    EventName String CODEC(ZSTD(1)),

    INDEX idx_trace_id TraceId TYPE bloom_filter(0.001) GRANULARITY 1,
    INDEX idx_res_attr_key mapKeys(ResourceAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_res_attr_value mapValues(ResourceAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_scope_attr_key mapKeys(ScopeAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_scope_attr_value mapValues(ScopeAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_log_attr_key mapKeys(LogAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_log_attr_value mapValues(LogAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_lower_body lower(Body) TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 8
)
ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (toStartOfFiveMinutes(Timestamp), ServiceName, Timestamp)
TTL toDateTime(Timestamp) + INTERVAL 14 DAY
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;
```

## OpenTelemetry Collector Configuration

### Basic Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 100000

exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000?dial_timeout=10s&compress=lz4
    database: otel
    ttl: 720h
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
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

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

### High-Volume Configuration

For production deployments handling high volume:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16

processors:
  batch:
    timeout: 10s
    send_batch_size: 500000
    send_batch_max_size: 1000000

  memory_limiter:
    check_interval: 1s
    limit_mib: 4000
    spike_limit_mib: 800

  resource:
    attributes:
      - key: environment
        value: production
        action: upsert

exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000?dial_timeout=10s&compress=lz4&max_execution_time=60
    database: otel
    ttl: 720h
    create_schema: true
    timeout: 60s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000
      batch:
        flush_timeout: 10s
        min_size: 1000
        max_size: 100000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

service:
  telemetry:
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [clickhouse]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [clickhouse]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [clickhouse]
```

## Querying Telemetry Data

### Find Slow Traces

```sql
SELECT
    TraceId,
    ServiceName,
    SpanName,
    Duration / 1000000 AS duration_ms
FROM otel_traces
WHERE Timestamp >= now() - INTERVAL 1 HOUR
  AND Duration > 1000000000  -- > 1 second
ORDER BY Duration DESC
LIMIT 100;
```

### Service Error Rates

```sql
SELECT
    ServiceName,
    countIf(StatusCode = 'Error') AS errors,
    count() AS total,
    round(errors / total * 100, 2) AS error_rate
FROM otel_traces
WHERE Timestamp >= now() - INTERVAL 1 HOUR
GROUP BY ServiceName
ORDER BY error_rate DESC;
```

### Trace Timeline

```sql
SELECT
    SpanName,
    ServiceName,
    dateDiff('microsecond', min(Timestamp) OVER (), Timestamp) / 1000 AS start_ms,
    Duration / 1000000 AS duration_ms
FROM otel_traces
WHERE TraceId = 'abc123...'
ORDER BY Timestamp;
```

### Metric Dashboards

```sql
-- Request rate by service
SELECT
    toStartOfMinute(TimeUnix) AS minute,
    ServiceName,
    sum(Value) AS requests
FROM otel_metrics_sum
WHERE MetricName = 'http_requests_total'
  AND TimeUnix >= now() - INTERVAL 1 HOUR
GROUP BY minute, ServiceName
ORDER BY minute;

-- P99 latency from histogram
SELECT
    minute,
    ServiceName,
    quantilePrometheusHistogram(0.99)(upper_bound, cumulative_count) * 1000 AS p99_ms
FROM
(
    SELECT
        toStartOfMinute(TimeUnix) AS minute,
        ServiceName,
        arrayJoin(arrayZip(
            arrayConcat(ExplicitBounds, [CAST('Inf', 'Float64')]),
            arrayCumSum(BucketCounts)
        )) AS bucket,
        bucket.1 AS upper_bound,
        bucket.2 AS cumulative_count
    FROM otel_metrics_histogram
    WHERE MetricName = 'http_request_duration_seconds'
      AND TimeUnix >= now() - INTERVAL 1 HOUR
)
GROUP BY minute, ServiceName;
```

### Log Search

```sql
-- Full-text search in logs
SELECT
    Timestamp,
    ServiceName,
    SeverityText,
    Body
FROM otel_logs
WHERE Timestamp >= now() - INTERVAL 1 HOUR
  AND hasToken(Body, 'error')
ORDER BY Timestamp DESC
LIMIT 100;

-- Correlate logs with trace
SELECT
    Timestamp,
    Body,
    LogAttributes
FROM otel_logs
WHERE TraceId = 'abc123...'
ORDER BY Timestamp;
```

## Grafana Integration

### Data Source Configuration

```yaml
datasources:
  - name: ClickHouse
    type: grafana-clickhouse-datasource
    url: http://clickhouse:8123
    jsonData:
      defaultDatabase: otel
      username: default
```

### Example Dashboard Queries

```sql
-- Time series panel: Request rate
SELECT
    $__timeInterval(Timestamp) AS time,
    ServiceName,
    count() AS requests
FROM otel_traces
WHERE $__timeFilter(Timestamp)
  AND SpanKind = 'Server'
GROUP BY time, ServiceName
ORDER BY time

-- Table panel: Slow endpoints
SELECT
    SpanName,
    ServiceName,
    count() AS calls,
    avg(Duration) / 1000000 AS avg_ms,
    quantile(0.99)(Duration) / 1000000 AS p99_ms
FROM otel_traces
WHERE $__timeFilter(Timestamp)
  AND SpanKind = 'Server'
GROUP BY SpanName, ServiceName
ORDER BY p99_ms DESC
LIMIT 20
```

## Performance Tuning

### Collector Tuning

```yaml
# Increase exporter batch size for throughput

exporters:
  clickhouse:
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000
      batch:
        flush_timeout: 10s
        min_size: 1000
        max_size: 100000
```

### ClickHouse Tuning

```sql
-- Async inserts for high volume
ALTER USER default SETTINGS
    async_insert = 1,
    async_insert_max_data_size = 100000000;

-- Monitor parts
SELECT table, count() AS parts
FROM system.parts
WHERE active AND database = 'otel'
GROUP BY table;
```

### Retention Management

```sql
-- Verify TTL is working
SELECT
    table,
    partition,
    rows,
    min_time,
    max_time
FROM system.parts
WHERE database = 'otel'
ORDER BY max_time;

-- Force TTL cleanup
ALTER TABLE otel_traces MATERIALIZE TTL;
```

---

ClickHouse provides a cost-effective, high-performance backend for OpenTelemetry data. Design your schemas around your query patterns, use materialized views for common aggregations, and tune the collector batch sizes for throughput. With the right configuration, you can store and query millions of spans per second.
