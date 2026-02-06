# How to Fix the Collector Refusing Data with "Memory Usage Above Soft Limit" by Tuning check_interval

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Memory Limiter, Configuration

Description: Fix the OpenTelemetry Collector refusing data with memory usage above soft limit by tuning the check_interval parameter.

You check your Collector logs and see this warning repeated every second:

```
warn  memorylimiter/memorylimiter.go:186  Memory usage is above soft limit. Refusing data.
```

Your applications are getting transient export errors. Data is being lost. But the Collector is not actually close to its container memory limit. The problem is that `check_interval` is not tuned for your workload.

## How check_interval Works

The `memory_limiter` processor checks memory usage at a fixed interval. Between checks, it uses the last known memory reading to decide whether to accept or refuse data. If `check_interval` is too long, the processor uses stale data. If it is too short, it adds CPU overhead.

The real issue is often that the memory reading oscillates around the threshold. Go's garbage collector frees memory in bursts, so memory usage can spike momentarily, trigger the limiter, and then drop well below the limit a moment later.

## The Problem Configuration

```yaml
processors:
  memory_limiter:
    check_interval: 5s         # too infrequent
    limit_mib: 400
    spike_limit_mib: 100       # too conservative
```

With a 5-second check interval, the processor might see a GC spike at 410 MiB, start refusing data for the next 5 seconds, even though GC finishes and memory drops to 250 MiB within a second.

## Fix 1: Reduce check_interval

Use a 1-second or 500-millisecond interval:

```yaml
processors:
  memory_limiter:
    check_interval: 1s    # check more frequently
    limit_mib: 400
    spike_limit_mib: 100
```

This way, the processor quickly detects when memory drops below the limit and resumes accepting data. The CPU overhead of memory checks is negligible at 1-second intervals.

## Fix 2: Increase spike_limit_mib

The `spike_limit_mib` creates a buffer zone. The soft limit is `limit_mib - spike_limit_mib`. Increasing the spike limit moves the soft limit lower, but gives more headroom before refusing data:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 800           # hard limit
    spike_limit_mib: 300     # more headroom for spikes
    # Soft limit = 800 - 300 = 500 MiB
    # Refuses at 500 MiB, hard limit at 800 MiB
```

This means the processor starts refusing at 500 MiB but gives Go's GC a 300 MiB window to clean up before the hard limit.

## Fix 3: Use Percentage-Based Limits

If your Collector runs in a container with a known memory limit, use percentages:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_percentage: 80        # 80% of container memory
    spike_limit_percentage: 20  # 20% headroom
```

This adapts automatically if you change the container memory limit.

## Fix 4: Align GOMEMLIMIT with the Memory Limiter

Make sure `GOMEMLIMIT` is set between the memory limiter's hard limit and the container limit:

```
Container limit: 1024 MiB
GOMEMLIMIT:       850 MiB   (83% of container)
memory_limiter:   800 MiB   (limit_mib)
Soft limit:       500 MiB   (limit_mib - spike_limit_mib)
```

With this setup:
1. At 500 MiB, the memory limiter starts refusing new data
2. Go's GC becomes aggressive at 850 MiB (GOMEMLIMIT)
3. At 1024 MiB, the container is OOM-killed (should never happen)

## Diagnosing False Positive Refusals

If the Collector is refusing data but actual memory usage is well below the limit, it might be a measurement issue. The memory limiter uses Go's `runtime.MemStats` to measure memory, which includes all Go-managed memory including cached objects waiting for GC.

Add the Collector's internal metrics to your monitoring:

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
```

Then query these metrics:

```
# Current memory usage as seen by the memory limiter
otelcol_process_memory_rss

# Number of times data was refused
rate(otelcol_processor_refused_spans[5m])
rate(otelcol_processor_refused_metric_points[5m])
rate(otelcol_processor_refused_log_records[5m])
```

If `refused` metrics show spikes that correlate with brief RSS spikes, increase `spike_limit_mib`.

## Complete Tuned Configuration

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_percentage: 80
    spike_limit_percentage: 25

  batch:
    send_batch_size: 1024
    timeout: 5s

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

The key takeaway: use `check_interval: 1s`, set a reasonable `spike_limit_mib` or `spike_limit_percentage`, and align your `GOMEMLIMIT` with the memory limiter's hard limit. This prevents false positive refusals while still protecting against actual OOM situations.
