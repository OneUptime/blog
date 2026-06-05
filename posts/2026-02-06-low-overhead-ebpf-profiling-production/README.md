# How to Configure Low-Overhead eBPF Profiling for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, eBPF, Profiling, Production

Description: Configure eBPF-based profiling for production environments with under 1% CPU overhead using tuned settings.

The number one concern teams have about running profilers in production is overhead. Nobody wants their observability tooling to become the performance problem. The good news is that eBPF-based profiling, when configured properly, is designed to stay under 1% CPU impact. This post walks through the settings you can tune to keep overhead low.

## Understanding Where the Overhead Comes From

eBPF profilers have three main sources of overhead:

1. **Sampling interrupts**: Each time a sample is taken, the CPU is interrupted to capture the current stack trace. More samples per second means more interrupts.
2. **Stack unwinding**: Walking the call stack from the current instruction pointer back to the root frame requires reading memory. Deep stacks take longer to unwind.
3. **Data transfer**: Moving captured samples from the kernel eBPF ring buffer to the userspace agent, then encoding and shipping them to the collector.

Each of these can be tuned independently.

## Tuning the Sampling Frequency

The sampling frequency has the most direct impact on overhead. The OpenTelemetry eBPF profiling receiver defaults to 20 Hz (20 samples per second per CPU core), which is already quite conservative.

```yaml
# config.yaml
receivers:
  profiling:
    samples_per_second: 20

exporters:
  otlp:
    endpoint: http://collector:4317
    tls:
      insecure: true

service:
  pipelines:
    profiles:
      receivers: [profiling]
      exporters: [otlp]
```

Run the supported OpenTelemetry Collector eBPF profiling distribution with that config:

```bash
docker run --rm -d \
  --name otel-ebpf-profiler \
  --privileged \
  --pid=host \
  -v /sys:/sys \
  -v "$(pwd)/config.yaml:/etc/otelcol-ebpf-profiler/config.yaml:ro" \
  otel/opentelemetry-collector-ebpf-profiler:0.153.0 \
  --config=/etc/otelcol-ebpf-profiler/config.yaml \
  --feature-gates=+service.profilesSupport
```

At 20 Hz on a 16-core machine, that is 320 samples per second total. The exact overhead depends on workload, stack shape, kernel, and symbolization cost, so measure it on your own staging load.

If you want even lower overhead, drop to 9 Hz:

```yaml
receivers:
  profiling:
    samples_per_second: 9
```

Below that, the profiles become less statistically meaningful, so it is usually not worth going lower.

## Limiting Unwinding Work

Deep stacks are more expensive to unwind. The current OpenTelemetry eBPF profiling receiver does not expose a `max_stack_depth` setting, so avoid unsupported environment variables such as `OTEL_PROFILER_MAX_STACK_DEPTH`. Keep the supported receiver settings explicit instead:

```yaml
receivers:
  profiling:
    samples_per_second: 20
    tracers: all
    off_cpu_threshold: 0
```

Most useful profiling information is still in the top part of the stack. The very bottom of the stack is usually runtime initialization and framework boilerplate that rarely changes.

## Filtering Processes

The supported OpenTelemetry eBPF profiling distribution is a node agent that gathers profiles for processes running on the system. It does not currently provide `OTEL_PROFILER_FILTER_PROCESS_NAMES` or `OTEL_PROFILER_KUBERNETES_LABEL_SELECTOR` receiver settings.

In Kubernetes, run it as a DaemonSet and filter or aggregate profiles downstream by process, container, pod, namespace, or resource attributes:

```yaml
# Kubernetes DaemonSet for the profiler
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-ebpf-profiler
spec:
  selector:
    matchLabels:
      app: otel-ebpf-profiler
  template:
    metadata:
      labels:
        app: otel-ebpf-profiler
    spec:
      hostPID: true
      containers:
        - name: profiler
          image: otel/opentelemetry-collector-ebpf-profiler:0.153.0
          args:
            - "--config=/etc/otelcol-ebpf-profiler/config.yaml"
            - "--feature-gates=+service.profilesSupport"
          securityContext:
            privileged: true
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol-ebpf-profiler/config.yaml
              subPath: config.yaml
            - name: sys-kernel
              mountPath: /sys
      volumes:
        - name: config
          configMap:
            name: otel-ebpf-profiler-config
        - name: sys-kernel
          hostPath:
            path: /sys
```

Then use your backend or Collector pipeline to focus analysis on the services you care about.

## Batching and Export Interval

The profiler agent batches samples before sending them to the collector. Larger batches mean fewer network calls but slightly more memory usage:

```yaml
receivers:
  profiling:
    reporter_interval: 15s
```

The default reporter interval is 5 seconds. Longer intervals reduce the frequency of encoding and network operations, which can save CPU in the profiler process itself.

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

The OpenTelemetry eBPF profiler targets 1% CPU as an upper limit in project testing, and it typically stays below that. Treat your own workload measurement as the source of truth.

## Memory Overhead

The profiler also uses memory for its eBPF maps, queues, and symbol metadata. The project targets about 250 MB as an upper limit in testing, with actual usage depending on the number of processes being profiled and the size of their symbol tables.

Set a memory limit on the container to prevent surprises:

```bash
docker run --rm -d \
  --memory=256m \
  --name otel-ebpf-profiler \
  # ... rest of flags
```

## Summary of Recommended Production Settings

```text
Sampling frequency:  20 Hz
Off-CPU profiling:   Disabled unless needed
Export interval:     15 seconds
Process filtering:   Filter downstream by profile attributes
Memory limit:        256 MB
```

These settings will give you statistically useful CPU profiles with negligible impact on your application's performance. The key insight is that profiling does not need high-frequency sampling to be useful. Even at 20 Hz, you collect thousands of samples per minute on multi-core hosts, which is enough to identify the hot paths in your code.
