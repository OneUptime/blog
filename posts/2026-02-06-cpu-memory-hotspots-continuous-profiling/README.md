# How to Monitor CPU and Memory Allocation Hotspots with OpenTelemetry Continuous Profiling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, CPU, Memory

Description: Monitor CPU and memory allocation hotspots in production using OpenTelemetry continuous profiling techniques.

Monitoring CPU and memory usage at the process level tells you that a service is consuming too many resources. Continuous profiling tells you exactly which functions are responsible. With OpenTelemetry's profiling signal, you can capture both CPU and memory allocation profiles continuously in production and pinpoint the hotspots down to individual lines of code.

## CPU Profiling vs Memory Allocation Profiling

These are two different profile types, and they answer different questions.

**CPU profiling** samples the call stack at regular intervals (e.g., 19 times per second). Each sample represents a moment when the CPU was executing a particular function. Aggregated over time, this shows which functions consume the most CPU cycles.

**Memory allocation profiling** tracks every allocation (or a sampled subset). Instead of measuring time, it measures bytes allocated. This shows which functions create the most garbage and put the most pressure on the garbage collector.

You typically want both running simultaneously.

## Setting Up CPU Profiling with the eBPF Agent

The OpenTelemetry eBPF profiler captures CPU profiles by default:

```bash
docker run --rm -d \
  --name otel-profiler \
  --privileged \
  --pid=host \
  -v /sys/kernel:/sys/kernel:ro \
  -v /lib/modules:/lib/modules:ro \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317 \
  -e OTEL_PROFILER_SAMPLING_FREQUENCY=19 \
  ghcr.io/open-telemetry/opentelemetry-ebpf-profiler:v0.8.0
```

This captures CPU stack samples at 19 Hz across all processes on the host.

## Setting Up Memory Allocation Profiling in Go

Go has built-in memory allocation profiling support. The OpenTelemetry Go profiling integration exposes it:

```go
package main

import (
    "runtime"
    "github.com/grafana/pyroscope-go"
)

func main() {
    // Set the memory profiling rate
    // 1 means profile every allocation; 512*1024 samples 1 in every 512KB
    runtime.MemProfileRate = 512 * 1024

    pyroscope.Start(pyroscope.Config{
        ApplicationName: "order-service",
        ServerAddress:   "http://pyroscope:4040",
        ProfileTypes: []pyroscope.ProfileType{
            pyroscope.ProfileCPU,
            pyroscope.ProfileAllocObjects,  // Number of allocations
            pyroscope.ProfileAllocSpace,    // Bytes allocated
            pyroscope.ProfileInuseObjects,  // Currently live objects
            pyroscope.ProfileInuseSpace,    // Currently live bytes
        },
    })

    // Your application code here
    startServer()
}
```

The difference between `Alloc` and `Inuse` profiles matters. `AllocSpace` shows total bytes allocated over time, including objects that were already garbage collected. `InuseSpace` shows bytes that are currently live in memory. A function that allocates heavily but temporarily will show up in `AllocSpace` but not in `InuseSpace`.

## Setting Up Memory Profiling in Java

For Java, the async-profiler (which the OTel eBPF profiler uses under the hood for JVM processes) supports allocation profiling:

```yaml
# profiler agent configuration
profiling:
  cpu:
    enabled: true
    interval: 10ms
  alloc:
    enabled: true
    # Sample every 512KB of allocations
    interval: 524288
```

## Identifying CPU Hotspots

Once data is flowing into your profiling backend, open the CPU flame graph. Look for these patterns:

```
# Example CPU hotspot pattern:
#
# handleRequest                [======================] 45% of total CPU
#   parseJSON                  [================]       32% of total CPU
#     decodeUTF8               [============]           25% of total CPU
#   validateInput              [===]                     6% of total CPU
#   writeResponse              [==]                      4% of total CPU
```

In this example, `decodeUTF8` is the clear CPU hotspot. It accounts for 25% of all CPU samples. You might optimize this by switching to a faster JSON parser or by caching parsed results.

## Identifying Memory Allocation Hotspots

Memory flame graphs look similar but represent bytes allocated instead of CPU time:

```
# Example memory allocation hotspot:
#
# processOrder               [======================] 800MB allocated/min
#   serializeResponse        [===============]        550MB allocated/min
#     String.concat           [===========]           420MB allocated/min
#   queryDatabase            [=====]                  180MB allocated/min
#     buildResultSet         [====]                   150MB allocated/min
```

Here, `String.concat` inside response serialization is allocating 420MB per minute. This is a classic pattern: string concatenation in a loop. Switching to a StringBuilder or buffer would drastically reduce allocation pressure.

## Collector Pipeline for Multiple Profile Types

Configure your collector to handle both CPU and memory profiles:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 15s
    send_batch_size: 500

exporters:
  otlphttp/pyroscope:
    endpoint: http://pyroscope:4040

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/pyroscope]
```

## Setting Up Alerts on Profile Data

You can query Pyroscope's API to build alerts when a specific function exceeds a CPU or memory threshold:

```bash
# Query the top functions by CPU usage over the last hour
curl -G http://pyroscope:4040/api/v1/query \
  --data-urlencode "query=process_cpu:cpu:nanoseconds{service_name=\"order-service\"}" \
  --data-urlencode "from=now-1h" \
  --data-urlencode "until=now"
```

Pair this with your alerting system. If a known function starts consuming more than its expected share of CPU or memory, you catch the regression before it impacts users.

Continuous profiling with OpenTelemetry makes CPU and memory hotspot detection a routine part of operations rather than an emergency debugging exercise. The overhead is low enough to run in production, and the insights are specific enough to act on immediately.
