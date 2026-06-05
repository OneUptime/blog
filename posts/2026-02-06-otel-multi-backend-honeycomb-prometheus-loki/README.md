# How to Configure Multi-Backend Export from a Single Collector to Honeycomb,

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Honeycomb, Prometheus, Loki

Description: Set up a single OpenTelemetry Collector instance that exports traces to Honeycomb, metrics to Prometheus, and logs to Loki simultaneously.

One of the strongest features of the OpenTelemetry Collector is its ability to route telemetry data to multiple backends from a single Collector configuration. Instead of running separate collection agents for each backend, you configure one Collector with multiple signal-specific pipelines and exporters. This post walks through a production-ready setup that sends traces to Honeycomb, metrics to Prometheus (via remote write), and logs to Loki's native OTLP endpoint.

## Architecture Overview

Your applications send all telemetry (traces, metrics, logs) to the Collector via OTLP. The Collector then routes each signal type to the appropriate backend:

- Traces go to Honeycomb via the OTLP exporter
- Metrics go to Prometheus via the Prometheus remote write exporter
- Logs go to Loki via the OTLP HTTP exporter

## Full Collector Configuration

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Scrape Prometheus metrics from your apps
  prometheus:
    config:
      scrape_configs:
        - job_name: 'app-metrics'
          scrape_interval: 15s
          static_configs:
            - targets: ['app-server:9090']

processors:
  # Shared processors
  memory_limiter:
    check_interval: 5s
    limit_mib: 1024
    spike_limit_mib: 256

  resource:
    attributes:
      - key: service.name
        value: "my-app"
        action: upsert
      - key: deployment.environment
        value: "production"
        action: upsert

  # Separate batch processors per signal for tuning
  batch/traces:
    send_batch_size: 512
    timeout: 5s

  batch/metrics:
    send_batch_size: 1024
    timeout: 15s

  batch/logs:
    send_batch_size: 2048
    timeout: 10s

exporters:
  # Traces to Honeycomb via OTLP
  otlp/honeycomb:
    endpoint: api.honeycomb.io:443
    headers:
      x-honeycomb-team: "${HONEYCOMB_API_KEY}"
      x-honeycomb-dataset: "production-traces"
    compression: gzip

  # Metrics to Prometheus via remote write
  prometheus_remote_write:
    endpoint: "http://prometheus-server:9090/api/v1/write"
    tls:
      insecure: true
    resource_to_telemetry_conversion:
      enabled: true
    # Add external labels for Prometheus
    external_labels:
      cluster: "production-us-east"

  # Logs to Loki via its native OTLP endpoint
  otlphttp/loki:
    endpoint: "http://loki-gateway:3100/otlp"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch/traces]
      exporters: [otlp/honeycomb]

    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, resource, batch/metrics]
      exporters: [prometheus_remote_write]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch/logs]
      exporters: [otlphttp/loki]
```

## Per-Signal Batch Tuning

Each backend has different performance characteristics, so separate batch processors let you tune independently:

```yaml
# Traces: smaller batches, faster flush for low-latency delivery

batch/traces:
  send_batch_size: 512
  timeout: 5s

# Metrics: larger batches are fine since metrics are already aggregated
batch/metrics:
  send_batch_size: 1024
  timeout: 15s

# Logs: largest batches since log volume is typically highest
batch/logs:
  send_batch_size: 2048
  timeout: 10s
```

## Honeycomb Exporter Details

Honeycomb uses standard OTLP ingestion. The key headers are:

```yaml
otlp/honeycomb:
  endpoint: api.honeycomb.io:443
  headers:
    x-honeycomb-team: "${HONEYCOMB_API_KEY}"
    # Dataset is optional for environments mode
    x-honeycomb-dataset: "production-traces"
```

If you are using Honeycomb's Environments feature (recommended), you can omit the dataset header. All traces will land in the environment associated with your API key.

## Prometheus Remote Write Configuration

The Prometheus remote write exporter converts OTLP metrics to Prometheus format:

```yaml
prometheus_remote_write:
  endpoint: "http://prometheus-server:9090/api/v1/write"
  resource_to_telemetry_conversion:
    enabled: true
```

Make sure the receiving Prometheus server is started with `--web.enable-remote-write-receiver`; otherwise `/api/v1/write` will reject remote write requests.

The `resource_to_telemetry_conversion` setting is important. When enabled, it converts resource attributes (like `service.name`) into metric labels. Without it, those attributes are exposed through the generated `target_info` metric instead of being copied onto every time series.

## Loki OTLP Label Mapping

Loki indexes logs by labels, so choosing the right label mapping is critical for query performance. When using Loki's native OTLP endpoint, send logs with the OTLP HTTP exporter and configure index-label mapping in Loki's OTLP settings:

```yaml
otlphttp/loki:
  endpoint: "http://loki-gateway:3100/otlp"
  tls:
    insecure: true

# In loki.yaml
limits_config:
  otlp_config:
    resource_attributes:
      attributes_config:
        - action: index_label
          attributes:
            - service.name
            - deployment.environment
            - k8s.namespace.name
```

Keep the label count low (around 10-15 labels at most) to avoid high cardinality issues in Loki. Put high-cardinality data like request IDs in structured metadata or the log body, not in index labels.

## Adding Redundancy with Failover

For critical data, you can add failover exporters:

```yaml
exporters:
  otlp/honeycomb:
    endpoint: api.honeycomb.io:443
    headers:
      x-honeycomb-team: "${HONEYCOMB_API_KEY}"
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 60s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000
```

The sending queue buffers data in memory during temporary backend outages, and the retry logic handles transient failures.

## Monitoring the Collector Itself

When exporting to multiple backends, the Collector becomes a critical piece of infrastructure. Monitor it:

```yaml
service:
  telemetry:
    metrics:
      level: detailed
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
                without_type_suffix: true
                without_units: true
```

Scrape `http://collector:8888/metrics` with Prometheus and alert on:

- `otelcol_exporter_send_failed_spans` increasing
- `otelcol_processor_dropped_spans` above zero
- `otelcol_exporter_queue_size` approaching `queue_capacity`

This multi-backend setup gives you the best of each platform: Honeycomb's trace exploration, Prometheus's metric alerting, and Loki's log aggregation, all from a single Collector instance.
