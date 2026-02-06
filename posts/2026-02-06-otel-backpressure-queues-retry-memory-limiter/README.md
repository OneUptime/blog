# How to Configure Backpressure-Aware Pipelines with Sending Queues, Retry Logic, and Memory Limiters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Backpressure, Retry, Memory Limiter, Queue Management

Description: Configure backpressure-aware OpenTelemetry Collector pipelines with properly tuned sending queues, retry logic, and memory limiters for production reliability.

A collector that crashes under load is worse than no collector at all. The three mechanisms that keep your pipeline stable under pressure are memory limiters, sending queues, and retry logic. Getting these right is the difference between a collector that gracefully handles spikes and one that OOMs at 3 AM.

## Understanding Backpressure

Backpressure happens when the downstream system (your backend) cannot accept data as fast as the collector produces it. Without proper handling, this causes a chain reaction:

1. Backend slows down or returns errors
2. Exporter cannot send, data piles up in the queue
3. Queue fills up, new data gets dropped
4. If there is no queue limit, memory grows until OOM kill

## Memory Limiter: The First Line of Defense

The memory limiter processor should be the first processor in every pipeline. It monitors the collector's memory usage and starts refusing data when limits are reached:

```yaml
processors:
  memory_limiter:
    # How often to check memory usage
    check_interval: 1s
    # Hard limit: start dropping data at this point
    limit_mib: 1024
    # Soft limit: start applying backpressure at limit_mib - spike_limit_mib
    # In this case, backpressure starts at 768 MiB (1024 - 256)
    spike_limit_mib: 256
```

When memory usage is between 768 MiB and 1024 MiB, the limiter tells receivers to slow down. Above 1024 MiB, it starts dropping data. This prevents the collector process from being killed by the OS.

## Sending Queues: Buffering During Backend Slowdowns

Each exporter can have a sending queue that buffers data when the backend is temporarily slow:

```yaml
exporters:
  otlp:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
    sending_queue:
      # Enable the queue
      enabled: true
      # Number of parallel consumers that send batches
      num_consumers: 10
      # Maximum number of batches held in the queue
      # Each batch is up to send_batch_size items
      queue_size: 5000
      # Use persistent storage to survive restarts
      storage: file_storage/queue
```

The queue size should be large enough to handle typical backend hiccups (30-60 seconds of data) but not so large that it consumes all available memory.

## Calculating Queue Size

Here is how to size your queue:

```
Incoming rate: 10,000 spans/second
Batch size: 512 spans
Batches per second: 10,000 / 512 = ~20 batches/sec
Buffer for 60 seconds: 20 * 60 = 1,200 batches
Queue size: 1,200 (minimum) to 2,400 (comfortable)

Memory per batch: ~512 spans * ~1KB/span = ~512KB
Total queue memory: 2,400 * 512KB = ~1.2GB
```

Make sure the memory limiter's `limit_mib` accounts for the queue memory.

## Retry Logic: Handling Transient Failures

When the backend returns an error, the exporter should retry with exponential backoff:

```yaml
exporters:
  otlp:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
    retry_on_failure:
      enabled: true
      # First retry after 5 seconds
      initial_interval: 5s
      # Double the interval each retry, up to this max
      max_interval: 30s
      # Give up after this total time
      max_elapsed_time: 300s
      # Multiplier for exponential backoff
      randomization_factor: 0.5
```

The `max_elapsed_time` is critical. Without it, a single failed batch could retry indefinitely, consuming a queue consumer slot forever.

## Persistent Queue Storage

By default, the queue lives in memory. If the collector restarts, queued data is lost. Use file-based storage to persist the queue:

```yaml
extensions:
  file_storage/queue:
    directory: /var/otel/queue
    timeout: 10s
    compaction:
      on_start: true
      on_rebound: true
      directory: /var/otel/queue/tmp

exporters:
  otlp:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
    sending_queue:
      enabled: true
      queue_size: 10000
      storage: file_storage/queue

service:
  extensions: [file_storage/queue]
```

This ensures that data in the queue survives collector restarts and Kubernetes pod rescheduling.

## Complete Production Configuration

Here is a full configuration with all three mechanisms working together:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        # Limit incoming message size to prevent huge payloads
        max_recv_msg_size_mib: 4

extensions:
  file_storage/queue:
    directory: /var/otel/queue
    timeout: 10s

processors:
  # FIRST processor - always
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

  batch:
    send_batch_size: 512
    send_batch_max_size: 1024
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
    # Timeout for each export call
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
      storage: file_storage/queue

service:
  extensions: [file_storage/queue]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]

  telemetry:
    metrics:
      address: "0.0.0.0:8888"
```

## Monitoring Backpressure

Set up alerts on these metrics to know when your pipeline is under stress:

```bash
# Queue utilization - should stay below 80%
curl -s http://localhost:8888/metrics | grep queue_size
# otelcol_exporter_queue_size{exporter="otlp"} 150
# otelcol_exporter_queue_capacity{exporter="otlp"} 5000

# Memory limiter drops - should be 0 normally
curl -s http://localhost:8888/metrics | grep refused
# otelcol_processor_refused_spans{processor="memory_limiter"} 0

# Retry attempts - occasional retries are normal
curl -s http://localhost:8888/metrics | grep retry
# otelcol_exporter_retry_send_count{exporter="otlp"} 12
```

If `queue_size / queue_capacity` stays above 80%, your backend cannot keep up and you need to either increase backend capacity, reduce data volume (add sampling), or add more collector instances.

## Wrapping Up

Memory limiters, sending queues, and retry logic are the three pillars of a production-grade collector pipeline. The memory limiter prevents OOM crashes, the queue absorbs temporary slowdowns, and retry logic handles transient errors. Configure all three, monitor them with internal metrics, and you will have a pipeline that handles production traffic spikes gracefully.
