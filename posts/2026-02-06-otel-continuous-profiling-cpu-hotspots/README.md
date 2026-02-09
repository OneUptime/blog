# How to Use OpenTelemetry Continuous Profiling to Correlate CPU Hotspots with Slow Trace Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Continuous Profiling, CPU Profiling, Performance Optimization, Traces

Description: Use OpenTelemetry continuous profiling to identify CPU hotspots and correlate them with slow trace spans for targeted performance optimization.

Distributed traces tell you which operation is slow. CPU profiles tell you why it is slow. When you combine the two, you can go from "the order validation span takes 800ms" to "the order validation span takes 800ms because the JSON schema validator consumes 650ms of CPU time in the deepSchemaCheck function." That level of detail changes how you approach optimization.

## OpenTelemetry Profiling Overview

OpenTelemetry's profiling signal (still evolving as of early 2026) links CPU profiles to specific trace spans. The profiler continuously samples the call stack and tags each sample with the active span context, so you can later filter profiles by trace ID or span ID.

## Setting Up Continuous Profiling in Go

Here is how to set up the Pyroscope-based profiler with OpenTelemetry span correlation in a Go service:

```go
// profiling_setup.go
package main

import (
    "os"
    "runtime"

    "github.com/grafana/pyroscope-go"
    otelpyroscope "github.com/grafana/otel-profiling-go"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/sdk/trace"
)

func initProfilingWithTraceCorrelation() {
    // Start the Pyroscope continuous profiler
    pyroscope.Start(pyroscope.Config{
        ApplicationName: "order-service",
        ServerAddress:   os.Getenv("PYROSCOPE_SERVER_URL"),
        Logger:          pyroscope.StandardLogger,
        // Enable CPU and memory profiling
        ProfileTypes: []pyroscope.ProfileType{
            pyroscope.ProfileCPU,
            pyroscope.ProfileAllocObjects,
            pyroscope.ProfileAllocSpace,
            pyroscope.ProfileInuseObjects,
            pyroscope.ProfileInuseSpace,
            pyroscope.ProfileGoroutines,
        },
        // Tag profiles with pod identity
        Tags: map[string]string{
            "hostname": os.Getenv("HOSTNAME"),
            "version":  os.Getenv("APP_VERSION"),
        },
    })

    // Wrap the OTel tracer provider with Pyroscope's profiling integration
    // This links profile samples to active trace spans
    tp := trace.NewTracerProvider(
        trace.WithBatcher(traceExporter),
    )

    // The Pyroscope wrapper intercepts span start/stop to tag profile samples
    otel.SetTracerProvider(otelpyroscope.NewTracerProvider(tp))
}
```

## Setting Up Continuous Profiling in Python

For Python applications, use the `py-spy` profiler with OpenTelemetry integration:

```python
# profiling_setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from pyroscope import configure as pyroscope_configure
from pyroscope.otel import PyroscopeSpanProcessor
import os

def init_profiling():
    # Configure Pyroscope for continuous profiling
    pyroscope_configure(
        application_name="order-service-python",
        server_address=os.environ.get("PYROSCOPE_SERVER_URL", "http://pyroscope:4040"),
        tags={
            "hostname": os.environ.get("HOSTNAME", "unknown"),
            "version": os.environ.get("APP_VERSION", "unknown"),
        },
    )

    # Create a tracer provider with the Pyroscope span processor
    # This processor tags profile samples with span context
    provider = TracerProvider()
    provider.add_span_processor(PyroscopeSpanProcessor())
    trace.set_tracer_provider(provider)

    return trace.get_tracer("order-service")

tracer = init_profiling()

# Now any span created with this tracer will have linked CPU profiles
@tracer.start_as_current_span("process_order")
def process_order(order):
    validate_order(order)   # CPU-heavy validation
    calculate_tax(order)    # Complex tax calculation
    apply_discounts(order)  # Discount rule evaluation
    return save_order(order)
```

## Querying Profiles for Specific Spans

Once profiling data is linked to spans, you can query for the CPU profile of a specific slow span:

```python
# query_span_profile.py
import requests

PYROSCOPE_URL = "http://pyroscope:4040"
TEMPO_URL = "http://tempo:3200"

def find_slow_spans(service_name, operation, min_duration_ms=500):
    """Find slow spans from Tempo."""
    query = f'{{resource.service.name="{service_name}" && name="{operation}" && duration>{min_duration_ms}ms}}'
    resp = requests.get(f"{TEMPO_URL}/api/search", params={"q": query, "limit": 10})
    return resp.json().get("traces", [])

def get_span_profile(span_id, start_time, end_time):
    """Fetch the CPU profile for a specific span's time window."""
    resp = requests.get(f"{PYROSCOPE_URL}/api/v1/query", params={
        "query": 'order-service.cpu{span_id="' + span_id + '"}',
        "from": start_time,
        "until": end_time,
        "format": "json",
    })
    return resp.json()

def analyze_slow_spans():
    slow_spans = find_slow_spans("order-service", "process_order", 500)

    for span_info in slow_spans:
        trace_id = span_info["traceID"]
        print(f"\nAnalyzing trace {trace_id}")

        # Get detailed span info from Tempo
        trace_resp = requests.get(f"{TEMPO_URL}/api/traces/{trace_id}")
        trace_data = trace_resp.json()

        for batch in trace_data.get("batches", []):
            for span in batch.get("scopeSpans", [{}])[0].get("spans", []):
                if span.get("name") == "process_order":
                    span_id = span["spanId"]
                    start = span["startTimeUnixNano"]
                    end = span["endTimeUnixNano"]

                    profile = get_span_profile(span_id, start, end)
                    print(f"  Span {span_id}: top CPU consumers:")
                    for frame in profile.get("flamebearer", {}).get("names", [])[:5]:
                        print(f"    - {frame}")

if __name__ == "__main__":
    analyze_slow_spans()
```

## Building a Correlation Dashboard

In Grafana, you can build a dashboard that shows traces and their associated profiles side by side:

```
Panel 1: Slow Spans Table (Tempo data source)
  Query: {resource.service.name="order-service" && duration>500ms}
  Columns: traceID, spanID, name, duration, status

Panel 2: CPU Flame Graph (Pyroscope data source)
  Query: order-service.cpu{span_id="$selected_span_id"}
  Visualization: Flame Graph

Panel 3: Top Functions by CPU Time
  Query: topk(10, order-service.cpu{span_id="$selected_span_id"})
```

Use Grafana's drill-down feature so clicking a slow span in Panel 1 automatically updates the profile panels.

## Practical Optimization Workflow

The workflow for using correlated profiles is straightforward:

1. Find slow spans by querying traces with durations above your threshold.
2. Pull the CPU profile for that specific span's time window.
3. Look at the flame graph to identify which function is consuming the most CPU time.
4. Optimize that specific function.
5. Deploy and verify the span duration decreased.

This is far more efficient than traditional profiling because you are only looking at profiles from actual slow operations, not from the entire application. You skip the noise and go straight to the problem.

## When Profiling Overhead Matters

Continuous profiling does add some overhead. CPU profiling at 100Hz sampling rate typically adds 1-3% overhead. For most production services this is acceptable, but for latency-critical paths you might want to sample less aggressively.

You can also enable profiling only for a percentage of requests using a head-based sampler that decides at the start of each trace whether to enable profiling for that request.

## Wrapping Up

Correlating CPU profiles with OpenTelemetry traces is the fastest path from "this span is slow" to "this function is the bottleneck." Continuous profiling captures the data passively, so it is always available when you need it. Combined with trace-based querying, you can jump from an alert about slow latency directly to the flame graph showing where the CPU time is spent.
