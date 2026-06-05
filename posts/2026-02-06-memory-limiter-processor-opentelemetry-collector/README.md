# How to Configure the Memory Limiter Processor in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Processor, Memory Limiter, Reliability, Resource Management

Description: Learn how to configure the memory limiter processor in OpenTelemetry Collector to prevent out-of-memory crashes, protect system stability, and handle traffic spikes gracefully.

The memory limiter processor is your collector's first line of defense against resource exhaustion. It monitors memory usage and applies back-pressure when consumption approaches configured limits, preventing out-of-memory (OOM) crashes that can bring down your entire observability pipeline.

Without a properly configured memory limiter, unexpected traffic spikes, downstream slowness, or misconfigured exporters can cause your collector to consume unbounded memory until the operating system kills the process. This guide shows you how to configure memory limits that protect your infrastructure while maximizing telemetry throughput.

## Why Memory Limiting Is Critical

OpenTelemetry Collector processes telemetry data through an internal pipeline of receivers, processors, and exporters. If exporters can't keep up with incoming data (due to network issues, backend slowness, or configuration problems), telemetry accumulates in memory.

Without limits, this accumulation continues until:

- **Linux OOM killer terminates the collector** (common in containerized environments)
- **System becomes unresponsive** due to memory pressure and swapping
- **Other processes fail** when system memory exhausts
- **Kubernetes evicts the pod** due to memory limit violations

The memory limiter prevents these scenarios by shedding load before memory exhaustion occurs.

## How Memory Limiter Works

The processor operates with two thresholds and a periodic check interval:

```mermaid
graph TD
    A[Incoming Telemetry] --> B{Check Interval}
    B --> C{Current Memory}
    C -->|< limit_mib - spike_limit_mib| D[Accept & Process]
    C -->|>= limit_mib - spike_limit_mib| E[Refuse & Signal Back-Pressure]
    C -->|>= limit_mib| F[Refuse & Force GC]
    D --> G[Next Processor]
    E --> G
    F --> H[Refused Items Metric]
```

**Key concepts**:

1. **limit_mib**: Hard heap memory target for the collector process
2. **spike_limit_mib**: Expected memory spike between checks, subtracted from `limit_mib` to calculate the soft limit
3. **check_interval**: How frequently memory usage is evaluated

When memory exceeds `limit_mib - spike_limit_mib`, the processor stops accepting new data temporarily and returns retryable errors to the previous component. When memory exceeds `limit_mib`, the processor also forces garbage collection to reduce memory pressure.

## Basic Configuration

The memory limiter should be the first processor in every pipeline:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      x-oneuptime-token: "YOUR_TOKEN"

service:
  pipelines:
    traces:
      receivers: [otlp]
      # Memory limiter MUST be first
      processors: [memory_limiter, batch]
      exporters: [otlphttp]
```

This configuration protects a collector with a 512 MiB hard heap target and a 384 MiB soft limit (512 - 128) where it begins refusing data.

## Core Configuration Parameters

### limit_mib

The hard heap memory target in mebibytes (MiB). The processor calculates the soft limit by subtracting `spike_limit_mib` from this value. When the soft limit is exceeded, the processor applies back-pressure by refusing new data temporarily; when the hard limit is exceeded, it also forces garbage collection.

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024  # 1 GiB hard heap target
```

**Sizing guidance**:

Calculate limit as a percentage of available memory:

```text
limit_mib = (container_memory_limit × 0.8) - safety_margin
```

For example, with a 2 GiB container:

```text
limit_mib = (2048 × 0.8) - 200 = 1438 MiB
```

The 0.8 factor provides safety margin, and the additional margin accounts for memory outside the Go heap. OpenTelemetry's documentation notes that total process memory is typically about 50 MiB higher than `limit_mib`, so keep extra room for your workload and deployment environment.

### spike_limit_mib

Expected memory growth between checks. The processor subtracts this value from `limit_mib` to calculate the soft limit where it starts refusing data.

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024
    spike_limit_mib: 256  # Start refusing data above 768 MiB (1024 - 256)
