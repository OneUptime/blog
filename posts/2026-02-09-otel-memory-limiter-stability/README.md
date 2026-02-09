# How to configure OpenTelemetry Collector memory limiter for stability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Memory Limiter, Stability, Resource Management

Description: Learn how to configure the OpenTelemetry Collector memory limiter processor to prevent out-of-memory errors and ensure stable operation under varying load conditions.

---

The OpenTelemetry Collector memory limiter processor prevents out-of-memory crashes by monitoring memory usage and applying backpressure when limits are approached. This protection ensures collector stability even when telemetry volume spikes unexpectedly.

## Understanding Memory Limiter

The memory limiter processor monitors collector memory usage and refuses new data when memory consumption exceeds configured thresholds. This backpressure mechanism forces upstream components to slow down or buffer data, preventing collector crashes.

Memory limiting works by checking usage at regular intervals and comparing against soft and hard limits. When the soft limit is exceeded, the processor begins refusing new data. The spike limit provides additional headroom for temporary bursts.

## Basic Configuration

Configure memory limiter with essential parameters for memory protection.

```yaml
# basic-memory-limiter.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  memory_limiter:
    # Check memory usage every second
    check_interval: 1s
    
    # Soft limit at 512 MiB
    limit_mib: 512
    
    # Allow spikes up to 640 MiB (512 + 128)
    spike_limit_mib: 128

  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      # Memory limiter MUST be first processor
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

The memory limiter must be the first processor in the pipeline to protect downstream components.

## Calculating Memory Limits

Calculate appropriate memory limits based on available resources.

```python
# calculate_memory_limits.py
def calculate_memory_limits(total_memory_gb, num_collectors=1):
    """
    Calculate recommended memory limits
    
    Args:
        total_memory_gb: Total available memory in GB
        num_collectors: Number of collector instances
    
    Returns:
        dict with recommended limits
    """
    # Reserve memory for OS and other processes
    usable_memory_gb = total_memory_gb * 0.8
    
    # Divide among collectors
    per_collector_gb = usable_memory_gb / num_collectors
    
    # Set soft limit at 70% of available memory
    soft_limit_mib = int(per_collector_gb * 1024 * 0.7)
    
    # Spike limit is 20% of soft limit
    spike_limit_mib = int(soft_limit_mib * 0.2)
    
    return {
        'limit_mib': soft_limit_mib,
        'spike_limit_mib': spike_limit_mib,
        'total_max_mib': soft_limit_mib + spike_limit_mib
    }

# Example: 4GB server running 1 collector
limits = calculate_memory_limits(4, 1)
print(f"Recommended configuration:")
print(f"  limit_mib: {limits['limit_mib']}")
print(f"  spike_limit_mib: {limits['spike_limit_mib']}")
print(f"  Total max: {limits['total_max_mib']} MiB")
```

## Memory Limiter with GOMEMLIMIT

Combine memory limiter with GOMEMLIMIT for better memory management.

```yaml
# collector-with-gomemlimit.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:latest
        env:
          # Set Go memory limit to 80% of container limit
          - name: GOMEMLIMIT
            value: "768MiB"
        resources:
          limits:
            memory: 1Gi
            cpu: 1000m
          requests:
            memory: 512Mi
            cpu: 500m
        command:
          - /otelcol-contrib
          - --config=/conf/collector-config.yaml
```

GOMEMLIMIT helps the Go runtime manage memory more effectively, reducing the frequency of garbage collection.

## Monitoring Memory Usage

Configure telemetry to monitor memory limiter effectiveness.

```yaml
service:
  telemetry:
    metrics:
      level: detailed
      address: :8888
  
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]

# Key metrics:
# - otelcol_processor_refused_spans (spans rejected due to memory limit)
# - otelcol_processor_refused_metric_points (metrics rejected)
# - process_runtime_total_alloc_bytes (total memory allocated)
# - process_runtime_total_sys_bytes (total memory from OS)
```

Monitor refused telemetry to detect when memory limits are being hit frequently.

## Handling Memory Limit Refusals

Configure retry behavior when memory limits cause refusals.

```yaml
exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true
    
    # Retry configuration for when memory limiter refuses data
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
      max_elapsed_time: 5m
    
    # Queue for temporary buffering
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
```

Retries and queuing help handle temporary memory pressure without losing data.

## Multi-Pipeline Memory Management

Configure separate memory limits for different telemetry types.

```yaml
processors:
  memory_limiter/traces:
    check_interval: 1s
    limit_mib: 300
    spike_limit_mib: 100
  
  memory_limiter/metrics:
    check_interval: 1s
    limit_mib: 150
    spike_limit_mib: 50
  
  memory_limiter/logs:
    check_interval: 1s
    limit_mib: 200
    spike_limit_mib: 50

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter/traces, batch]
      exporters: [otlp/traces]
    
    metrics:
      receivers: [otlp]
      processors: [memory_limiter/metrics, batch]
      exporters: [otlp/metrics]
    
    logs:
      receivers: [otlp]
      processors: [memory_limiter/logs, batch]
      exporters: [otlp/logs]
```

Separate limits prevent one telemetry type from consuming all available memory.

## Best Practices

Follow these best practices for memory limiter configuration.

First, always place memory_limiter as the first processor in every pipeline. This ensures protection for all downstream components.

Second, set the limit to 70-80% of available memory. This leaves room for OS and temporary spikes.

Third, configure spike_limit to handle burst traffic. Set it to 20-30% of the base limit.

Fourth, use check_interval of 1 second for most scenarios. Shorter intervals increase CPU overhead.

Fifth, monitor refused telemetry metrics. Frequent refusals indicate you need more memory or better rate limiting upstream.

Sixth, combine with GOMEMLIMIT for optimal Go runtime behavior. Set GOMEMLIMIT to match or slightly exceed memory_limiter limit.

Seventh, set Kubernetes memory limits higher than memory_limiter limits. This prevents OOMKills before memory_limiter can apply backpressure.

The OpenTelemetry Collector memory limiter processor provides essential protection against out-of-memory conditions. Proper configuration ensures collector stability under varying load while maintaining telemetry data integrity through backpressure mechanisms.
