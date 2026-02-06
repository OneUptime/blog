# How to Configure Low-Overhead eBPF Profiling for Production (Under 1% CPU Impact)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, eBPF, Profiling, Production

Description: Configure eBPF-based profiling for production environments with under 1% CPU overhead using tuned settings.

The number one concern teams have about running profilers in production is overhead. Nobody wants their observability tooling to become the performance problem. The good news is that eBPF-based profiling, when configured properly, consistently runs under 1% CPU impact. This post walks through the exact settings you need to achieve that.

## Understanding Where the Overhead Comes From

eBPF profilers have three main sources of overhead:

1. **Sampling interrupts**: Each time a sample is taken, the CPU is interrupted to capture the current stack trace. More samples per second means more interrupts.
2. **Stack unwinding**: Walking the call stack from the current instruction pointer back to the root frame requires reading memory. Deep stacks take longer to unwind.
3. **Data transfer**: Moving captured samples from the kernel eBPF ring buffer to the userspace agent, then encoding and shipping them to the collector.

Each of these can be tuned independently.

## Tuning the Sampling Frequency

The sampling frequency has the most direct impact on overhead. The default of 19 Hz (19 samples per second per CPU core) is already quite conservative.

```bash
# Run with the default 19 Hz (recommended for production)
docker run --rm -d \
  --name otel-ebpf-profiler \
  --privileged \
  --pid=host \
  -v /sys/kernel:/sys/kernel:ro \
  -v /lib/modules:/lib/modules:ro \
  -e OTEL_PROFILER_SAMPLING_FREQUENCY=19 \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317 \
  ghcr.io/open-telemetry/opentelemetry-ebpf-profiler:v0.8.0
```

At 19 Hz on a 16-core machine, that is 304 samples per second total. Each sample takes roughly 1-5 microseconds to capture, so the total CPU time spent sampling is about 0.3-1.5 milliseconds per second. That is well under 0.1% of total CPU capacity.

If you want even lower overhead, drop to 9 Hz:

```bash
-e OTEL_PROFILER_SAMPLING_FREQUENCY=9
```

Below 9 Hz, the profiles become less statistically meaningful, so it is not recommended to go lower.

## Limiting Stack Depth

Deep stacks are more expensive to unwind. By default, the profiler might capture up to 128 frames. In production, you can limit this:

```bash
# Limit stack depth to 64 frames
-e OTEL_PROFILER_MAX_STACK_DEPTH=64
```

Most useful profiling information is in the top 30-40 frames anyway. The very bottom of the stack is usually runtime initialization and framework boilerplate that rarely changes.

## Filtering Processes

Do not profile everything. If you only care about specific services, filter to just those:

```bash
# Only profile processes matching these names
-e OTEL_PROFILER_FILTER_PROCESS_NAMES="api-server,worker,scheduler"
```

Or filter by container labels in Kubernetes:

```yaml
# Kubernetes DaemonSet for the profiler
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-ebpf-profiler
spec:
  template:
    spec:
      containers:
        - name: profiler
          image: ghcr.io/open-telemetry/opentelemetry-ebpf-profiler:v0.8.0
          env:
            - name: OTEL_PROFILER_SAMPLING_FREQUENCY
              value: "19"
            - name: OTEL_PROFILER_MAX_STACK_DEPTH
              value: "64"
            - name: OTEL_PROFILER_KUBERNETES_LABEL_SELECTOR
              value: "profiling.enabled=true"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector:4317"
          securityContext:
            privileged: true
          volumeMounts:
            - name: sys-kernel
              mountPath: /sys/kernel
              readOnly: true
            - name: lib-modules
              mountPath: /lib/modules
              readOnly: true
      volumes:
        - name: sys-kernel
          hostPath:
            path: /sys/kernel
        - name: lib-modules
          hostPath:
            path: /lib/modules
```

With the label selector, only pods with `profiling.enabled=true` get profiled.

## Batching and Export Interval

The profiler agent batches samples before sending them to the collector. Larger batches mean fewer network calls but slightly more memory usage:

```bash
# Send profiles every 15 seconds instead of the default 10
-e OTEL_PROFILER_EXPORT_INTERVAL=15s
```

Longer intervals reduce the frequency of encoding and network operations, which saves CPU in the agent process itself.

## Measuring Actual Overhead

Do not just trust the configuration; measure it. Run the profiler on a staging instance under load and compare:

```bash
# Without profiler - baseline CPU
mpstat -P ALL 1 60 > baseline.txt

# With profiler running
mpstat -P ALL 1 60 > with_profiler.txt

# Compare average CPU usage across all cores
# The difference should be under 1%
```

You can also check the profiler's own resource usage:

```bash
# Check the profiler container's CPU usage
docker stats otel-ebpf-profiler --no-stream
```

A well-tuned eBPF profiler on a 16-core machine typically uses 0.1-0.3 CPU cores. That translates to 0.6-1.9% of a single core, but spread across the system it is well under 1% of total CPU.

## Memory Overhead

The profiler also uses memory for its ring buffers and symbol caches. Typical memory usage is 50-200 MB depending on the number of processes being profiled and the size of their symbol tables.

Set a memory limit on the container to prevent surprises:

```bash
docker run --rm -d \
  --memory=256m \
  --name otel-ebpf-profiler \
  # ... rest of flags
```

## Summary of Recommended Production Settings

```
Sampling frequency:  19 Hz
Max stack depth:     64 frames
Export interval:     15 seconds
Process filtering:   Enabled (only target services)
Memory limit:        256 MB
```

These settings will give you statistically valid CPU profiles with negligible impact on your application's performance. The key insight is that profiling does not need high-frequency sampling to be useful. Even at 19 Hz, you collect thousands of samples per minute, which is more than enough to identify the hot paths in your code.