```

**Spike limit purpose**:

Traffic doesn't arrive perfectly smoothly. Short bursts can push memory usage temporarily higher between checks. The spike limit reserves room for those bursts before the collector reaches the hard `limit_mib` target.

**Typical values**:
- **20-25% of limit_mib**: Standard recommendation for most workloads
- **10-15% of limit_mib**: Tighter control in memory-constrained environments
- **30-40% of limit_mib**: Burst-heavy workloads with good downstream capacity

### check_interval

How frequently the processor evaluates current memory usage.

```yaml
processors:
  memory_limiter:
    check_interval: 1s  # Check every second
```

**Trade-offs**:

- **Shorter interval (100ms-500ms)**: Faster reaction to memory spikes, more CPU overhead
- **Longer interval (2s-5s)**: Lower CPU overhead, slower reaction time
- **Recommended (1s)**: Balanced for most scenarios

In practice, 1 second works well. Memory exhaustion doesn't happen instantly; collectors typically have seconds of warning. Checking more frequently adds CPU cost with minimal benefit.

## Memory Sizing Strategy

Determining appropriate memory limits requires understanding your collector's memory profile.

### Step 1: Measure Baseline Memory

Deploy a collector without memory limits and observe steady-state usage:

```yaml
processors:
  # Temporarily disabled for measurement
  # memory_limiter:
  #   limit_mib: 512

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  telemetry:
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888

  pipelines:
    traces:
      processors: [batch]
```

Monitor memory over 24-48 hours:

```bash
# Query collector process memory

ps aux | grep otelcol

# Or use container metrics
kubectl top pod <collector-pod>

# Or query Prometheus if scraping collector metrics
# Look for: otelcol_process_runtime_heap_alloc_bytes
curl http://localhost:8888/metrics | grep heap_alloc
```

Note the p95 and p99 memory usage during normal operations.

### Step 2: Account for Traffic Growth

Add headroom for expected traffic growth:

```text
projected_memory = baseline_p95 × growth_factor
```

Use a growth factor of 1.5-2.0 to handle:
- Seasonal traffic patterns
- Product growth
- Marketing campaigns
- Incident-related spikes

### Step 3: Set Limits Based on Deployment Environment

Different environments have different constraints:

#### Kubernetes Deployment

```yaml
# Kubernetes Pod with 2 GiB memory limit
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:latest
        resources:
          requests:
            memory: 1Gi
          limits:
            memory: 2Gi
```

Corresponding memory limiter configuration:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    # 80% of 2048 MiB = 1638, minus 200 MiB safety margin = 1438
    limit_mib: 1438
    # 20% of 1438 = 287
    spike_limit_mib: 287
```

#### Docker Compose Deployment

```yaml
# docker-compose.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    mem_limit: 1g
    mem_reservation: 512m
```

```yaml
# collector-config.yaml
processors:
  memory_limiter:
    check_interval: 1s
    # 80% of 1024 MiB = 819, minus 150 MiB overhead = 669
    limit_mib: 669
    spike_limit_mib: 133
```

#### Bare Metal Deployment

```yaml
# More memory available, can be generous
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 4096  # 4 GiB hard heap target
    spike_limit_mib: 1024  # Start refusing above 3 GiB
```

## Advanced Configuration Scenarios

### High-Throughput Production

For collectors handling millions of spans per minute:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 8192  # 8 GiB for high volume
    spike_limit_mib: 2048  # Generous spike room

  batch:
    timeout: 10s
    send_batch_size: 8192
    send_batch_max_size: 16384

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    compression: gzip
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
```

Large memory limits combined with aggressive batching maximize throughput while maintaining stability.

### Memory-Constrained Edge Deployment

For edge collectors running on resource-limited devices:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 128  # Tight memory budget
    spike_limit_mib: 32  # Small spike allowance

  batch:
    timeout: 2s
    send_batch_size: 256  # Smaller batches
    send_batch_max_size: 512

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    compression: gzip
    sending_queue:
      enabled: false  # Disable queue to save memory
```

Aggressive memory limits combined with frequent batching keeps memory footprint minimal while maintaining functionality.

### Multi-Pipeline with Different Limits

Sometimes different telemetry types need different memory budgets:

