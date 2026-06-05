# How to Fix the Mistake of Not Adding the memory_limiter Processor as the First

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Memory Management, Pipeline

Description: Prevent Collector OOM crashes by correctly positioning the memory_limiter processor as the first processor in your pipeline.

The OpenTelemetry Collector processes telemetry data through a pipeline of receivers, processors, and exporters. When a traffic spike hits and the Collector cannot export data fast enough, memory usage grows. Without the `memory_limiter` processor in the right position, the Collector crashes with an out-of-memory (OOM) error, and all in-flight telemetry is lost.

## Why Order Matters

Processors run in the order they are listed in the pipeline configuration. If `memory_limiter` is not first, other processors (like `batch`) can consume additional memory before the limiter gets a chance to apply back-pressure.

```yaml
# Bad - memory_limiter runs after batch has already accumulated data

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, memory_limiter]  # Wrong order!
      exporters: [otlp]
```

In this configuration, the batch processor collects spans into batches before the memory limiter checks the Collector's current memory usage. By the time data reaches `memory_limiter`, memory may already have been consumed by earlier processors in the pipeline.

```yaml
# Good - memory_limiter runs first, before data accumulates
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]  # Correct order!
      exporters: [otlp]
```

## Configuring the memory_limiter Processor

```yaml
processors:
  memory_limiter:
    # How often to check memory usage
    check_interval: 1s

    # Hard limit - force garbage collection when memory exceeds this
    limit_mib: 512

    # Soft limit - start refusing data when memory exceeds (limit_mib - spike_limit_mib)
    # This gives a buffer for in-flight data
    spike_limit_mib: 128
```

With these settings:
- At 384 MiB (512 - 128), the processor starts applying back-pressure by returning errors to receivers
- At 512 MiB, the processor additionally forces garbage collection to reduce memory usage
- Every second, it checks current memory usage

## How Back-Pressure Works

When `memory_limiter` detects high memory usage, it returns a non-permanent error to the preceding component in the pipeline. Receivers are expected to retry the same data and may apply back-pressure to their own data sources. For OTLP receivers, that can mean signaling a retryable failure to the sender; whether your application's SDK queues and retries depends on its configuration and limits.

This creates a graceful degradation chain:
1. Collector memory is high
2. `memory_limiter` refuses new data
3. Receiver retries the data and may return an error to the sender
4. Sender queues and retries if it is configured to do so
5. When Collector memory drops, data flows again

Without `memory_limiter`, the chain breaks at step 1: the Collector crashes and all data is lost.

## Complete Production Pipeline Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # First: memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024
    spike_limit_mib: 256

  # Second: batch to reduce export overhead
  batch:
    send_batch_size: 8192
    timeout: 5s
    send_batch_max_size: 16384

exporters:
  otlp:
    endpoint: "https://your-backend:4317"
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
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
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

## Choosing the Right Limits

The `limit_mib` value should be set based on your Collector's total available memory, leaving room for the Go runtime overhead. In containerized environments, consider using `limit_percentage` so the Collector can derive the limit from the container's available memory:

```text
limit_mib = (total_container_memory * 0.8) - go_runtime_overhead

# Example: 2 GiB container
# limit_mib = (2048 * 0.8) - 100 = ~1536 MiB
# spike_limit_mib = limit_mib * 0.25 = ~384 MiB
```

For a Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: collector
          resources:
            requests:
              memory: "1Gi"
            limits:
              memory: "2Gi"  # Container limit
```

The `memory_limiter` should be set below the container limit to prevent the OOM killer from intervening.

## Monitoring the memory_limiter

The Collector exposes metrics about the memory limiter's behavior:

```bash
# Number of times data was refused due to memory pressure
otelcol_processor_refused_spans
otelcol_processor_refused_metric_points
otelcol_processor_refused_log_records
```

If these metrics are increasing for the `memory_limiter` processor, your Collector is under memory pressure and you should either increase its resources or reduce the incoming telemetry volume. Prometheus may expose these counters with a `_total` suffix depending on your internal telemetry exporter configuration.

## Multiple Pipelines

If you have multiple pipelines (traces, metrics, logs), add `memory_limiter` as the first processor in each one:

```yaml
service:
  pipelines:
    traces:
      processors: [memory_limiter, batch]
    metrics:
      processors: [memory_limiter, batch]
    logs:
      processors: [memory_limiter, batch]
```

The `memory_limiter` checks total process memory, so it protects against memory growth from any pipeline.

The `memory_limiter` processor is not optional in production. It is the difference between graceful degradation and a 3 AM pager alert because your Collector OOM-crashed and all your telemetry disappeared.
