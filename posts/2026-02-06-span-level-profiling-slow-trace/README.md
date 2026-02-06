# How to Set Up Span-Level Profiling to See Exactly Which Code Executed During a Slow Trace Span

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, Tracing, Span-Level

Description: Set up span-level profiling with OpenTelemetry to pinpoint the exact code running during slow trace spans.

You have a distributed trace showing a span that took 3 seconds when it should have taken 200 milliseconds. The trace tells you the span was slow, but it does not tell you why. Was it CPU-bound computation? Memory allocation? A lock contention issue? Span-level profiling bridges this gap by attaching profiling data directly to individual trace spans.

## How Span-Level Profiling Works

The concept is straightforward. The profiling agent captures stack samples continuously. Each sample is timestamped. When the profiler also has access to trace context (span ID and trace ID), it can tag each profiling sample with the span that was active at the time the sample was taken.

Later, when you look at a specific span in your trace UI, you can pull up only the profiling samples that occurred during that span. This gives you a flame graph scoped to exactly what happened in that span.

## Configuring the SDK for Span-Profile Linking

For Java, the OpenTelemetry Java agent supports this out of the box when paired with a profiling agent like Pyroscope's:

```java
// build.gradle
dependencies {
    implementation 'io.pyroscope:otel:0.13.0'
    implementation 'io.opentelemetry:opentelemetry-api:1.36.0'
}
```

```java
// In your application startup
import io.pyroscope.otel.SpanProcessor;

// Create a span processor that links profiling samples to spans
SpanProcessor profilingSpanProcessor = new SpanProcessor();

// Register it with the OpenTelemetry SDK
SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
    .addSpanProcessor(profilingSpanProcessor)
    .build();

OpenTelemetrySdk sdk = OpenTelemetrySdk.builder()
    .setTracerProvider(tracerProvider)
    .build();
```

The `SpanProcessor` hooks into span start and end events. When a span starts, it records the span ID. The profiling agent then tags all samples captured on that thread with the active span ID.

## Python Setup

For Python applications using the `py-spy` or `ebpf` profiler:

```python
# Install the required packages
# pip install opentelemetry-api opentelemetry-sdk pyroscope-io

import pyroscope
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter

# Configure Pyroscope with span profiling enabled
pyroscope.configure(
    application_name="my-python-service",
    server_address="http://pyroscope:4040",
    enable_otel_span_profiles=True,  # This is the key setting
)

# Set up the tracer
provider = TracerProvider()
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("my-service")

# Now any span you create will have profiling data attached
with tracer.start_as_current_span("process-order") as span:
    # All CPU samples during this block get linked to this span
    result = expensive_computation()
    save_to_database(result)
```

## Go Setup

```go
package main

import (
    "context"
    "github.com/grafana/pyroscope-go"
    otelpyroscope "github.com/grafana/otel-profiling-go"
    "go.opentelemetry.io/otel"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func main() {
    // Start Pyroscope profiler
    pyroscope.Start(pyroscope.Config{
        ApplicationName: "my-go-service",
        ServerAddress:   "http://pyroscope:4040",
    })

    // Wrap the tracer provider with profiling support
    tp := sdktrace.NewTracerProvider()
    otel.SetTracerProvider(otelpyroscope.NewTracerProvider(tp))

    tracer := otel.Tracer("my-service")

    ctx, span := tracer.Start(context.Background(), "handle-request")
    defer span.End()

    // Profiling samples during this span are tagged with span ID
    processRequest(ctx)
}
```

## Viewing Span-Level Profiles

In Grafana, when you open a trace view and click on a specific span, you will see a "Profiles" tab if span-level profiling is configured. Clicking it shows the flame graph filtered to only the samples captured during that span's execution window.

This is extremely powerful for debugging. Instead of looking at a system-wide flame graph and guessing which part corresponds to your slow span, you get a precise view of what happened.

## Collector Configuration

Make sure your collector handles both traces and profiles and preserves the span-profile link:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true
  otlphttp/pyroscope:
    endpoint: http://pyroscope:4040

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/tempo]
    profiles:
      receivers: [otlp]
      exporters: [otlphttp/pyroscope]
```

## What to Look For

When you open the span-level flame graph for a slow span, focus on:

1. Functions with high self-time. These are doing the actual work.
2. Unexpected functions. If you see serialization code in a span that should only be doing a database query, that is a clue.
3. Lock contention. If you see threads blocked on mutexes or condition variables, the span may be slow due to contention rather than computation.

Span-level profiling turns "this span is slow" from a dead-end observation into an actionable starting point for optimization. You no longer need to reproduce the issue locally with a profiler attached. The production profiling data is right there, linked to the exact span that was slow.