```yaml
processors:
  # Separate memory limiters per pipeline
  memory_limiter/traces:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

  memory_limiter/metrics:
    check_interval: 1s
    limit_mib: 1024
    spike_limit_mib: 256

  memory_limiter/logs:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter/traces, batch]
      exporters: [otlphttp]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter/metrics, batch]
      exporters: [otlphttp]

    logs:
      receivers: [otlp]
      processors: [memory_limiter/logs, batch]
      exporters: [otlphttp]
```

This approach allocates memory budget based on expected volume per signal type. Traces often consume more memory due to larger span data and deeper processing pipelines.

## Monitoring Memory Limiter Behavior

The memory limiter exposes critical metrics for understanding its operation:

### Key Metrics to Watch

```bash
# Query collector metrics endpoint
curl http://localhost:8888/metrics | grep -E "processor_refused|receiver_refused|process_runtime_heap_alloc"

# Important metrics:
# - otelcol_processor_refused_spans: How many spans were refused by processors such as memory_limiter
# - otelcol_processor_refused_metric_points: How many metrics were refused by processors such as memory_limiter
# - otelcol_processor_refused_log_records: How many logs were refused by processors such as memory_limiter
# - otelcol_receiver_refused_*: How many items receivers could not push into the pipeline
```

### Healthy vs. Unhealthy Patterns

**Healthy memory limiter operation**:

```text
otelcol_processor_refused_spans: 0
otelcol_processor_refused_metric_points: 0
otelcol_process_runtime_heap_alloc_bytes: well below limit_mib
```

Memory stays well below limits, no refusals occur. System is stable.

**Warning signs**:

```text
otelcol_processor_refused_spans: increasing
otelcol_process_runtime_heap_alloc_bytes: consistently near the soft limit
```

The limiter is actively refusing data. This indicates:
- Exporters can't keep up with incoming volume
- Downstream backends are slow or unavailable
- Memory limits are too conservative

**Critical issues**:

```text
otelcol_processor_refused_spans: rapidly increasing
Container restarted: OOMKilled
```

Memory limiter couldn't protect against exhaustion. Either:
- Limits exceed container resources
- Traffic spike exceeded the reserved `spike_limit_mib` headroom too quickly
- Memory leak in collector or processor

## Troubleshooting Common Issues

### Issue 1: Collector OOMKilled Despite Memory Limiter

**Symptom**: Kubernetes or Docker kills collector with OOM, even with memory limiter configured.

**Causes and solutions**:

**Cause 1**: Memory limit exceeds container limit

```yaml
# BAD: limit_mib (2048) exceeds container limit (1024 MiB)
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048

# GOOD: limit_mib stays well below container limit
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 768  # 75% of 1024 MiB container limit
```

**Cause 2**: check_interval too long

```yaml
# BAD: 10-second check interval gives memory pressure too much time
processors:
  memory_limiter:
    check_interval: 10s

# GOOD: 1-second check interval reacts quickly
processors:
  memory_limiter:
    check_interval: 1s
```

**Cause 3**: Spike limit too small for bursty traffic

```yaml
# BAD: only 20 MiB reserved between the soft and hard limits
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 768
    spike_limit_mib: 20  # Soft limit is 748 MiB

# GOOD: reserve enough room for memory growth between checks
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 768
    spike_limit_mib: 150  # Soft limit is 618 MiB
```

### Issue 2: Excessive Refused Telemetry

**Symptom**: High `otelcol_processor_refused_*` metrics, significant data loss.

**Diagnosis**:

```bash
# Check if exporter is keeping up
curl http://localhost:8888/metrics | grep exporter_sent

# Check for exporter failures
curl http://localhost:8888/metrics | grep send_failed

# Check current memory usage
curl http://localhost:8888/metrics | grep heap_alloc
```

**Solution options**:

**Option 1**: Increase memory limits (if resources available)

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048  # Was: 1024
    spike_limit_mib: 512  # Was: 256
