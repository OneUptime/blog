# How to Build a Collector Pipeline That Converts Incoming Prometheus Metrics to OTLP and Routes to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prometheus, OTLP, ClickHouse, Metrics Conversion

Description: Build an OpenTelemetry Collector pipeline that scrapes Prometheus metrics, converts them to OTLP format, and routes them to ClickHouse for storage.

Many teams have existing Prometheus exporters and do not want to rewrite them. The OpenTelemetry Collector can scrape these Prometheus endpoints, convert the metrics to OTLP format, and send them to ClickHouse or any other backend. You keep your existing Prometheus instrumentation and gain the flexibility of the OTLP ecosystem.

## The Pipeline

```
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
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
              action: replace
              target_label: __address__
              regex: (.+)
              replacement: "${1}:${2}"
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

  # Convert resource attributes from Prometheus format to OTLP conventions
  transform/prom_to_otlp:
    metric_statements:
      - context: resource
        statements:
          # Map Prometheus job label to OTLP service.name
          - set(attributes["service.name"], attributes["job"])
            where attributes["job"] != nil
          # Map instance to service.instance.id
          - set(attributes["service.instance.id"], attributes["instance"])
            where attributes["instance"] != nil

  batch:
    send_batch_size: 1024
    timeout: 10s

exporters:
  clickhouse:
    endpoint: "tcp://clickhouse.database.svc:9000"
    database: "otel"
    username: "otel_writer"
    password: "${CLICKHOUSE_PASSWORD}"
    ttl_days: 90
    # Table creation settings
    create_schema: true
    metrics_table_name: "otel_metrics"
    # Compression for efficient storage
    compress: lz4

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [memory_limiter, transform/prom_to_otlp, batch]
      exporters: [clickhouse]
```

## Handling Prometheus Metric Types

Prometheus has counters, gauges, histograms, and summaries. The collector converts them to OTLP equivalents:

| Prometheus | OTLP |
|-----------|------|
| Counter | Sum (monotonic) |
| Gauge | Gauge |
| Histogram | ExponentialHistogram or Histogram |
| Summary | Summary |

For histograms, you might want to control the conversion:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "app"
          scrape_interval: 15s
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

  # Drop high-cardinality labels that bloat ClickHouse
  metricstransform:
    transforms:
      - include: ".*"
        match_type: regexp
        action: update
        operations:
          - action: delete_label_value
            label: "le"     # Histogram bucket boundaries
          - action: delete_label_value
            label: "quantile"  # Summary quantiles
```

## ClickHouse Schema

The ClickHouse exporter creates tables automatically, but here is what the schema looks like if you want to create it manually:

```sql
-- ClickHouse table for OTLP metrics
CREATE TABLE otel.otel_metrics
(
    ResourceAttributes Map(LowCardinality(String), String),
    ResourceSchemaUrl  LowCardinality(String),
    ScopeName          LowCardinality(String),
    ScopeVersion       LowCardinality(String),
    ScopeAttributes    Map(LowCardinality(String), String),
    MetricName         LowCardinality(String),
    MetricDescription  String,
    MetricUnit         LowCardinality(String),
    Attributes         Map(LowCardinality(String), String),
    StartTimeUnix      DateTime64(9),
    TimeUnix           DateTime64(9),
    Value              Float64,
    Flags              UInt32,
    -- Partitioning for efficient queries
    INDEX idx_metric_name MetricName TYPE bloom_filter GRANULARITY 4,
    INDEX idx_service ResourceAttributes['service.name'] TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toDate(TimeUnix)
ORDER BY (MetricName, ResourceAttributes, TimeUnix)
TTL toDateTime(TimeUnix) + INTERVAL 90 DAY;
```

## Querying the Data

Once metrics are in ClickHouse, you can query them with SQL:

```sql
-- Average request duration by service over the last hour
SELECT
    ResourceAttributes['service.name'] AS service,
    avg(Value) AS avg_duration_seconds
FROM otel.otel_metrics
WHERE MetricName = 'http_request_duration_seconds_sum'
  AND TimeUnix > now() - INTERVAL 1 HOUR
GROUP BY service
ORDER BY avg_duration_seconds DESC;

-- Request rate by status code
SELECT
    Attributes['status_code'] AS status,
    count() / 3600 AS requests_per_second
FROM otel.otel_metrics
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

  otlp/oneuptime:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [memory_limiter, transform/prom_to_otlp, batch]
      exporters: [clickhouse, otlp/oneuptime]
```

## Wrapping Up

The Prometheus receiver in the OpenTelemetry Collector is a drop-in replacement for Prometheus scraping. It lets you keep all your existing Prometheus exporters while gaining the ability to route metrics to ClickHouse, OTLP backends, or any other destination. This is often the easiest migration path for teams moving from a Prometheus-centric stack to a more flexible observability platform.
