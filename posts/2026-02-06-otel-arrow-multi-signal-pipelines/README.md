# How to Set Up OTel Arrow for Multi-Signal Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Multi-Signal, Pipeline

Description: Set up OTel Arrow to transport traces, metrics, and logs on a single Arrow stream for maximum transport efficiency.

Standard OTLP uses separate gRPC service definitions for traces, metrics, and logs. Each signal type gets its own serialization overhead. OTel Arrow provides corresponding Arrow services for traces, metrics, and logs, using Apache Arrow's columnar encoding and stream compression to reduce transport cost. This post shows how to configure Arrow pipelines for all three signals.

## Why Multi-Signal Matters for Compression

Traces, metrics, and logs often repeat the same attribute keys and values: `service.name`, `host.name`, `k8s.pod.name`, `deployment.environment`. OTel Arrow uses columnar Arrow records and dictionary encoding within Arrow streams, so repeated values inside each signal can be encoded compactly.

```text
Standard OTLP/gRPC:
  Traces:  row-oriented protobuf messages
  Metrics: row-oriented protobuf messages
  Logs:    row-oriented protobuf messages

OTel Arrow:
  Traces:  Arrow records with repeated values encoded compactly
  Metrics: Arrow records with repeated values encoded compactly
  Logs:    Arrow records with repeated values encoded compactly
```

The result is better compression for each signal pipeline, especially over long-lived streams and larger batches.

## Configuring Multi-Signal Export

The OTel Arrow exporter supports traces, metrics, and logs. You can use the same exporter component ID in all three pipelines when they go to the same Arrow-capable collector:

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
  # Shared OTel Arrow exporter configuration for all signals
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

All three pipelines reference the same `otelarrow` exporter configuration. The Collector creates signal-specific Arrow exporters and uses the corresponding Arrow service for each signal type.

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
  otlphttp/loki:
    endpoint: http://loki:3100/otlp
    tls:
      insecure: true

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
      exporters: [otlphttp/loki]
```

The `otelarrow` receiver accepts the Arrow trace, metric, and log services and passes each signal type to its configured pipeline and backend.

## How the Multiplexing Works Internally

Each Arrow stream carries Arrow records with schemas that describe the data being transported. OTel Arrow uses signal-specific services, so traces, metrics, and logs are received through their corresponding Arrow service and then decoded back into Collector pdata.

```text
Arrow trace stream:
  Batch 1: [spans schema]   -> 500 spans
  Batch 2: [spans schema]   -> 450 spans

Arrow metrics stream:
  Batch 1: [metrics schema] -> 1000 data points

Arrow logs stream:
  Batch 1: [logs schema]    -> 800 log records
```

Batches are sent based on which signal pipelines have data ready. High-throughput signals often produce more Arrow batches than lower-throughput signals.

## Stream Allocation Strategy

With `num_streams: 4`, each signal-specific Arrow exporter can use four concurrent Arrow streams. When `num_streams` is greater than one, the exporter uses its prioritizer policy to distribute load across streams.

If you want more parallelism for a high-volume signal like metrics, configure a separate exporter for that signal and give it a higher stream count:

```yaml
exporters:
  otelarrow/metrics:
    endpoint: gateway:4317
    arrow:
      num_streams: 6  # More streams give better parallelism
      max_stream_lifetime: 10m
```

Increasing `num_streams` gives that exporter more concurrent Arrow streams. Separate exporters also let you tune traces, metrics, and logs independently.

## Monitoring Multi-Signal Streams

Track how each signal type flows through the Arrow streams:

```promql
# Spans exported via Arrow

rate(otelcol_exporter_sent_spans{exporter="otelarrow"}[5m])

# Metric data points exported via Arrow
rate(otelcol_exporter_sent_metric_points{exporter="otelarrow"}[5m])

# Log records exported via Arrow
rate(otelcol_exporter_sent_log_records{exporter="otelarrow"}[5m])

# Compression ratio from OTel Arrow network metrics
rate(otelcol_exporter_sent{exporter="otelarrow"}[5m])
/
rate(otelcol_exporter_sent_wire{exporter="otelarrow"}[5m])
```

The `otelcol_exporter_sent` metric reports uncompressed bytes before compression, and `otelcol_exporter_sent_wire` reports compressed bytes on the wire.

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

For most deployments where all signals go to the same gateway, reusing one exporter configuration is simpler to maintain. Use separate exporters when you need different destinations, queues, retry behavior, or stream counts per signal.
