# How to Fix the Mistake of Not Configuring a Sending Queue and Losing Data During Backend Outages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Reliability, Queue

Description: Prevent telemetry data loss during backend outages by configuring the sending queue and retry mechanisms on your Collector exporters.

Without a sending queue, the OpenTelemetry Collector drops telemetry data the moment it cannot reach the backend. A 30-second network blip, a backend restart, or a DNS resolution hiccup means all in-flight data is gone. Configuring a sending queue with retry logic is essential for a reliable telemetry pipeline.

## The Default Behavior

By default, exporters in the Collector have a basic queue configuration, but it is not always sufficient for production workloads. When the queue fills up or is not enabled, the exporter drops data immediately on failure:

```
2024-01-15T10:30:00Z  warn  exporterhelper/queued_retry.go
  Dropping data because sending_queue is full.
  dropped_items: 1024
```

This message appears in the Collector logs, but by then the data is already gone.

## Configuring the Sending Queue

Every exporter in the Collector supports `sending_queue` and `retry_on_failure` configuration:

```yaml
exporters:
  otlp:
    endpoint: "https://backend:4317"

    # Buffer data in memory when the backend is unavailable
    sending_queue:
      enabled: true
      num_consumers: 10     # Parallel export goroutines
      queue_size: 10000     # Maximum batches in the queue

    # Retry failed exports with exponential backoff
    retry_on_failure:
      enabled: true
      initial_interval: 5s   # First retry after 5 seconds
      max_interval: 30s      # Maximum backoff between retries
      max_elapsed_time: 300s  # Stop retrying after 5 minutes
```

## How the Queue Works

The sending queue sits between the pipeline processors and the exporter:

```
Receivers -> Processors -> [Sending Queue] -> Exporter -> Backend
```

When the exporter fails to send data:
1. The data stays in the queue
2. The retry mechanism kicks in with exponential backoff
3. After `initial_interval`, the exporter tries again
4. If it fails again, the interval doubles (up to `max_interval`)
5. Retries continue until `max_elapsed_time` is reached
6. If all retries fail, the data is dropped

During the retry period, new data continues to enter the queue (up to `queue_size`).

## Sizing the Queue

The queue size determines how much data you can buffer during an outage. Here is how to calculate it:

```
queue_size = (outage_duration_seconds / batch_timeout_seconds) * safety_factor

# Example: buffer 5 minutes of data with 5-second batches
# queue_size = (300 / 5) * 2 = 120
# But round up generously for spikes
# queue_size = 5000
```

Each item in the queue is one batch of telemetry data (the size of which is determined by the batch processor). A `queue_size` of 5000 with a batch size of 512 spans means you can buffer roughly 2.5 million spans.

## Memory Implications

The sending queue holds data in memory. Larger queues consume more memory. Make sure your `memory_limiter` and container limits account for the queue:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024       # Total memory limit
    spike_limit_mib: 256

  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://backend:4317"
    sending_queue:
      enabled: true
      queue_size: 5000    # This consumes memory!
```

## Persistent Queue (Disk-Backed)

For even more resilience, use the persistent queue storage that writes to disk instead of memory. This survives Collector restarts:

```yaml
extensions:
  file_storage:
    directory: /var/lib/otelcol/queue
    timeout: 10s

exporters:
  otlp:
    endpoint: "https://backend:4317"
    sending_queue:
      enabled: true
      storage: file_storage  # Use disk instead of memory
      queue_size: 50000      # Can be much larger with disk

service:
  extensions: [file_storage]
```

With the persistent queue:
- Data survives Collector restarts
- Queue capacity is limited by disk space, not memory
- Recovery after a backend outage includes data from before the Collector restarted

## Monitoring Queue Health

Watch these Collector metrics to know if your queue is healthy:

```bash
# Current number of batches in the queue
otelcol_exporter_queue_size

# Total number of items dropped because the queue was full
otelcol_exporter_enqueue_failed_spans

# Number of successful exports
otelcol_exporter_sent_spans

# Number of failed exports
otelcol_exporter_send_failed_spans
```

Set up an alert when the queue is more than 80% full:

```yaml
alert: CollectorQueueNearFull
expr: otelcol_exporter_queue_size / 10000 > 0.8
for: 5m
labels:
  severity: warning
annotations:
  summary: "Collector exporter queue is above 80% capacity"
```

## Complete Production Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1536
    spike_limit_mib: 384
  batch:
    send_batch_size: 8192
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://backend:4317"
    sending_queue:
      enabled: true
      num_consumers: 10
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

A sending queue with retry logic is non-negotiable for production. It is the difference between losing telemetry data during a brief outage and gracefully recovering without any data loss.
