# How to Set Up Span-Level Profiling to See Exactly Which Code Executed During a

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, Tracing, Span-Level

Description: Set up span-level profiling with OpenTelemetry to pinpoint the exact code running during slow trace spans.

You have a distributed trace showing a span that took 3 seconds when it should have taken 200 milliseconds. The trace tells you the span was slow, but it does not tell you why. Was it CPU-bound computation? Memory allocation? A lock contention issue? Span-level profiling bridges this gap by attaching profiling data directly to individual trace spans.

## How Span-Level Profiling Works

The concept is straightforward. The profiling agent captures stack samples continuously. Each sample is timestamped. When the profiler also has access to trace context (span ID and trace ID), it can tag each profiling sample with the span that was active at the time the sample was taken.

Later, when you look at a specific span in your trace UI, you can pull up only the profiling samples that occurred during that span. This gives you a flame graph scoped to exactly what happened in that span.

## Configuring the SDK for Span-Profile Linking

For Java, use the OpenTelemetry Java agent with the Pyroscope OpenTelemetry Java agent extension:

```bash
curl -L -o opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar

curl -L -o pyroscope-otel.jar \
  https://github.com/grafana/otel-profiling-java/releases/download/v1.0.4/pyroscope-otel.jar

export PYROSCOPE_APPLICATION_NAME=my-java-service
export PYROSCOPE_SERVER_ADDRESS=http://pyroscope:4040
export OTEL_JAVAAGENT_EXTENSIONS=./pyroscope-otel.jar

java \
  -javaagent:./opentelemetry-javaagent.jar \
  -jar app.jar
```

```java
// Your application code can keep using normal OpenTelemetry spans.
Span span = tracer.spanBuilder("process-order").startSpan();
try (Scope scope = span.makeCurrent()) {
    processOrder();
} finally {
    span.end();
}
```

The extension hooks into span start and end events. When a span starts, it annotates profiling data with the active span ID so Grafana can query for span-specific profiling data. Java span profiles support CPU and wall profile types; for example, set `PYROSCOPE_PROFILER_EVENT=wall` when you want wall-clock profiling instead of CPU profiling.

## Python Setup

For Python applications using the Pyroscope Python profiler:

```python
# Install the required packages

# pip install opentelemetry-api opentelemetry-sdk pyroscope-io pyroscope-otel

import pyroscope
from opentelemetry import trace
from pyroscope.otel import PyroscopeSpanProcessor
from opentelemetry.sdk.trace import TracerProvider

# Configure Pyroscope before creating spans
pyroscope.configure(
    application_name="my-python-service",
    server_address="http://pyroscope:4040",
)

# Set up the tracer
provider = TracerProvider()
provider.add_span_processor(PyroscopeSpanProcessor())
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

Make sure your collector handles both traces and profiles and preserves the span-profile link. Profile signal support may require a recent collector build and enabling `service.profilesSupport`:

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
  otlp/pyroscope:
    endpoint: pyroscope:4040
    tls:
      insecure: true

service:
  telemetry:
    logs:
      level: info
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/tempo]
    profiles:
      receivers: [otlp]
      exporters: [otlp/pyroscope]
```

If your collector distribution still gates profile pipelines, start it with `--feature-gates=service.profilesSupport`.

## What to Look For

When you open the span-level flame graph for a slow span, focus on:

1. Functions with high self-time. These are doing the actual work.
2. Unexpected functions. If you see serialization code in a span that should only be doing a database query, that is a clue.
3. Lock contention. If you see threads blocked on mutexes or condition variables, the span may be slow due to contention rather than computation.

Span-level profiling turns "this span is slow" from a dead-end observation into an actionable starting point for optimization. You no longer need to reproduce the issue locally with a profiler attached. The production profiling data is right there, linked to the exact span that was slow.
