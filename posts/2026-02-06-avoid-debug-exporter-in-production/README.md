# How to Avoid the Anti-Pattern of Using the Debug Exporter in Production and Crashing Your Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Production, Best Practices

Description: Learn why the OpenTelemetry debug exporter should never be used in production and how it can crash your Collector under load.

The debug exporter (previously called the logging exporter) is one of the first things you set up when getting started with the OpenTelemetry Collector. It prints every telemetry item to stdout, which is incredibly useful for development. However, leaving it enabled in production is a recipe for disaster. It can fill up disk space, increase CPU usage, and ultimately crash your Collector.

## What the Debug Exporter Does

The debug exporter serializes every span, metric data point, and log record into a human-readable format and writes it to the Collector's stdout. Here is a typical config that includes it:

```yaml
exporters:
  debug:
    verbosity: detailed
  otlp:
    endpoint: "https://your-backend:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug, otlp]  # Both exporters in the pipeline
```

In development, where you might see a few dozen spans per minute, this is fine. In production, a busy service can generate thousands of spans per second. Each one gets formatted as a multi-line string and written to stdout.

## The Failure Modes

### Disk Space Exhaustion

If your Collector's stdout is captured by a logging system (systemd journal, Docker logs, Kubernetes container logs), every span becomes a log entry. A service doing 1,000 requests per second with 5 spans per request generates 5,000 log entries per second. At roughly 500 bytes per entry, that is 2.5 MB per second, or 216 GB per day, just from debug output.

### CPU Overhead

Serializing telemetry data to a human-readable string is significantly more expensive than serializing it to protobuf for OTLP export. The debug exporter can consume 2-3x more CPU than the actual OTLP exporter for the same data.

### Memory Pressure

The debug exporter creates temporary string objects for every telemetry item. Under high throughput, this creates garbage collection pressure that compounds with the Collector's normal memory usage.

## The Fix

Remove the debug exporter from your production pipeline entirely:

```yaml
# production-config.yaml
exporters:
  otlp:
    endpoint: "https://your-backend:4317"
    sending_queue:
      enabled: true
      queue_size: 5000
    retry_on_failure:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]  # Only the OTLP exporter
```

## Using Environment-Specific Configs

A better approach is to maintain separate Collector configs for each environment:

```bash
# Directory structure
collector-config/
  base.yaml        # Shared receivers, processors
  dev.yaml         # Includes debug exporter
  production.yaml  # No debug exporter, with resource limits
```

```yaml
# dev.yaml
exporters:
  debug:
    verbosity: detailed
  otlp:
    endpoint: "http://localhost:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug, otlp]
```

```yaml
# production.yaml
exporters:
  otlp:
    endpoint: "https://your-backend:4317"
    sending_queue:
      enabled: true
      queue_size: 10000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

## If You Need Debug Output in Production

Sometimes you need to troubleshoot a production Collector. Instead of enabling the debug exporter, use these approaches:

### 1. Use the zpages Extension

The zpages extension provides a web UI showing the Collector's internal state without writing to stdout:

```yaml
extensions:
  zpages:
    endpoint: "localhost:55679"

service:
  extensions: [zpages]
```

Visit `http://localhost:55679/debug/tracez` to see recent spans.

### 2. Temporarily Enable Debug with Sampling

If you must use the debug exporter temporarily, add a probabilistic sampler to reduce the volume:

```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 0.1  # Only 0.1% of traces

service:
  pipelines:
    debug-traces:
      receivers: [otlp]
      processors: [probabilistic_sampler]
      exporters: [debug]
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

### 3. Check Collector Metrics

The Collector exposes Prometheus metrics about its own operation. These tell you if data is being received and exported without needing to log every item:

```yaml
service:
  telemetry:
    metrics:
      address: ":8888"
```

Then query metrics like `otelcol_exporter_sent_spans` and `otelcol_receiver_accepted_spans` to verify data flow.

## Summary

The debug exporter is a development tool, not a production tool. Remove it from your production Collector config, use separate configs per environment, and rely on the Collector's built-in metrics and zpages extension for production troubleshooting. Your Collector will be more stable and use fewer resources as a result.
