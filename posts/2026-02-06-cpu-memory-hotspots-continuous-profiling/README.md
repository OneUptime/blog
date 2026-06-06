# How to Monitor CPU and Memory Allocation Hotspots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, CPU, Memory

Description: Monitor CPU and memory allocation hotspots in production using OpenTelemetry continuous profiling techniques.

Monitoring CPU and memory usage at the process level tells you that a service is consuming too many resources. Continuous profiling tells you exactly which functions are responsible. With OpenTelemetry's profiling signal, you can capture CPU and memory allocation profiles continuously and pinpoint the hotspots down to specific functions, and in some runtimes to individual lines of code.

## CPU Profiling vs Memory Allocation Profiling

These are two different profile types, and they answer different questions.

**CPU profiling** samples the call stack at regular intervals (e.g., 19 times per second). Each sample represents a moment when the CPU was executing a particular function. Aggregated over time, this shows which functions consume the most CPU cycles.

**Memory allocation profiling** tracks every allocation (or a sampled subset). Instead of measuring time, it measures bytes allocated. This shows which functions create the most garbage and put the most pressure on the garbage collector.

You typically want both running simultaneously.

## Setting Up CPU Profiling with the eBPF Agent

The OpenTelemetry eBPF profiler runs as a specialized OpenTelemetry Collector distribution with a `profiling` receiver:

```yaml
receivers:
  profiling:
    samples_per_second: 97

exporters:
  otlp_grpc:
    endpoint: pyroscope:4040
    tls:
      insecure: true

service:
  pipelines:
    profiles:
      receivers: [profiling]
      exporters: [otlp_grpc]
```

Run the collector with host access and the profiles feature gate enabled:

```bash
docker run --rm -d \
  --name otel-ebpf-profiler \
  --privileged \
  --pid=host \
  -v "$(pwd)/ebpf-profiler-config.yaml:/etc/ebpf-profiler-config.yaml:ro" \
  -v /sys/kernel/debug:/sys/kernel/debug:ro \
  -v /sys/fs/cgroup:/sys/fs/cgroup:ro \
  -v /proc:/proc:ro \
  otel/opentelemetry-collector-ebpf-profiler:0.147.0 \
  --config=/etc/ebpf-profiler-config.yaml \
  --feature-gates=service.profilesSupport
```

This captures CPU stack samples across all processes on the host.

## Setting Up Memory Allocation Profiling in Go

Go has built-in memory allocation profiling support. The Pyroscope Go SDK exposes it:

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

The OpenTelemetry eBPF profiler collects CPU profiles. For Java allocation profiling, use a Java profiler such as the Pyroscope Java agent, which uses async-profiler:

```bash
PYROSCOPE_APPLICATION_NAME=order-service \
PYROSCOPE_SERVER_ADDRESS=http://pyroscope:4040 \
PYROSCOPE_PROFILER_ALLOC=512k \
PYROSCOPE_PROFILING_INTERVAL=10ms \
java -javaagent:pyroscope.jar -jar app.jar
```

## Identifying CPU Hotspots

Once data is flowing into your profiling backend, open the CPU flame graph. Look for these patterns:

```text
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

```text
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
  otlp/pyroscope:
    endpoint: pyroscope:4040
    tls:
      insecure: true

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/pyroscope]
```

Start the collector with `--feature-gates=service.profilesSupport` while the profiles signal requires the feature gate.

## Setting Up Alerts on Profile Data

You can query Pyroscope's API to build alerts when a specific function exceeds a CPU or memory threshold:

```bash
# Query the top functions by CPU usage over the last hour
curl -G http://pyroscope:4040/api/v1/query \
  --data-urlencode "query=process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name=\"order-service\"}" \
  --data-urlencode "from=now-1h" \
  --data-urlencode "until=now"
```

Pair this with your alerting system. If a known function starts consuming more than its expected share of CPU or memory, you catch the regression before it impacts users.

Continuous profiling with OpenTelemetry makes CPU and memory hotspot detection a routine part of operations rather than an emergency debugging exercise. With appropriate sampling and version testing, the overhead can be low enough to run continuously, and the insights are specific enough to act on immediately.
