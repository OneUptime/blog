# How to use OpenTelemetry Collector batch processor for efficiency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Batch Processor, Performance, Optimization

Description: Learn how to configure the OpenTelemetry Collector batch processor to optimize telemetry export efficiency by batching spans, metrics, and logs before sending to backends.

---

The OpenTelemetry Collector batch processor aggregates telemetry data before export, reducing network overhead and improving backend performance. Proper batch configuration balances between export latency and resource efficiency.

## Understanding the Batch Processor

The batch processor collects telemetry data in memory and sends it in batches rather than individual records. This reduces the number of network requests, lowers CPU usage for serialization, and improves backend ingestion efficiency.

Batching introduces a trade-off between latency and efficiency. Larger batches reduce overhead but increase the delay before data reaches your backend. Configuration parameters control batch size and timeout to balance these concerns.

## Basic Configuration

Configure the batch processor with essential parameters for timeout and batch size.

```yaml
# basic-batch-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    # Maximum time to wait before sending a batch
    timeout: 10s
    
    # Number of spans/metrics/logs per batch
    send_batch_size: 1024
    
    # Maximum batch size (safety limit)
    send_batch_max_size: 2048

exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

This configuration sends batches every 10 seconds or when 1024 items accumulate, whichever comes first.

## Tuning for High Throughput

Optimize batch processor settings for high-volume environments.

```yaml
processors:
  batch:
    # Larger timeout for high throughput
    timeout: 30s
    
    # Larger batch sizes reduce network overhead
    send_batch_size: 8192
    send_batch_max_size: 16384
    
    # Configure metadata keys to include in batches
    metadata_keys:
      - tenant_id
      - environment
```

Larger batch sizes work well when you have consistent high traffic and can tolerate slightly higher latency.

## Low-Latency Configuration

Configure for environments requiring near-real-time data visibility.

```yaml
processors:
  batch:
    # Short timeout for quick export
    timeout: 1s
    
    # Smaller batches for faster processing
    send_batch_size: 256
    send_batch_max_size: 512
```

This configuration prioritizes low latency over batching efficiency, suitable for debugging or critical alerting scenarios.

## Multi-Pipeline Configuration

Use different batch configurations for different telemetry types.

```yaml
processors:
  # Batch processor for traces
  batch/traces:
    timeout: 10s
    send_batch_size: 2048
    send_batch_max_size: 4096
  
  # Batch processor for metrics (smaller, more frequent)
  batch/metrics:
    timeout: 30s
    send_batch_size: 8192
    send_batch_max_size: 16384
  
  # Batch processor for logs
  batch/logs:
    timeout: 5s
    send_batch_size: 4096
    send_batch_max_size: 8192

exporters:
  otlp/traces:
    endpoint: tempo:4317
  otlp/metrics:
    endpoint: prometheus:9090
  otlp/logs:
    endpoint: loki:3100

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch/traces]
      exporters: [otlp/traces]
    
    metrics:
      receivers: [otlp]
      processors: [batch/metrics]
      exporters: [otlp/metrics]
    
    logs:
      receivers: [otlp]
      processors: [batch/logs]
      exporters: [otlp/logs]
```

Different telemetry types often have different volume and latency requirements.

## Monitoring Batch Processor

Monitor batch processor metrics to optimize configuration.

```yaml
service:
  telemetry:
    metrics:
      address: :8888
  
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]

# Key metrics to monitor:
# - otelcol_processor_batch_batch_send_size (histogram of batch sizes sent)
# - otelcol_processor_batch_timeout_trigger_send (batches sent due to timeout)
# - otelcol_processor_batch_batch_size_trigger_send (batches sent due to size)
# - otelcol_processor_batch_metadata_cardinality (distinct metadata combinations)
```

These metrics help identify whether batches are timing out or reaching size limits.

## Batch Processor with Memory Limiter

Combine batch processor with memory limiter for stable operation.

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128
  
  batch:
    timeout: 10s
    send_batch_size: 1024
    send_batch_max_size: 2048

service:
  pipelines:
    traces:
      receivers: [otlp]
      # Memory limiter MUST come before batch
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

The memory limiter prevents unbounded memory growth when batching large volumes of data.

## Calculating Optimal Batch Size

Calculate batch size based on your traffic patterns and backend capabilities.

```python
# calculate_batch_size.py
def calculate_batch_size(spans_per_second, target_batches_per_minute):
    """
    Calculate optimal batch size
    
    Args:
        spans_per_second: Average spans received per second
        target_batches_per_minute: Desired number of batches per minute
    
    Returns:
        Recommended batch size
    """
    spans_per_minute = spans_per_second * 60
    batch_size = spans_per_minute / target_batches_per_minute
    
    # Round to nice number
    return round(batch_size, -2)  # Round to nearest 100

# Example: 1000 spans/sec, want 6 batches per minute (every 10 seconds)
recommended_size = calculate_batch_size(1000, 6)
print(f"Recommended batch size: {recommended_size}")
# Output: Recommended batch size: 10000

# For lower traffic
recommended_size = calculate_batch_size(10, 6)
print(f"Recommended batch size: {recommended_size}")
# Output: Recommended batch size: 100
```

## Batch Processor Performance Impact

Understand how batch configuration affects resource usage.

```yaml
# Resource-efficient configuration for cost savings
processors:
  batch:
    # Longer timeout reduces CPU and network overhead
    timeout: 60s
    
    # Larger batches mean fewer export operations
    send_batch_size: 10000
    send_batch_max_size: 20000

# vs.

# Low-latency configuration (higher resource usage)
processors:
  batch:
    timeout: 1s
    send_batch_size: 100
    send_batch_max_size: 200
```

Longer timeouts and larger batches reduce CPU usage for serialization and network operations but increase memory usage.

## Best Practices

Follow these best practices for batch processor configuration.

First, start with default settings and adjust based on monitoring. The defaults work well for most scenarios.

Second, set `send_batch_max_size` to 2x your `send_batch_size`. This provides headroom for traffic bursts.

Third, configure timeout based on your latency requirements. Use 10-30 seconds for production, 1-5 seconds for debugging.

Fourth, always place memory_limiter before batch processor in the pipeline. This prevents memory exhaustion.

Fifth, monitor batch send triggers. If most batches send due to timeout, increase timeout or reduce batch size.

Sixth, adjust batch size based on average span/metric size. Larger telemetry items require smaller batch counts.

Seventh, use separate batch processors for traces, metrics, and logs. Each has different volume and latency characteristics.

The OpenTelemetry Collector batch processor significantly improves telemetry export efficiency by aggregating data before transmission. Proper configuration balances latency requirements with resource optimization to reduce costs while maintaining observability effectiveness.
