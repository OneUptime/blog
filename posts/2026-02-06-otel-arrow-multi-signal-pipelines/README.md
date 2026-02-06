# How to Set Up OTel Arrow for Multi-Signal Pipelines (Traces, Metrics, and Logs on a Single Arrow Stream)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Multi-Signal, Pipelines

Description: Set up OTel Arrow to transport traces, metrics, and logs on a single Arrow stream for maximum transport efficiency.

Standard OTLP uses separate gRPC service definitions for traces, metrics, and logs. Each signal type gets its own connection and its own serialization overhead. OTel Arrow can multiplex all three signal types over a single set of Arrow streams, which improves compression efficiency and reduces the number of connections your agents need to maintain. This post shows how to configure multi-signal Arrow pipelines.

## Why Multi-Signal Matters for Compression

When traces, metrics, and logs flow over separate streams, each stream builds its own dictionary. But these signals share many of the same attribute values: `service.name`, `host.name`, `k8s.pod.name`, `deployment.environment`. When all signals share a single dictionary, common values are encoded once and referenced by all three signal types.

```
Separate streams:
  Traces dictionary:  {service.name, http.method, http.url, ...}
  Metrics dictionary:  {service.name, metric.name, k8s.pod.name, ...}
  Logs dictionary:     {service.name, severity, log.source, ...}
  Total unique entries: ~150

Shared stream:
  Combined dictionary: {service.name, http.method, metric.name, severity, ...}
  Total unique entries: ~100 (shared values counted once)
```

The dictionary is smaller, compression is better, and you use fewer connections.

## Configuring Multi-Signal Export

The OTel Arrow exporter handles multi-signal transport by default when all pipelines point to the same exporter instance:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 512

  batch:
    timeout: 5s
    send_batch_size: 1000

exporters:
  # Single OTel Arrow exporter instance for all signals
  otelarrow:
    endpoint: gateway:4317
    tls:
      insecure: true
    compression: zstd
    arrow:
      num_streams: 4
      max_stream_lifetime: 10m

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otelarrow]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otelarrow]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otelarrow]
```

All three pipelines reference the same `otelarrow` exporter. The exporter multiplexes the three signal types over its Arrow streams.

## Receiver Configuration

The receiver side mirrors this pattern:

```yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        arrow:
          memory_limit_mib: 256

processors:
  batch:
    timeout: 10s

exporters:
  otlp/traces:
    endpoint: tempo:4317
    tls:
      insecure: true
  prometheusremotewrite:
    endpoint: http://mimir:9009/api/v1/push
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otelarrow]
      processors: [batch]
      exporters: [otlp/traces]
    metrics:
      receivers: [otelarrow]
      processors: [batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otelarrow]
      processors: [batch]
      exporters: [loki]
```

The `otelarrow` receiver demultiplexes the incoming Arrow stream and routes each signal type to its appropriate pipeline and backend.

## How the Multiplexing Works Internally

Each Arrow batch includes a schema that describes its contents. The schema contains metadata indicating the signal type (traces, metrics, or logs). The receiver reads this metadata and routes the decoded records to the correct pipeline.

```
Arrow Stream:
  Batch 1: [traces schema]  -> 500 spans
  Batch 2: [metrics schema] -> 1000 data points
  Batch 3: [logs schema]    -> 800 log records
  Batch 4: [traces schema]  -> 450 spans
  ...
```

The batches interleave naturally based on which signal type has data ready to send. High-throughput signals (often metrics) get more batches, while lower-throughput signals (traces) get fewer.

## Stream Allocation Strategy

With `num_streams: 4` and three signal types, the exporter does not dedicate specific streams to specific signals. Instead, all four streams are available to all signal types. The exporter picks the next available stream for each batch, regardless of signal type.

If you want to ensure that a high-volume signal (like metrics) does not starve lower-volume signals:

```yaml
exporters:
  otelarrow:
    endpoint: gateway:4317
    arrow:
      num_streams: 6  # More streams give better parallelism
      max_stream_lifetime: 10m
```

Increasing `num_streams` reduces contention between signals competing for stream access.

## Monitoring Multi-Signal Streams

Track how each signal type flows through the Arrow streams:

```promql
# Spans exported via Arrow
rate(otelcol_exporter_sent_spans{exporter="otelarrow"}[5m])

# Metric data points exported via Arrow
rate(otelcol_exporter_sent_metric_points{exporter="otelarrow"}[5m])

# Log records exported via Arrow
rate(otelcol_exporter_sent_log_records{exporter="otelarrow"}[5m])

# Overall compression ratio (all signals combined)
otelcol_exporter_otelarrow_compression_ratio
```

The combined compression ratio should be slightly better than individual signal ratios because of the shared dictionary.

## When to Use Separate Exporters Instead

There are cases where separate exporters per signal make more sense:

1. **Different destinations**: If traces go to one region and metrics go to another, you need separate exporters with different endpoints.
2. **Different reliability requirements**: If you want metrics to have a larger retry queue than traces, separate exporters give you independent configuration.
3. **Troubleshooting**: If one signal type is causing errors, isolating it to its own exporter makes it easier to debug.

```yaml
# Separate exporters for different destinations
exporters:
  otelarrow/traces:
    endpoint: traces-gateway:4317
    arrow:
      num_streams: 2
  otelarrow/metrics:
    endpoint: metrics-gateway:4317
    arrow:
      num_streams: 4
  otelarrow/logs:
    endpoint: logs-gateway:4317
    arrow:
      num_streams: 2
```

For most deployments where all signals go to the same gateway, a single multi-signal exporter is simpler and more efficient. You get better compression from the shared dictionary, fewer connections to manage, and a simpler configuration to maintain.
