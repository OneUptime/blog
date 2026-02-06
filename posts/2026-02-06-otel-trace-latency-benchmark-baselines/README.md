# How to Set Up Performance Benchmark Baselines from OpenTelemetry Trace Latency Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Performance Benchmarks, Traces, Latency, Baselines

Description: A step-by-step guide to establishing performance benchmark baselines using OpenTelemetry trace latency data for reliable comparisons.

Without a solid baseline, performance numbers are just noise. You need a reference point to know whether your latest deploy made things faster or slower. OpenTelemetry traces give you rich latency data for every operation in your system, and that data is perfect for building performance baselines.

This post covers how to collect, aggregate, and store trace latency baselines that you can compare against going forward.

## What Makes a Good Baseline

A good performance baseline is collected under controlled conditions. That means consistent load, consistent infrastructure, and enough samples to be statistically meaningful. You want to capture the P50, P95, and P99 latencies for your critical paths.

## Collecting Trace Data with OpenTelemetry

Start by instrumenting your application. Here is a Python example using the OpenTelemetry SDK:

```python
# app_tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Set up the tracer with service metadata
resource = Resource.create({
    "service.name": "order-service",
    "service.version": "1.4.2",
    "deployment.environment": "staging",
})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("order-service")
```

Now instrument the endpoints you want to benchmark:

```python
# order_handler.py
from app_tracing import tracer
import time

@tracer.start_as_current_span("process_order")
def process_order(order_data):
    span = trace.get_current_span()
    span.set_attribute("order.item_count", len(order_data["items"]))
    span.set_attribute("order.total_value", order_data["total"])

    # Validate the order
    with tracer.start_as_current_span("validate_order"):
        validate(order_data)

    # Charge payment
    with tracer.start_as_current_span("charge_payment"):
        charge(order_data["payment"])

    # Update inventory
    with tracer.start_as_current_span("update_inventory"):
        update_stock(order_data["items"])

    return {"status": "completed"}
```

## Extracting Baseline Metrics from Traces

Once your application is producing traces, you need to aggregate them into baseline numbers. The OpenTelemetry Collector's Span Metrics Connector can do this automatically:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  spanmetrics:
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]
    dimensions:
      - name: http.route
      - name: deployment.environment
    exemplars:
      enabled: true

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  otlp/storage:
    endpoint: "tempo:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [spanmetrics, otlp/storage]
    metrics:
      receivers: [spanmetrics]
      exporters: [prometheus]
```

## Building the Baseline Script

Run this script after a controlled benchmark test to capture and store the baseline:

```python
# capture_baseline.py
import requests
import json
import os
from datetime import datetime

PROMETHEUS_URL = os.environ.get("PROMETHEUS_URL", "http://localhost:8889")
BASELINE_FILE = "perf_baselines.json"

ENDPOINTS_TO_TRACK = [
    "process_order",
    "validate_order",
    "charge_payment",
    "update_inventory",
]

def query_percentile(span_name, percentile):
    """Query a specific percentile from the span metrics histogram."""
    query = (
        f'histogram_quantile({percentile}, '
        f'sum(rate(duration_milliseconds_bucket{{span_name="{span_name}"}}[5m])) by (le))'
    )
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    result = resp.json()["data"]["result"]
    if result:
        return float(result[0]["value"][1])
    return None

def capture_baselines():
    baselines = {
        "captured_at": datetime.utcnow().isoformat(),
        "git_sha": os.environ.get("GIT_SHA", "unknown"),
        "endpoints": {},
    }

    for endpoint in ENDPOINTS_TO_TRACK:
        p50 = query_percentile(endpoint, 0.5)
        p95 = query_percentile(endpoint, 0.95)
        p99 = query_percentile(endpoint, 0.99)

        if p50 is not None:
            baselines["endpoints"][endpoint] = {
                "p50_ms": round(p50, 2),
                "p95_ms": round(p95, 2),
                "p99_ms": round(p99, 2),
            }
            print(f"{endpoint}: P50={p50:.2f}ms P95={p95:.2f}ms P99={p99:.2f}ms")

    # Write baselines to file for version control
    with open(BASELINE_FILE, "w") as f:
        json.dump(baselines, f, indent=2)

    print(f"\nBaseline saved to {BASELINE_FILE}")

if __name__ == "__main__":
    capture_baselines()
```

## Versioning Your Baselines

Store your baseline file in version control alongside your code. This way, every branch has its own baseline reference:

```json
{
  "captured_at": "2026-02-06T10:30:00",
  "git_sha": "abc123def",
  "endpoints": {
    "process_order": {
      "p50_ms": 45.20,
      "p95_ms": 120.50,
      "p99_ms": 250.80
    },
    "validate_order": {
      "p50_ms": 5.10,
      "p95_ms": 12.30,
      "p99_ms": 25.60
    }
  }
}
```

## When to Update Baselines

Do not update baselines on every commit. Update them when you intentionally change performance characteristics, such as after an optimization or a known architecture change. A good practice is to have a dedicated CI job that regenerates baselines on tagged releases.

You should also re-capture baselines when your infrastructure changes. Moving to a different instance type or changing database configurations will shift your numbers, and comparing against stale baselines produces misleading results.

## Handling Variance

Real-world performance data has variance. A single test run might show P95 at 120ms, and the next run shows 135ms. To deal with this, capture baselines from multiple runs and use the median across runs as your reference point. You can also add a tolerance band (like +/- 10%) around the baseline to account for normal fluctuation.

## Wrapping Up

Setting up performance baselines from OpenTelemetry trace data gives you a foundation for every other performance testing practice. Once you have reliable baselines, you can detect regressions, enforce budgets, and track trends. The key is consistency in how you collect and store those numbers.
