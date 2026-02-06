# How to Troubleshoot OOM Kills on Collector Pods When Resource Limits Are Set Too Low for Production Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OOM, Kubernetes, Resource Limits

Description: Diagnose and resolve OOM kills on OpenTelemetry Collector pods caused by resource limits that are too low for traffic volume.

Your OpenTelemetry Collector pods keep getting killed with OOMKilled status. They restart, catch up on queued data, run out of memory again, and crash in a loop. This post explains why the Collector consumes more memory than you expect and how to size resource limits properly.

## Detecting OOM Kills

```bash
# Check pod status
kubectl get pods -n observability -l app=otel-collector
# NAME                              READY   STATUS      RESTARTS   AGE
# otel-collector-7d8f9b4c5d-xyz    0/1     OOMKilled   14         2h

# Check the previous termination reason
kubectl describe pod otel-collector-7d8f9b4c5d-xyz -n observability | grep -A5 "Last State"
# Last State:     Terminated
#   Reason:       OOMKilled
#   Exit Code:    137

# Check node-level events
kubectl get events -n observability --sort-by=.lastTimestamp | grep -i oom
```

## Why the Collector Uses So Much Memory

The Collector is not a simple pass-through proxy. Several components hold data in memory:

1. **Batch processor** buffers spans/metrics/logs before sending
2. **Sending queue** holds data waiting to be exported
3. **In-memory state** for processors like spanmetrics, tail_sampling
4. **gRPC receive buffers** for incoming data
5. **Processor pipelines** create copies of data during transformation

A rough formula for estimating memory:

```
Memory = (batch_size * avg_span_size * num_pipelines) +
         (queue_size * batch_size * avg_span_size) +
         processor_state_memory +
         base_overhead (~50-100MB)
```

## Step 1: Understand Current Usage

Before changing limits, measure actual memory consumption:

```bash
# Get current memory usage
kubectl top pod -n observability -l app=otel-collector

# If metrics-server is not installed, check cgroup stats
kubectl exec -it otel-collector-pod -n observability -- \
  cat /sys/fs/cgroup/memory/memory.usage_in_bytes

# Check the current limits
kubectl get pod otel-collector-pod -n observability \
  -o jsonpath='{.spec.containers[0].resources}'
```

## Step 2: Enable Memory Limiter

The memory_limiter processor is designed to prevent OOM kills by dropping data before the Collector runs out of memory:

```yaml
processors:
  memory_limiter:
    # Start rejecting data at 80% of the memory limit
    limit_percentage: 80
    # Start recovering at 60% of the memory limit
    spike_limit_percentage: 20
    check_interval: 5s
```

Place it first in your pipeline so it runs before other processors accumulate data:

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]  # memory_limiter FIRST
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

## Step 3: Tune the Batch Processor

Reduce batch sizes to lower peak memory usage:

```yaml
processors:
  batch:
    send_batch_size: 512       # Default is 8192
    send_batch_max_size: 1024  # Hard cap on batch size
    timeout: 5s                # Flush more frequently
```

## Step 4: Limit the Sending Queue

The in-memory sending queue can grow unbounded during backend outages:

```yaml
exporters:
  otlp:
    endpoint: "backend:4317"
    sending_queue:
      enabled: true
      num_consumers: 4
      queue_size: 100  # Limit to 100 batches in the queue
    retry_on_failure:
      enabled: true
      max_elapsed_time: 120s  # Stop retrying after 2 minutes
```

For better reliability without memory pressure, use a persistent queue backed by disk:

```yaml
exporters:
  otlp:
    endpoint: "backend:4317"
    sending_queue:
      enabled: true
      storage: file_storage  # Queue to disk instead of memory

extensions:
  file_storage:
    directory: /var/lib/otelcol/queue
    timeout: 10s
    compaction:
      on_start: true
      directory: /tmp/otelcol
```

## Step 5: Set Appropriate Resource Limits

Based on your traffic volume, set realistic limits:

```yaml
# For low traffic (< 1000 spans/sec)
resources:
  requests:
    memory: 256Mi
    cpu: 200m
  limits:
    memory: 512Mi
    cpu: 500m

# For medium traffic (1000-10000 spans/sec)
resources:
  requests:
    memory: 512Mi
    cpu: 500m
  limits:
    memory: 1Gi
    cpu: 1

# For high traffic (> 10000 spans/sec)
resources:
  requests:
    memory: 2Gi
    cpu: 1
  limits:
    memory: 4Gi
    cpu: 2
```

## Step 6: Monitor Memory Usage Over Time

Set up alerts to catch memory issues before they cause OOM kills:

```yaml
# Collector internal metrics endpoint
service:
  telemetry:
    metrics:
      level: detailed
      address: "0.0.0.0:8888"
```

Then create alerts on:

```promql
# Memory usage approaching the limit
container_memory_working_set_bytes{container="collector"}
  / container_spec_memory_limit_bytes{container="collector"} > 0.85

# Collector's internal memory limiter being triggered
rate(otelcol_processor_refused_spans_total[5m]) > 0
```

## The ballpark_limiter Pattern

A useful pattern is to set the Kubernetes memory limit to 2x what you expect, and configure memory_limiter to kick in at the expected value:

```yaml
# Kubernetes resources
resources:
  limits:
    memory: 2Gi  # Hard limit at 2GB

# Collector config
processors:
  memory_limiter:
    limit_mib: 1500  # Start limiting at 1.5GB
    spike_limit_mib: 300
    check_interval: 5s
```

This gives the Collector headroom for spikes while preventing OOM kills. The memory_limiter will gracefully drop data before hitting the hard limit.
