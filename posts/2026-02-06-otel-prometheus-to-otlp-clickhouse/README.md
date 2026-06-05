# How to Build a Collector Pipeline That Converts Incoming Prometheus Metrics to

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prometheus, OTLP, ClickHouse, Metrics Conversion

Description: Build an OpenTelemetry Collector pipeline that scrapes Prometheus metrics, converts them to OTLP format, and routes them to ClickHouse for storage.

Many teams have existing Prometheus exporters and do not want to rewrite them. The OpenTelemetry Collector can scrape these Prometheus endpoints, convert the metrics to OTLP format, and send them to ClickHouse or any other backend. You keep your existing Prometheus instrumentation and gain the flexibility of the OTLP ecosystem.

## The Pipeline

```text
[Prometheus Endpoints] --> [Prometheus Receiver] --> [Processors] --> [ClickHouse Exporter]
```

The Prometheus receiver in the collector acts like a Prometheus server: it scrapes targets on a schedule, parses the exposition format, and converts to OTLP metrics internally.

## Basic Configuration

```yaml
# otel-collector-config.yaml

receivers:
  # Scrape Prometheus endpoints just like Prometheus would
  prometheus:
    config:
      scrape_configs:
        - job_name: "kubernetes-pods"
          scrape_interval: 15s
          kubernetes_sd_configs:
            - role: pod
          relabel_configs:
            # Only scrape pods with the prometheus.io/scrape annotation
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
              action: keep
              regex: true
            # Use the port from the annotation
            - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
              action: replace
              target_label: __address__
              regex: ([^:]+)(?::\d+)?;(\d+)
              replacement: "$$1:$$2"
            # Use the path from the annotation (default /metrics)
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
              action: replace
              target_label: __metrics_path__
              regex: (.+)

        - job_name: "node-exporter"
          scrape_interval: 30s
          static_configs:
            - targets:
                - "node-exporter.monitoring.svc:9100"

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

  batch:
    send_batch_size: 1024
    timeout: 10s

exporters:
  clickhouse:
    endpoint: "tcp://clickhouse.database.svc:9000"
    database: "otel"
    username: "otel_writer"
    password: "${CLICKHOUSE_PASSWORD}"
    ttl: 2160h
    # Table creation settings
    create_schema: true
    metrics_tables:
      gauge:
        name: "otel_metrics_gauge"
      sum:
        name: "otel_metrics_sum"
      summary:
        name: "otel_metrics_summary"
      histogram:
        name: "otel_metrics_histogram"
      exponential_histogram:
        name: "otel_metrics_exp_histogram"
    # Compression for efficient storage
    compress: lz4

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [memory_limiter, batch]
      exporters: [clickhouse]
```

## Handling Prometheus Metric Types

Prometheus has counters, gauges, histograms, and summaries. The collector converts them to OTLP equivalents:

| Prometheus | OTLP |
|-----------|------|
| Counter | Sum (monotonic) |
| Gauge | Gauge |
| Histogram | Histogram |
| Native histogram | ExponentialHistogram |
| Summary | Summary |

For histograms, you might want to control the conversion:

```yaml
receivers:
  prometheus:
    config:
      global:
        scrape_protocols: [PrometheusProto, OpenMetricsText1.0.0, OpenMetricsText0.0.1, PrometheusText0.0.4]
        scrape_native_histograms: true
      scrape_configs:
        - job_name: "app"
          scrape_interval: 15s
          always_scrape_classic_histograms: true
          static_configs:
            - targets: ["app.default.svc:8080"]
```

## Filtering and Transforming Metrics

You probably do not want every Prometheus metric in ClickHouse. Filter out the noise:

