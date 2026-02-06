# How to Configure OTel Arrow Memory Limits to Prevent OOM in High-Throughput Collector Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Memory, High-Throughput

Description: Configure OTel Arrow memory limits to prevent out-of-memory crashes in high-throughput Collector deployments.

OTel Arrow improves bandwidth efficiency, but that efficiency comes with a memory trade-off. Arrow record batches are larger in their decoded form than compressed protobuf messages, because Arrow uses a fixed-width columnar layout that pads values for alignment. In high-throughput Collector deployments, this can lead to memory spikes and OOM kills if limits are not configured properly. This post covers every memory-related setting you need to tune.

## Where OTel Arrow Uses Memory

There are four main memory consumers in an OTel Arrow pipeline:

1. **Encoder dictionaries** (exporter side): Each Arrow stream maintains a dictionary of string values. Larger dictionaries mean better compression but more memory.

2. **Arrow record batch buffers** (both sides): Decoded Arrow batches are held in memory during processing. Each batch can be significantly larger than its compressed wire format.

3. **gRPC receive buffers** (receiver side): The gRPC layer buffers incoming messages before they are decoded.

4. **Sending queues** (exporter side): If the receiver is slow, batches queue up in memory.

## Configuring Receiver Memory Limits

The receiver is typically the most vulnerable to memory pressure because it handles traffic from many agents simultaneously.

```yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # Maximum size of a single gRPC message
        max_recv_msg_size_mib: 16
        arrow:
          # Maximum memory for all active Arrow record batches
          memory_limit_mib: 256
```

The `memory_limit_mib` under the `arrow` section caps the total memory used for decoding Arrow batches. When this limit is reached, the receiver applies backpressure: it stops reading from streams until memory is freed. This prevents unbounded memory growth.

## Configuring the Memory Limiter Processor

The memory limiter processor is your second line of defense. It monitors the Collector's total memory usage and drops data or applies backpressure when limits are breached:

```yaml
processors:
  memory_limiter:
    check_interval: 5s
    # Hard limit: refuse data above this
    limit_mib: 2048
    # Soft limit: start applying backpressure at this level
    spike_limit_mib: 512
    # This means:
    # - Below 1536 MiB (2048-512): normal operation
    # - Between 1536-2048 MiB: backpressure applied
    # - Above 2048 MiB: data refused
```

Always place the memory limiter first in your processor chain:

```yaml
service:
  pipelines:
    traces:
      receivers: [otelarrow]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlp/backend]
```

## Configuring Exporter Memory Limits

On the exporter side, the sending queue is the primary memory consumer. Each queued batch consumes memory until it is sent:

```yaml
exporters:
  otelarrow:
    endpoint: gateway:4317
    arrow:
      num_streams: 4
      max_stream_lifetime: 10m
    sending_queue:
      enabled: true
      # Maximum number of batches in the queue
      num_consumers: 4
      queue_size: 200
    timeout: 30s
```

The `queue_size` limits how many batches can be queued. If each batch is approximately 2 MB in Arrow format, a queue of 200 batches could use up to 400 MB of memory. Size this based on your available memory and acceptable data loss during backpressure.

## Calculating Memory Requirements

Here is a formula for estimating the Collector's memory needs with OTel Arrow:

```
Total memory = Receiver buffers
             + Processor memory
             + Exporter queue memory
             + Dictionary memory
             + Overhead

Receiver buffers:
  = num_agents * max_recv_msg_size_mib
  = 50 agents * 16 MiB = 800 MiB (worst case)

Arrow batch memory:
  = arrow.memory_limit_mib
  = 256 MiB

Dictionary memory:
  = num_streams * avg_dictionary_size
  = 4 streams * 20 MiB = 80 MiB

Exporter queue:
  = queue_size * avg_batch_size
  = 200 * 2 MiB = 400 MiB

Overhead (GC, goroutines, buffers):
  ~200 MiB

Total estimate: ~1,736 MiB
```

Set your container memory limit to at least 1.5x this estimate to allow for spikes:

```yaml
resources:
  requests:
    memory: 2Gi
  limits:
    memory: 3Gi
```

## Preventing OOM During Traffic Spikes

Traffic spikes are the most common trigger for OOM. A sudden increase in telemetry volume can fill all buffers simultaneously. Layer your defenses:

```yaml
# Layer 1: Arrow memory limit on the receiver
receivers:
  otelarrow:
    protocols:
      grpc:
        arrow:
          memory_limit_mib: 256

# Layer 2: Memory limiter processor
processors:
  memory_limiter:
    check_interval: 2s    # Check frequently during spikes
    limit_mib: 2048
    spike_limit_mib: 512

# Layer 3: Bounded sending queue on the exporter
exporters:
  otelarrow:
    sending_queue:
      queue_size: 200

# Layer 4: Batch processor limits
processors:
  batch:
    send_batch_size: 2000
    send_batch_max_size: 5000  # Cap the maximum batch size
    timeout: 5s
```

The `send_batch_max_size` on the batch processor prevents individual batches from growing too large during traffic spikes.

## Monitoring Memory Usage

Set up alerts on Collector memory metrics:

```promql
# Current memory usage
process_resident_memory_bytes{job="otel-collector"}

# Memory limiter refusals (data dropped due to memory pressure)
rate(otelcol_processor_refused_spans{processor="memory_limiter"}[5m])

# Arrow-specific memory usage
otelcol_receiver_otelarrow_memory_usage_bytes
```

Create an alert that fires before you hit OOM:

```yaml
# Alert when memory usage exceeds 80% of the limit
- alert: CollectorMemoryHigh
  expr: |
    process_resident_memory_bytes{job="otel-collector"}
    / on(pod) kube_pod_container_resource_limits{resource="memory"}
    > 0.8
  for: 2m
  labels:
    severity: warning
```

## Tuning for Different Throughput Levels

Low throughput (< 10,000 spans/sec):
```yaml
arrow:
  memory_limit_mib: 64
memory_limiter:
  limit_mib: 512
sending_queue:
  queue_size: 100
```

Medium throughput (10,000 - 100,000 spans/sec):
```yaml
arrow:
  memory_limit_mib: 256
memory_limiter:
  limit_mib: 2048
sending_queue:
  queue_size: 500
```

High throughput (> 100,000 spans/sec):
```yaml
arrow:
  memory_limit_mib: 512
memory_limiter:
  limit_mib: 4096
sending_queue:
  queue_size: 1000
```

Memory management is not glamorous, but it is what keeps your telemetry pipeline running reliably under load. Get these settings right, and your Collector handles traffic spikes gracefully instead of crashing.
