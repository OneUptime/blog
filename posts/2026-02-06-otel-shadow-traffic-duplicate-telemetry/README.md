# How to Configure Shadow Traffic in the Collector to Duplicate Telemetry to a Test Backend for Evaluation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Shadow Traffic, Collector, Testing, Evaluation

Description: Configure shadow traffic in the OpenTelemetry Collector to duplicate production telemetry to a test backend for safe evaluation and benchmarking.

Shadow traffic is a well-known pattern in load balancing: you send a copy of live requests to a test system that processes them but whose responses get discarded. The same idea applies to observability. You can shadow your production telemetry to a test backend to evaluate its performance, test configuration changes, or validate a new pipeline setup, all without any risk to your production observability.

## Shadow Traffic vs. Fan-Out

Fan-out sends data to multiple backends and you rely on all of them. Shadow traffic is different in intent: one backend is your real system and the other is purely for testing. If the shadow destination fails or gets overloaded, you don't care. This difference affects how you configure queues, retries, and error handling.

## The Configuration

The collector makes this straightforward. You define two exporters with different reliability settings:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  batch/production:
    send_batch_size: 512
    timeout: 5s

  batch/shadow:
    send_batch_size: 1024
    timeout: 15s

exporters:
  # Production exporter - full reliability
  otlp/production:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 60s
      max_elapsed_time: 600s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000

  # Shadow exporter - best effort, minimal resources
  otlp/shadow:
    endpoint: "test-backend.staging.internal:4317"
    tls:
      insecure: true
    retry_on_failure:
      enabled: false  # Don't waste resources retrying shadow traffic
    sending_queue:
      enabled: true
      num_consumers: 2
      queue_size: 500  # Small queue - drop data if behind

service:
  pipelines:
    # Traces go to both production and shadow
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch/production]
      exporters: [otlp/production, otlp/shadow]

    # Metrics go to both as well
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch/production]
      exporters: [otlp/production, otlp/shadow]

    # Logs go to both
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch/production]
      exporters: [otlp/production, otlp/shadow]
```

The critical detail is the shadow exporter's configuration: retries are disabled and the queue is small. If the shadow destination cannot keep up, data gets dropped silently. This prevents the test system from affecting production.

## Tagging Shadow Traffic

It is useful to tag shadow traffic so the test backend knows it is receiving duplicated data:

```yaml
processors:
  # Add a tag to shadow traffic
  attributes/shadow_tag:
    actions:
      - key: telemetry.shadow
        value: "true"
        action: insert
      - key: telemetry.source_env
        value: "production"
        action: insert

service:
  pipelines:
    traces/shadow:
      receivers: [otlp]
      processors: [memory_limiter, attributes/shadow_tag, batch/shadow]
      exporters: [otlp/shadow]
```

## Using Separate Pipelines for Isolation

If you want even more isolation between production and shadow, use separate pipelines with a forward connector:

```yaml
connectors:
  forward:

service:
  pipelines:
    # Main ingestion
    traces/ingress:
      receivers: [otlp]
      processors: [memory_limiter]
      exporters: [forward]

    # Production pipeline - high reliability
    traces/production:
      receivers: [forward]
      processors: [batch/production]
      exporters: [otlp/production]

    # Shadow pipeline - best effort
    traces/shadow:
      receivers: [forward]
      processors: [attributes/shadow_tag, batch/shadow]
      exporters: [otlp/shadow]
```

With this setup, any backpressure from the shadow exporter stays contained within the shadow pipeline and cannot propagate back to the production pipeline.

## Monitoring the Shadow Pipeline

Even though shadow traffic is best-effort, you still want to know how the test backend is performing:

```bash
# Check how many spans the shadow exporter sent vs dropped
curl -s http://localhost:8888/metrics | grep shadow

# Key metrics to watch:
# otelcol_exporter_sent_spans{exporter="otlp/shadow"}
# otelcol_exporter_send_failed_spans{exporter="otlp/shadow"}
# otelcol_exporter_queue_size{exporter="otlp/shadow"}
# otelcol_exporter_queue_capacity{exporter="otlp/shadow"}
```

You can build a simple dashboard that compares these metrics:

```
Shadow Success Rate = sent / (sent + failed) * 100
Shadow Queue Utilization = queue_size / queue_capacity * 100
```

If the shadow success rate drops below 95% or queue utilization stays above 80%, the test backend is struggling and you should investigate before considering it for production use.

## Time-Limited Shadow Traffic

You might not want to run shadow traffic indefinitely. A practical approach is to use a cron job that enables and disables the shadow pipeline:

```bash
#!/bin/bash
# enable-shadow.sh - Swap in the config with shadow enabled
cp /etc/otel/config-with-shadow.yaml /etc/otel/config.yaml

# The collector auto-reloads on config change
echo "Shadow traffic enabled at $(date)"

# Disable after 4 hours
sleep 14400
cp /etc/otel/config-production-only.yaml /etc/otel/config.yaml
echo "Shadow traffic disabled at $(date)"
```

## Wrapping Up

Shadow traffic gives you a safe way to test new backends, validate collector configurations, and benchmark performance using real production data. The key is configuring the shadow exporter as best-effort so it can never impact your production observability. Combined with proper monitoring of the shadow pipeline itself, this pattern removes most of the risk from backend evaluations.