```yaml
processors:
  filter/keep_important:
    metrics:
      include:
        match_type: regexp
        metric_names:
          - "http_request_duration_.*"
          - "http_requests_total"
          - "process_cpu_seconds_total"
          - "process_resident_memory_bytes"
          - "go_goroutines"
          - "node_cpu_.*"
          - "node_memory_.*"
          - "node_disk_.*"

  # Drop high-cardinality attributes that bloat ClickHouse
  transform/drop_high_cardinality:
    metric_statements:
      - context: datapoint
        statements:
          - delete_key(attributes, "pod_uid")
          - delete_key(attributes, "container_id")
```

## ClickHouse Schema

The ClickHouse exporter creates tables automatically. Current versions create separate tables for each OTLP metric data type, such as `otel_metrics_gauge`, `otel_metrics_sum`, `otel_metrics_summary`, `otel_metrics_histogram`, and `otel_metrics_exp_histogram`. Here is what the sum metrics table looks like if you want to create it manually:

```sql
-- ClickHouse table for OTLP sum metrics
CREATE TABLE otel.otel_metrics_sum
(
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ResourceSchemaUrl  String CODEC(ZSTD(1)),
    ScopeName          String CODEC(ZSTD(1)),
    ScopeVersion       String CODEC(ZSTD(1)),
    ScopeAttributes    Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ScopeDroppedAttrCount UInt32 CODEC(ZSTD(1)),
    ScopeSchemaUrl     String CODEC(ZSTD(1)),
    ServiceName        LowCardinality(String) CODEC(ZSTD(1)),
    MetricName         String CODEC(ZSTD(1)),
    MetricDescription  String CODEC(ZSTD(1)),
    MetricUnit         String CODEC(ZSTD(1)),
    Attributes         Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    StartTimeUnix      DateTime64(9) CODEC(Delta, ZSTD(1)),
    TimeUnix           DateTime64(9) CODEC(Delta, ZSTD(1)),
    Value              Float64 CODEC(ZSTD(1)),
    Flags              UInt32 CODEC(ZSTD(1)),
    Exemplars Nested (
        FilteredAttributes Map(LowCardinality(String), String),
        TimeUnix DateTime64(9),
        Value Float64,
        SpanId String,
        TraceId String
    ) CODEC(ZSTD(1)),
    AggregationTemporality Int32 CODEC(ZSTD(1)),
    IsMonotonic Boolean CODEC(Delta, ZSTD(1)),
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
TTL toDateTime(TimeUnix) + INTERVAL 90 DAY;
```

## Querying the Data

Once metrics are in ClickHouse, you can query them with SQL:

```sql
-- Average request duration by service over the last hour
SELECT
    ServiceName AS service,
    sum(Sum) / sum(Count) AS avg_duration_seconds
FROM otel.otel_metrics_histogram
WHERE MetricName = 'http_request_duration_seconds'
  AND TimeUnix > now() - INTERVAL 1 HOUR
GROUP BY service
ORDER BY avg_duration_seconds DESC;

-- Request rate by status code
SELECT
    Attributes['status_code'] AS status,
    (max(Value) - min(Value)) / 3600 AS requests_per_second
FROM otel.otel_metrics_sum
WHERE MetricName = 'http_requests_total'
  AND TimeUnix > now() - INTERVAL 1 HOUR
GROUP BY status;
```

## Also Sending to OneUptime

You might want ClickHouse for long-term analytics and OneUptime for real-time dashboards and alerts:

```yaml
exporters:
  clickhouse:
    endpoint: "tcp://clickhouse.database.svc:9000"
    database: "otel"

  otlphttp/oneuptime:
    endpoint: "https://oneuptime.com/otlp"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [memory_limiter, batch]
      exporters: [clickhouse, otlphttp/oneuptime]
```

## Wrapping Up

The Prometheus receiver in the OpenTelemetry Collector is a drop-in replacement for Prometheus scraping. It lets you keep all your existing Prometheus exporters while gaining the ability to route metrics to ClickHouse, OTLP backends, or any other destination. This is often the easiest migration path for teams moving from a Prometheus-centric stack to a more flexible observability platform.
