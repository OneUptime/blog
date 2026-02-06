# How to Debug Intermittent Timeout Issues by Analyzing OpenTelemetry Span Duration Distributions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Debugging, Timeouts, Span Duration, Distributed Tracing

Description: Learn how to identify and resolve intermittent timeout issues by analyzing span duration distributions with OpenTelemetry tracing data.

Intermittent timeouts are one of the most frustrating problems to debug in distributed systems. They happen just often enough to annoy users, but rarely enough that you can never catch them in action. The typical approach of staring at logs and hoping for the best does not scale. Instead, you can use OpenTelemetry span duration distributions to systematically find the root cause.

## Why Duration Distributions Matter

When a service times out intermittently, the average latency often looks fine. The p50 is healthy, the p95 might be slightly elevated, but nothing screams "broken." The problem hides in the tail of the distribution. By collecting span durations and plotting their distribution, you can spot bimodal patterns that reveal the underlying issue.

A healthy service typically shows a single-peaked duration distribution. An intermittently timing-out service often shows two distinct peaks: one at the normal latency and another near the timeout threshold.

## Setting Up Duration Histogram Collection

First, configure your OpenTelemetry SDK to export span duration histograms. Here is a Python example using the OpenTelemetry SDK:

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Set up the metric reader with OTLP export
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://localhost:4317"),
    export_interval_millis=10000,
)

# Create meter provider with custom histogram bucket boundaries
# These boundaries are tuned for detecting timeout patterns
meter_provider = MeterProvider(metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)

meter = metrics.get_meter("timeout-debugger")

# Create a histogram with boundaries that cluster around your timeout value
# If your timeout is 5s, add more granularity near that threshold
duration_histogram = meter.create_histogram(
    name="http.server.request.duration.debug",
    description="Request duration distribution for timeout debugging",
    unit="ms",
)
```

## Instrumenting Your Spans for Duration Tracking

You need to record span durations as histogram data points so you can query them efficiently. Here is how to wrap your service calls:

```python
import time
from opentelemetry import trace

tracer = trace.get_tracer("timeout-debugger")

def call_downstream_service(request):
    start_time = time.monotonic()

    with tracer.start_as_current_span("downstream.call") as span:
        span.set_attribute("downstream.service", "payment-api")
        span.set_attribute("request.id", request.id)

        try:
            response = http_client.post(
                "https://payment-api.internal/charge",
                json=request.to_dict(),
                timeout=5.0,  # 5 second timeout
            )
            span.set_attribute("http.status_code", response.status_code)
            return response

        except TimeoutError:
            span.set_attribute("error", True)
            span.set_attribute("timeout.hit", True)
            raise

        finally:
            # Record the duration regardless of success or failure
            elapsed_ms = (time.monotonic() - start_time) * 1000
            duration_histogram.record(
                elapsed_ms,
                attributes={
                    "service": "payment-api",
                    "endpoint": "/charge",
                    "timed_out": str(span.attributes.get("timeout.hit", False)),
                },
            )
```

## Querying the Distribution

Once you have collected enough data points, query your backend to look at the distribution. In a system like OneUptime or any OpenTelemetry-compatible backend, you can run histogram queries. Here is a PromQL-style query to find the distribution shape:

```promql
# Look at the histogram buckets for the downstream call
histogram_quantile(0.50, rate(http_server_request_duration_debug_bucket{service="payment-api"}[5m]))
histogram_quantile(0.90, rate(http_server_request_duration_debug_bucket{service="payment-api"}[5m]))
histogram_quantile(0.99, rate(http_server_request_duration_debug_bucket{service="payment-api"}[5m]))
```

If you see the p50 at 120ms but the p99 at 4900ms (just under your 5s timeout), you have a bimodal distribution. This typically means some requests are hitting a slow path.

## Identifying the Root Cause

Once you confirm the bimodal pattern, the next step is to find what differentiates the slow requests from the fast ones. Add more span attributes to slice the data:

```python
span.set_attribute("db.connection_pool.active", pool.active_count)
span.set_attribute("db.connection_pool.idle", pool.idle_count)
span.set_attribute("server.pod", os.environ.get("HOSTNAME", "unknown"))
span.set_attribute("upstream.region", request.headers.get("x-region", "unknown"))
```

Then query by these dimensions. You might discover that all slow requests come from a specific pod, or that they correlate with a depleted connection pool.

## A Real Example

In a recent debugging session, we found that intermittent timeouts on a checkout service showed a clear bimodal distribution: 85% of requests completed in under 200ms, while 15% clustered between 4500ms and 5000ms. By adding pod-level attributes, we discovered all slow requests landed on two specific pods. Those pods shared a node that was experiencing noisy-neighbor CPU throttling from another workload. Moving the pods to a dedicated node pool eliminated the timeouts entirely.

## Key Takeaways

The process boils down to three steps. First, collect span durations as histogram metrics with enough bucket granularity around your timeout threshold. Second, look for bimodal or multimodal distributions that indicate a subset of requests are following a different code path or hitting different infrastructure. Third, add dimensional attributes to your histograms and slice the data until you isolate the variable that separates fast requests from slow ones.

OpenTelemetry gives you the building blocks. The trick is knowing which distribution shapes to look for and how to progressively narrow down the root cause with targeted attributes.
