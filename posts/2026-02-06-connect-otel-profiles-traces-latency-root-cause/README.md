# How to Connect OpenTelemetry Profiles to Traces for Code-Level Latency Root Cause Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, Distributed Tracing, Root Cause Analysis

Description: Correlate OpenTelemetry profiling data with distributed traces to pinpoint exact code paths causing latency in your production applications.

Distributed tracing tells you which service is slow. Profiling tells you which function is slow. When you connect the two, you get the complete picture: a slow trace leads you directly to the exact line of code responsible. This is the promise of OpenTelemetry's unified profiling signal, and it works today.

## The Correlation Model

OpenTelemetry connects profiles to traces through shared context. When a profiling sample is captured, the profiler checks if there is an active span on the current thread. If there is, it attaches the trace ID and span ID to the profile sample. Later, when you are investigating a slow trace, you can pull up the associated profile samples to see exactly what the code was doing during that span.

The connection works through these shared fields:

- `trace_id`: Links the profile sample to a specific trace
- `span_id`: Links the profile sample to a specific span within that trace
- `timestamp`: Aligns the profile sample with the span's time window

## Setting Up Trace-Profile Correlation in Java

For Java applications using the OpenTelemetry Java agent, enable profiling with trace correlation:

```bash
# Start your Java application with the OTel agent and profiling enabled
java \
  -javaagent:/opt/opentelemetry-javaagent.jar \
  -Dotel.exporter.otlp.endpoint=http://localhost:4317 \
  -Dotel.service.name=payment-service \
  -Dotel.instrumentation.common.experimental.controller-telemetry.enabled=true \
  -Dotel.profiling.enabled=true \
  -Dotel.profiling.sampling.interval=10ms \
  -jar payment-service.jar
```

The Java agent automatically correlates profile samples with active spans. When a sample is taken during an active span, the trace context is included in the profile data.

## Setting Up Trace-Profile Correlation in Go

For Go applications, use the OpenTelemetry Go SDK with the profiling bridge:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "runtime/pprof"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
    "go.opentelemetry.io/otel/attribute"
)

func initTracer() (*trace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(
        context.Background(),
        otlptracegrpc.WithEndpoint("localhost:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithSampler(trace.AlwaysSample()),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}

// handleRequest processes an HTTP request with tracing and profiling context
func handleRequest(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    tracer := otel.Tracer("payment-service")

    // Start a span
    ctx, span := tracer.Start(ctx, "processPayment")
    defer span.End()

    // Add the trace context to pprof labels so profiling data
    // can be correlated with this span
    traceID := span.SpanContext().TraceID().String()
    spanID := span.SpanContext().SpanID().String()

    pprof.Do(ctx, pprof.Labels(
        "trace_id", traceID,
        "span_id", spanID,
    ), func(ctx context.Context) {
        // Your business logic here
        result := processPayment(ctx)
        span.SetAttributes(attribute.String("payment.status", result))
    })

    w.WriteHeader(http.StatusOK)
}
```

## Querying Correlated Data

Once both traces and profiles are flowing to your backend, you can query them together. Here is how to find profile data for a specific slow trace:

```python
# query_profiles_for_trace.py
# Example using a hypothetical backend API

import requests

# You found a slow trace in your tracing UI
slow_trace_id = "abc123def456789"

# Query the profiling backend for samples matching this trace
response = requests.get(
    "https://profiling-backend.internal/api/v1/profiles",
    params={
        "trace_id": slow_trace_id,
        "start_time": "2026-02-06T10:00:00Z",
        "end_time": "2026-02-06T10:05:00Z",
    }
)

profile_data = response.json()

# The response contains stack traces captured during the trace's execution
for sample in profile_data["samples"]:
    print(f"Span: {sample['span_id']}")
    print(f"Timestamp: {sample['timestamp']}")
    print(f"Stack trace:")
    for frame in sample["stack_trace"]:
        print(f"  {frame['function']} ({frame['file']}:{frame['line']})")
    print()
```

## Collector Configuration for Correlated Data

Configure your collector to handle both traces and profiles, maintaining the correlation:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch/traces:
    timeout: 5s
    send_batch_size: 512
  batch/profiles:
    timeout: 10s
    send_batch_size: 256

exporters:
  otlp/traces:
    endpoint: tracing-backend.internal:4317
  otlphttp/profiles:
    endpoint: https://profiling-backend.internal/v1/profiles

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch/traces]
      exporters: [otlp/traces]
    profiles:
      receivers: [otlp]
      processors: [batch/profiles]
      exporters: [otlphttp/profiles]
```

## The Investigation Workflow

Here is a practical example of using trace-profile correlation to find a latency root cause:

1. Your alerting system fires: "P99 latency for /api/checkout exceeded 2 seconds"

2. You open your tracing UI and find a slow trace for the checkout endpoint. The trace shows:
   - `HTTP GET /api/checkout` - 2.3 seconds
   - `processOrder` - 2.1 seconds
   - `validateInventory` - 0.05 seconds
   - `calculateTax` - 2.0 seconds
   - `chargePayment` - 0.05 seconds

3. The `calculateTax` span is the bottleneck. You click on it to see the associated profile data.

4. The profile shows the CPU was spending most of its time in:
   ```
   calculateTax (tax.go:45)
     -> lookupTaxRate (tax.go:112)
       -> json.Unmarshal (encoding/json/decode.go:96)
         -> reflect.Value.Set (reflect/value.go:1500)
   ```

5. Now you know: the `lookupTaxRate` function is deserializing JSON on every call instead of caching the tax rate table. The fix is clear.

Without the profile data, you would know that `calculateTax` is slow but not why. Without the trace data, you would see high CPU usage in JSON unmarshaling but not know which user-facing endpoint it affects. Together, you get the full story from symptom to root cause.

## Tips for Effective Correlation

Keep the profiling sampling rate high enough to capture samples during short spans. If your spans are 100ms and you sample every 100ms, you might miss some spans entirely. A 10ms sampling interval gives you roughly 10 samples per 100ms span, which is enough to build a useful flame graph.

Make sure your clocks are synchronized across hosts. Profile-trace correlation depends on timestamps aligning correctly. Use NTP or chrony on all hosts.

Store traces and profiles in systems that support cross-referencing by trace ID. The value of correlation is only realized when your tooling can actually join the two datasets together.