```

**Option 2**: Add more collector replicas (horizontal scaling)

```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 3  # Was: 1
```

**Option 3**: Optimize pipeline to reduce memory consumption

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024

  # Filter out noisy telemetry early
  filter:
    traces:
      span:
        - 'attributes["http.target"] == "/healthz"'
        - 'attributes["http.target"] == "/readyz"'

  # Batch more aggressively
  batch:
    timeout: 5s
    send_batch_size: 4096  # Was: 1024
```

### Issue 3: Memory Creep Over Time

**Symptom**: Memory usage slowly increases over hours/days, eventually hitting limits.

**Likely causes**:

1. **Exporter queue backlog**: Downstream slowness causes queue growth
2. **Memory leak**: Bug in collector or custom processor
3. **Traffic growth**: Gradual increase in telemetry volume

**Solution**:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024
    spike_limit_mib: 256

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000  # Cap queue size
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s  # Give up after 5 minutes
```

Capping exporter queue size prevents unbounded memory growth from downstream issues.

## Production Deployment Checklist

Before deploying a memory limiter to production:

- [ ] Container memory limit set in orchestration platform
- [ ] `limit_mib` configured to 70-80% of container memory
- [ ] `spike_limit_mib` set to 20-25% of `limit_mib`
- [ ] `limit_mib` leaves room below the container limit for memory outside the Go heap
- [ ] `check_interval` set to 1 second (standard recommendation)
- [ ] Memory limiter placed as first processor in all pipelines
- [ ] Collector metrics endpoint exposed and monitored
- [ ] Alerts configured for refused telemetry metrics
- [ ] Load testing performed at 2x expected peak traffic
- [ ] Runbooks created for OOM and refused telemetry scenarios

## Testing Memory Limiter Configuration

Validate your setup with a controlled load test:

```yaml
# test-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 256  # Intentionally low for testing
    spike_limit_mib: 64

  batch:
    timeout: 5s
    send_batch_size: 1000

exporters:
  # Slow exporter to build up memory pressure
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    timeout: 60s  # Artificially slow

  debug:
    verbosity: basic

service:
  telemetry:
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp, debug]
```

Generate load and observe behavior:

```bash
# Start collector
otelcol --config test-config.yaml

# Monitor memory and refusals
watch -n 1 'curl -s http://localhost:8888/metrics | grep -E "(heap_alloc|refused_spans)"'

# Expected behavior:
# 1. Memory climbs toward limit_mib
# 2. Refused spans start incrementing as limit is hit
# 3. Memory stays near or below limit_mib
# 4. Collector remains stable (doesn't crash)
```

This test validates that your limiter protects against memory exhaustion as designed.

## Integration with Other Components

### Memory Limiter + Batch Processor

The most critical pairing. Memory limiter must come first:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024
    spike_limit_mib: 256

  batch:
    timeout: 5s
    send_batch_size: 2048

service:
  pipelines:
    traces:
      # CORRECT: memory_limiter before batch
      processors: [memory_limiter, batch]
```

This order ensures the limiter can apply back-pressure before batches accumulate.

### Memory Limiter + Tail Sampling

Tail sampling processors hold traces in memory for decision windows. Size limits carefully:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 4096  # Generous for tail sampling
    spike_limit_mib: 1024

  tail_sampling:
    decision_wait: 10s
    num_traces: 50000  # Limit in-flight traces
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]

  batch:
    timeout: 5s

service:
  pipelines:
    traces:
      processors: [memory_limiter, tail_sampling, batch]
```

Monitor memory carefully with tail sampling; it's one of the most memory-intensive processors.

## Key Takeaways

The memory limiter processor is essential protection for production OpenTelemetry Collector deployments. It prevents out-of-memory crashes that can bring down your observability pipeline during traffic spikes or downstream issues.

Configure `limit_mib` to 70-80% of your container's memory limit, set `spike_limit_mib` to 20-25% of your limit, and always place the memory limiter first in your processor chain.

Monitor refused telemetry metrics continuously. Zero refusals indicates healthy operation; sustained refusals signal undersized limits or downstream capacity problems requiring investigation.

**Related Reading:**

- [How to Configure the Batch Processor in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-batch-processor-opentelemetry-collector/view)
- [How to Configure the Filter Processor in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-filter-processor-opentelemetry-collector/view)
- [What is OpenTelemetry Collector and why use one?](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
