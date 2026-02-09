# How to Fix High Collector Memory When the Batch Processor send_batch_size Is Set Too Large

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Batch Processor, Memory

Description: Fix high memory usage in the OpenTelemetry Collector caused by an oversized batch processor send_batch_size configuration.

A common performance tuning mistake with the OpenTelemetry Collector is setting the batch processor's `send_batch_size` too high. The intention is to reduce the number of export calls by sending fewer, larger batches. But the side effect is that each batch consumes more memory, and if the exporter is slow, multiple large batches queue up and memory usage spikes.

## How the Batch Processor Uses Memory

The batch processor accumulates spans (or metrics, or logs) in an internal buffer. When the buffer reaches `send_batch_size` or `timeout` expires (whichever comes first), it sends the entire batch to the exporter. Until the export completes, the batch data stays in memory. If you have multiple pipeline goroutines, each one holds its own batch.

## The Problem

```yaml
processors:
  batch:
    send_batch_size: 50000   # way too large
    timeout: 60s             # and waiting too long
```

With this configuration, the batch processor accumulates up to 50,000 spans before sending. If each span is ~2KB, that is 100MB per batch. With multiple concurrent batches in flight, you can easily hit 500MB+ just in the batch processor.

## Calculating Memory Impact

```
memory_per_batch = send_batch_size * avg_span_size
concurrent_batches = num_pipeline_goroutines + batches_in_export

total_batch_memory = memory_per_batch * concurrent_batches

Example with bad config:
50,000 spans * 2KB = 100MB per batch
5 concurrent batches = 500MB
```

```
Example with good config:
1,024 spans * 2KB = 2MB per batch
5 concurrent batches = 10MB
```

## The Fix

Reduce `send_batch_size` and `timeout`:

```yaml
processors:
  batch:
    # Send batches of 1024 spans
    send_batch_size: 1024
    # Cap the maximum batch size
    send_batch_max_size: 2048
    # Send at least every 5 seconds even if batch is not full
    timeout: 5s
```

The `send_batch_max_size` is especially important. It caps the maximum number of items in a single batch, even if more data arrives while a batch is being assembled. Without it, a burst of traffic can create a batch much larger than `send_batch_size`.

## Understanding the Parameters

```yaml
processors:
  batch:
    # Target batch size - triggers a send when reached
    send_batch_size: 1024

    # Maximum batch size - hard cap, prevents oversized batches
    send_batch_max_size: 2048

    # Time-based trigger - sends whatever is in the buffer
    # even if send_batch_size hasn't been reached
    timeout: 5s
```

The interaction:
- If 1024 spans arrive within 5 seconds, a batch is sent immediately
- If only 100 spans arrive in 5 seconds, those 100 are sent when the timeout fires
- If 3000 spans arrive in a burst, two batches are created (2048 and 952) due to `send_batch_max_size`

## Tuning for Your Workload

### Low-Traffic Services (< 100 spans/sec)

```yaml
processors:
  batch:
    send_batch_size: 256
    send_batch_max_size: 512
    timeout: 10s
```

Smaller batches, longer timeout. The timeout ensures data is exported even during quiet periods.

### Medium-Traffic Services (100-1000 spans/sec)

```yaml
processors:
  batch:
    send_batch_size: 1024
    send_batch_max_size: 2048
    timeout: 5s
```

This is a good default for most production workloads.

### High-Traffic Services (> 1000 spans/sec)

```yaml
processors:
  batch:
    send_batch_size: 2048
    send_batch_max_size: 4096
    timeout: 2s
```

Larger batches with shorter timeout. The higher throughput justifies larger batch sizes, but keep `send_batch_max_size` reasonable.

## Monitoring Batch Processor Performance

The Collector exposes batch processor metrics:

```
# Batch size distribution
otelcol_processor_batch_batch_send_size

# Time taken to export a batch
otelcol_exporter_send_latency

# Number of times timeout triggered (vs size trigger)
otelcol_processor_batch_timeout_trigger_send
otelcol_processor_batch_batch_size_trigger_send
```

If `timeout_trigger_send` is much higher than `batch_size_trigger_send`, your `send_batch_size` is too large for your traffic volume. Reduce it so batches fill up and send without waiting for the timeout.

## Interplay with the Sending Queue

The exporter's sending queue also affects memory:

```yaml
exporters:
  otlp:
    endpoint: backend:4317
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 1000  # max 1000 batches in the queue
```

If `queue_size` is 1000 and each batch is 2048 spans at 2KB each, the queue alone can hold:
```
1000 * 2048 * 2KB = ~4GB
```

Set `queue_size` proportionally to your available memory:

```yaml
exporters:
  otlp:
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 100   # much more reasonable
```

## Summary

Keep `send_batch_size` between 512 and 4096 for most workloads. Always set `send_batch_max_size` to cap burst sizes. Use a `timeout` of 2-10 seconds. Monitor the batch processor metrics to confirm your settings match your actual traffic patterns. And do not forget to also limit the exporter's sending queue size, as it compounds the memory impact.
