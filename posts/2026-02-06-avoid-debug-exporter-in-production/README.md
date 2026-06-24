# How to Avoid the Anti-Pattern of Using the Debug Exporter in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Production, Best Practice

Description: Learn why the OpenTelemetry debug exporter should never be used in production and how it can crash your Collector under load.

The debug exporter (previously called the logging exporter before Collector v0.86.0) is one of the first things you set up when getting started with the OpenTelemetry Collector. It prints telemetry data to the Collector's configured log output, which is incredibly useful for development. However, leaving it enabled in production is a recipe for disaster. It can fill up disk space, increase CPU usage, and ultimately overload your Collector.

## What the Debug Exporter Does

The debug exporter serializes telemetry into a human-readable format and writes it through the Collector's internal logger by default. With `verbosity: detailed`, it outputs all details of every telemetry record, typically as multiple lines per record. Here is a typical config that includes it:

```yaml
receivers:
  otlp:
    protocols:
      grpc:

processors:
  batch:

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

In development, where you might see a few dozen spans per minute, this is fine. In production, a busy service can generate thousands of spans per second. Each one gets formatted into human-readable output and written to the Collector's logs.

## The Failure Modes

### Disk Space Exhaustion

If your Collector's stdout or stderr is captured by a logging system (systemd journal, Docker logs, Kubernetes container logs), detailed debug output can turn every span into multiple log lines. A service doing 1,000 requests per second with 5 spans per request generates 5,000 spans per second. At roughly 500 bytes of debug output per span, that is 2.5 MB per second, or 216 GB per day, just from debug output.

### CPU Overhead

Serializing telemetry data to human-readable strings is extra work on top of normal collection and export. Under load, the debug exporter can consume significant CPU compared with exporting the same data through OTLP.

### Memory Pressure

The debug exporter creates temporary string objects for every telemetry item. Under high throughput, this creates garbage collection pressure that compounds with the Collector's normal memory usage.

## The Fix

Remove the debug exporter from your production pipeline entirely:

```yaml
# production-config.yaml

receivers:
  otlp:
    protocols:
      grpc:

processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 4000
    spike_limit_mib: 500
  batch:

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
receivers:
  otlp:
    protocols:
      grpc:

processors:
  batch:

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
receivers:
  otlp:
    protocols:
      grpc:

processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 4000
    spike_limit_mib: 500
  batch:

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

The zpages extension provides a web UI showing the Collector's internal state without writing telemetry data to the Collector's logs:

```yaml
extensions:
  zpages:
    endpoint: "localhost:55679"

service:
  extensions: [zpages]
```

Visit `http://localhost:55679/debug/tracez` to see recent internal Collector spans and error samples.

### 2. Temporarily Enable Debug with Sampling

If you must use the debug exporter temporarily, add a probabilistic sampler to reduce the volume:

```yaml
receivers:
  otlp:
    protocols:
      grpc:

exporters:
  debug:
    verbosity: detailed
  otlp:
    endpoint: "https://your-backend:4317"

processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 4000
    spike_limit_mib: 500
  probabilistic_sampler:
    sampling_percentage: 0.1  # Only 0.1% of traces
  batch:

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
      readers:
        - pull:
            exporter:
              prometheus:
                host: "0.0.0.0"
                port: 8888
                without_type_suffix: true
                without_units: true
```

Then query metrics like `otelcol_exporter_sent_spans` and `otelcol_receiver_accepted_spans` to verify data flow.

## Summary

The debug exporter is a development tool, not a production tool. Remove it from your production Collector config, use separate configs per environment, and rely on the Collector's built-in metrics and zpages extension for production troubleshooting. Your Collector will be more stable and use fewer resources as a result.
