# How to Configure the OpenTelemetry Collector to Receive

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Profiling, OTLP

Description: Configure the OpenTelemetry Collector to receive profiling data from agents and applications via OTLP and forward it to your profiling backend.

OpenTelemetry's profiling signal is the newest addition to the observability trifecta (now quartet) of traces, metrics, logs, and profiles. The Collector can receive, process, and export profiling data with profile-aware components, but profile support is still alpha and requires the `service.profilesSupport` feature gate. This post walks through configuring the Collector to act as a profiling data pipeline.

## Understanding the Profiling Data Flow

Profiling data enters the Collector through the OTLP receiver, just like traces and metrics. The data flow looks like this:

```text
Application/Agent  -->  OTLP Receiver  -->  Processors  -->  OTLP Exporter  -->  Backend
```

Profile data follows the OpenTelemetry profile data model, which represents profiling samples as structured data including stack traces, values (CPU time, allocations, etc.), and metadata. The data uses the same OTLP protocol, making it compatible with existing infrastructure.

## Basic Collector Configuration for Profiles

Here is a minimal collector configuration that receives and forwards profiling data:

Start the Collector with profile support enabled:

```bash
otelcol-contrib --feature-gates=service.profilesSupport --config=collector-config.yaml
```

```yaml
# collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

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
  # Separate batch processors for the stable signals.
  # The batch processor does not currently support profiles.
  batch/traces:
    timeout: 5s
    send_batch_size: 512

  batch/metrics:
    timeout: 10s
    send_batch_size: 1024

  batch/logs:
    timeout: 5s
    send_batch_size: 512

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
      processors: [memory_limiter, resource]
      exporters: [otlp/profiles]
```

## Configuring Profile-Specific Processing

Profile data has unique characteristics compared to other signals. Profiles are larger (they contain full stack traces) and arrive in bursts (profiling agents typically batch and send every 30-60 seconds).

Use profile-aware processors to protect memory and drop profile payloads you do not want to forward:

```yaml
processors:
  memory_limiter/profiles:
    check_interval: 5s
    limit_mib: 1024
    spike_limit_mib: 256

  filter/drop_short_profiles:
    error_mode: ignore
    profile_conditions:
      - profile.duration_unix_nano < 10000000000
```

## Sending Profiles to Multiple Backends

You might want to send profiles to both a dedicated profiling backend and a general-purpose observability platform:

```yaml
exporters:
  otlp/pyroscope:
    endpoint: pyroscope.internal:4040
    tls:
      insecure: true

  otlphttp/oneuptime:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      Content-Type: application/json
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [memory_limiter, resource]
      exporters: [otlp/pyroscope, otlphttp/oneuptime]
```

## Filtering Profile Data

Not all profile data is equally valuable. You might want to filter out low-value profiles or limit profiling to specific services:

```yaml
processors:
  filter/profiles:
    error_mode: ignore
    profile_conditions:
      # Drop profiles unless they come from specific services
      - resource.attributes["service.name"] == nil or not IsMatch(resource.attributes["service.name"], "^(payment|checkout|inventory)-service$")

  # Alternatively, drop profiles from noisy internal services
  filter/drop_internal:
    error_mode: ignore
    profile_conditions:
      - resource.attributes["service.name"] == "health-checker"

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [memory_limiter, filter/profiles]
      exporters: [otlp/profiles]
```

## Gateway Pattern for Profile Collection

In larger environments, use a two-tier collector architecture. Edge collectors receive profiles from local agents and forward them to a central gateway:

```yaml
# Edge collector (runs on each host)
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 127.0.0.1:4317

processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 512

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
      processors: [memory_limiter]
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
  memory_limiter:
    check_interval: 5s
    limit_mib: 2048
    spike_limit_mib: 512

exporters:
  otlp/backend:
    endpoint: profiling-backend.internal:4317

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [memory_limiter]
      exporters: [otlp/backend]
```

## Verifying Profile Data Flow

Check that profiles are flowing through the collector using the zpages extension:

```bash
# View pipeline status
curl http://localhost:55679/debug/pipelinez

# View trace-level details for trace operations
curl http://localhost:55679/debug/tracez
```

Also check the collector's own metrics:

```bash
# Check for profile-related metrics on the collector's metrics endpoint
curl -s http://localhost:8888/metrics | grep -E 'profile|profiles'

# Exact metric names vary by Collector version and enabled components.
# Look for receiver/exporter accepted, refused, sent, or failed counts
# associated with the profiles data type.
```

The Collector's profile pipeline uses the same receiver-pipeline-exporter model as traces, metrics, and logs, with alpha-stage caveats around component support. Once you have it set up with profile-aware components, profiling data flows through the same infrastructure and follows the same operational patterns you already know.
