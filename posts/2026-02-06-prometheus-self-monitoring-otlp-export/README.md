# How to Configure the Collector to Scrape Prometheus Self-Monitoring Metrics and Export Them via OTLP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prometheus, OTLP Export, Self-Monitoring

Description: Configure the OpenTelemetry Collector to scrape Prometheus self-monitoring metrics and convert them to OTLP format for export to any backend.

Prometheus stores its own health metrics internally, but exporting them via OTLP opens up the possibility of sending them to non-Prometheus backends. This is useful when you want to consolidate all observability data into a single platform like an OTLP-native backend. The OpenTelemetry Collector bridges this gap by scraping Prometheus metrics and exporting them in OTLP format.

## The Prometheus-to-OTLP Pipeline

The pipeline is straightforward:

```
Prometheus /metrics -> Collector (Prometheus Receiver) -> OTLP Exporter -> Your Backend
```

The Collector handles the conversion from Prometheus exposition format to OTLP metric data model, including proper type mapping (counters, gauges, histograms, summaries).

## Complete Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  prometheus/self-monitor:
    config:
      scrape_configs:
        - job_name: "prometheus-self"
          scrape_interval: 30s
          honor_timestamps: true
          static_configs:
            - targets: ["prometheus:9090"]
          metrics_path: /metrics

processors:
  batch:
    timeout: 15s
    send_batch_size: 1000

  # Filter to only keep the metrics we care about
  filter/prometheus:
    metrics:
      include:
        match_type: regexp
        metric_names:
          - "prometheus_.*"
          - "process_.*"
          - "go_.*"
          - "scrape_.*"
          - "net_conntrack_.*"

  # Convert Prometheus metric names to a more standard format
  metricstransform:
    transforms:
      - include: prometheus_tsdb_head_series
        action: update
        new_name: prometheus.tsdb.head.series
      - include: prometheus_tsdb_compactions_total
        action: update
        new_name: prometheus.tsdb.compactions.total
      - include: prometheus_engine_query_duration_seconds
        action: update
        new_name: prometheus.engine.query.duration
      - include: process_resident_memory_bytes
        action: update
        new_name: prometheus.process.memory.resident

  resource:
    attributes:
      - key: service.name
        value: prometheus
        action: upsert
      - key: service.namespace
        value: monitoring
        action: upsert

exporters:
  otlp:
    endpoint: "your-otlp-backend:4317"
    tls:
      insecure: false
    headers:
      Authorization: "Bearer your-api-key"

  # Optional: also log metrics for debugging
  logging:
    loglevel: info

service:
  pipelines:
    metrics:
      receivers: [prometheus/self-monitor]
      processors: [filter/prometheus, metricstransform, resource, batch]
      exporters: [otlp]
```

## Type Mapping Between Prometheus and OTLP

The Collector handles type conversion automatically:

| Prometheus Type | OTLP Type |
|----------------|-----------|
| Counter | Sum (monotonic, cumulative) |
| Gauge | Gauge |
| Histogram | Histogram |
| Summary | Summary |
| Untyped | Gauge |

One thing to be aware of: Prometheus counters with the `_total` suffix get the suffix stripped in OTLP. So `prometheus_tsdb_compactions_total` becomes `prometheus_tsdb_compactions` in OTLP unless you use the metricstransform processor to rename it.

## Scraping Multiple Prometheus Instances

If you run Prometheus in HA mode with multiple replicas:

```yaml
receivers:
  prometheus/self-monitor:
    config:
      scrape_configs:
        - job_name: "prometheus-cluster"
          scrape_interval: 30s
          static_configs:
            - targets:
                - "prometheus-0:9090"
                - "prometheus-1:9090"
              labels:
                cluster: "production"
          relabel_configs:
            # Add instance label based on the target
            - source_labels: [__address__]
              target_label: instance
```

## Handling Metric Staleness

Prometheus uses a staleness mechanism where metrics disappear 5 minutes after the last scrape. The Collector handles this by tracking the last seen value. Configure the staleness timeout:

```yaml
receivers:
  prometheus/self-monitor:
    config:
      scrape_configs:
        - job_name: "prometheus-self"
          scrape_interval: 30s
          # Mark stale after missing 3 scrapes
          scrape_timeout: 10s
```

## Monitoring the Collector Pipeline

Monitor the Collector itself to ensure the pipeline is healthy:

```yaml
receivers:
  prometheus/self-monitor:
    config:
      scrape_configs:
        - job_name: "prometheus-self"
          static_configs:
            - targets: ["prometheus:9090"]

  # Also monitor the Collector
  prometheus/collector-self:
    config:
      scrape_configs:
        - job_name: "otel-collector"
          scrape_interval: 15s
          static_configs:
            - targets: ["localhost:8888"]

service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888

  pipelines:
    metrics/prometheus:
      receivers: [prometheus/self-monitor]
      processors: [filter/prometheus, resource, batch]
      exporters: [otlp]
    metrics/collector:
      receivers: [prometheus/collector-self]
      processors: [batch]
      exporters: [otlp]
```

Watch these Collector metrics:
- `otelcol_receiver_accepted_metric_points`: Points successfully received
- `otelcol_receiver_refused_metric_points`: Points rejected
- `otelcol_exporter_sent_metric_points`: Points successfully exported
- `otelcol_exporter_send_failed_metric_points`: Export failures

## Deduplication for HA Prometheus

When running multiple Prometheus replicas that scrape the same targets, you get duplicate metrics. Use the Collector to deduplicate:

```yaml
processors:
  # Use the filter processor to remove duplicates based on instance label
  groupbyattrs:
    keys:
      - instance
      - job
```

## Verifying the Pipeline

Start the pipeline and verify data flows:

```bash
# Start the stack
docker compose up -d

# Check Collector logs
docker logs otel-collector 2>&1 | grep "MetricsExported"

# Verify metrics in your OTLP backend
# Look for prometheus.tsdb.head.series or similar renamed metrics
```

## Summary

Scraping Prometheus self-monitoring metrics with the Collector and exporting via OTLP lets you send Prometheus health data to any OTLP-compatible backend. The Collector handles Prometheus-to-OTLP type conversion automatically. Use the filter processor to keep only relevant metrics, the metricstransform processor to normalize metric names, and the resource processor to tag metrics with service metadata. This provides an independent monitoring path for Prometheus itself.
