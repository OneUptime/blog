# How to Configure the OpenTelemetry Collector to Receive and Forward Profiling Data via OTLP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Profiling, OTLP

Description: Configure the OpenTelemetry Collector to receive profiling data from agents and applications via OTLP and forward it to your profiling backend.

OpenTelemetry's profiling signal is the newest addition to the observability trifecta (now quartet) of traces, metrics, logs, and profiles. The Collector can receive, process, and export profiling data just like it handles the other signal types. This post walks through configuring the Collector to act as a profiling data pipeline.

## Understanding the Profiling Data Flow

Profiling data enters the Collector through the OTLP receiver, just like traces and metrics. The data flow looks like this:

```
Application/Agent  -->  OTLP Receiver  -->  Processors  -->  OTLP Exporter  -->  Backend
```

Profile data follows the OpenTelemetry profile data model, which represents profiling samples as structured data including stack traces, values (CPU time, allocations, etc.), and metadata. The data uses the same OTLP protocol, making it compatible with existing infrastructure.

## Basic Collector Configuration for Profiles

Here is a minimal collector configuration that receives and forwards profiling data:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 256
    send_batch_max_size: 512

exporters:
  otlp/profiles:
    endpoint: profiling-backend.internal:4317
    tls:
      insecure: false
      ca_file: /etc/otel/tls/ca.pem
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/profiles]
```

## Full Multi-Signal Configuration

In practice, your collector handles all signal types. Here is a complete configuration:

```yaml
# collector-config.yaml - full multi-signal setup
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Separate batch processors for each signal type
  # because profiles tend to be larger and less frequent
  batch/traces:
    timeout: 5s
    send_batch_size: 512

  batch/metrics:
    timeout: 10s
    send_batch_size: 1024

  batch/logs:
    timeout: 5s
    send_batch_size: 512

  batch/profiles:
    timeout: 15s
    send_batch_size: 128

  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 5s
    limit_mib: 1024
    spike_limit_mib: 256

  # Add resource attributes to all signals
  resource:
    attributes:
      - key: collector.instance
        value: "${HOSTNAME}"
        action: upsert
      - key: deployment.environment
        value: "production"
        action: upsert

exporters:
  otlp/traces:
    endpoint: tracing-backend.internal:4317
    tls:
      insecure: false

  otlp/metrics:
    endpoint: metrics-backend.internal:4317
    tls:
      insecure: false

  otlp/logs:
    endpoint: logs-backend.internal:4317
    tls:
      insecure: false

  otlp/profiles:
    endpoint: profiling-backend.internal:4317
    tls:
      insecure: false

extensions:
  health_check:
    endpoint: 0.0.0.0:13133

  zpages:
    endpoint: 0.0.0.0:55679

service:
  extensions: [health_check, zpages]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch/traces]
      exporters: [otlp/traces]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch/metrics]
      exporters: [otlp/metrics]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch/logs]
      exporters: [otlp/logs]
    profiles:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch/profiles]
      exporters: [otlp/profiles]
```

## Configuring Profile-Specific Processing

Profile data has unique characteristics compared to other signals. Profiles are larger (they contain full stack traces) and arrive in bursts (profiling agents typically batch and send every 30-60 seconds).

Tune the batch processor for profiles:

```yaml
processors:
  batch/profiles:
    # Longer timeout because profiles arrive less frequently
    timeout: 15s
    # Smaller batch size because each profile is larger
    send_batch_size: 128
    # Cap the maximum batch size to control memory
    send_batch_max_size: 256
```

## Sending Profiles to Multiple Backends

You might want to send profiles to both a dedicated profiling backend and a general-purpose observability platform:

```yaml
exporters:
  otlp/pyroscope:
    endpoint: pyroscope.internal:4317
    tls:
      insecure: false

  otlphttp/oneuptime:
    endpoint: https://otlp.oneuptime.com
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch/profiles]
      exporters: [otlp/pyroscope, otlphttp/oneuptime]
```

## Filtering Profile Data

Not all profile data is equally valuable. You might want to filter out low-value profiles or limit profiling to specific services:

```yaml
processors:
  filter/profiles:
    profiles:
      # Only forward profiles from specific services
      include:
        match_type: regexp
        resource_attributes:
          - key: service.name
            value: "^(payment|checkout|inventory)-service$"

  # Alternatively, drop profiles from noisy internal services
  filter/drop_internal:
    profiles:
      exclude:
        match_type: strict
        resource_attributes:
          - key: service.name
            value: "health-checker"

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [memory_limiter, filter/profiles, batch/profiles]
      exporters: [otlp/profiles]
```

## Gateway Pattern for Profile Collection

In larger environments, use a two-tier collector architecture. Edge collectors aggregate profiles from local agents and forward them to a central gateway:

```yaml
# Edge collector (runs on each host)
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 127.0.0.1:4317

exporters:
  otlp/gateway:
    endpoint: collector-gateway.internal:4317
    compression: zstd
    sending_queue:
      enabled: true
      num_consumers: 4
      queue_size: 1000

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [batch/profiles]
      exporters: [otlp/gateway]
```

```yaml
# Gateway collector (central)
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 32

processors:
  batch/profiles:
    timeout: 15s
    send_batch_size: 256

exporters:
  otlp/backend:
    endpoint: profiling-backend.internal:4317

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [memory_limiter, batch/profiles]
      exporters: [otlp/backend]
```

## Verifying Profile Data Flow

Check that profiles are flowing through the collector using the zpages extension:

```bash
# View pipeline status
curl http://localhost:55679/debug/pipelinez

# View trace-level details of processed data
curl http://localhost:55679/debug/tracez
```

Also check the collector's own metrics:

```bash
# Check profile-specific metrics on the collector's metrics endpoint
curl -s http://localhost:8888/metrics | grep profile

# You should see metrics like:
# otelcol_receiver_accepted_profiles
# otelcol_exporter_sent_profiles
# otelcol_processor_batch_batch_send_size_profiles
```

The Collector's profile pipeline works just like traces, metrics, and logs. Once you have it set up, profiling data flows through the same infrastructure, benefits from the same processing capabilities, and follows the same operational patterns you already know.
