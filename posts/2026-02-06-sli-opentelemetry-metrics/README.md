# How to Define and Measure Service Level Indicators (SLIs) Using OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SLI, Metrics, Observability

Description: Learn how to define, instrument, and measure Service Level Indicators using OpenTelemetry metrics APIs and SDKs.

Service Level Indicators are quantitative measurements that tell you how well your service is performing from the user's perspective. Without well-defined SLIs, you are essentially guessing whether your service meets user expectations. OpenTelemetry provides the instrumentation layer needed to capture these indicators reliably across distributed systems.

## What Makes a Good SLI

An SLI should measure something your users care about. The most common SLI categories are:

- **Availability**: The proportion of requests that succeed
- **Latency**: The proportion of requests served faster than a threshold
- **Throughput**: The rate of successful operations per unit of time
- **Quality**: The proportion of responses that meet correctness criteria

Each of these maps directly to an OpenTelemetry metric type. Availability and quality work well as ratios derived from counters. Latency fits naturally into histograms. Throughput is best measured with rate calculations over counters.

## Setting Up OpenTelemetry Metrics for SLIs

Before instrumenting SLIs, you need the OpenTelemetry SDK configured with a metrics exporter. Here is a Python setup that exports metrics via OTLP.

```python
# Install dependencies: pip install opentelemetry-sdk opentelemetry-exporter-otlp
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Configure the OTLP exporter to send metrics to your collector
exporter = OTLPMetricExporter(endpoint="http://localhost:4317", insecure=True)

# Export metrics every 10 seconds
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=10000)

# Set the global meter provider
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

# Create a meter for your service
meter = metrics.get_meter("payment-service", version="1.0.0")
```

## Instrumenting an Availability SLI

Availability is typically expressed as the ratio of successful requests to total requests. You need two counters: one for total requests and one for successful requests (or failed requests, depending on your preference).

```python
# Create counters for tracking request outcomes
total_requests = meter.create_counter(
    name="http.server.request.total",
    description="Total number of HTTP requests received",
    unit="1",
)

failed_requests = meter.create_counter(
    name="http.server.request.errors",
    description="Total number of HTTP requests that resulted in errors",
    unit="1",
)

def handle_request(request):
    # Always increment total requests
    total_requests.add(1, {"http.method": request.method, "http.route": request.path})

    try:
        response = process_request(request)
        return response
    except Exception as e:
        # Increment error counter only on failure
        failed_requests.add(1, {
            "http.method": request.method,
            "http.route": request.path,
            "error.type": type(e).__name__,
        })
        raise
```

The availability SLI is then calculated as: `1 - (failed_requests / total_requests)`.

## Instrumenting a Latency SLI

Latency SLIs answer the question: "What fraction of requests complete within an acceptable time?" OpenTelemetry histograms are ideal here because they record the distribution of values, allowing you to compute percentiles and threshold-based ratios.

```python
import time

# Create a histogram with explicit bucket boundaries
# These boundaries should align with your SLO thresholds
request_duration = meter.create_histogram(
    name="http.server.request.duration",
    description="Duration of HTTP requests in milliseconds",
    unit="ms",
)

def handle_request(request):
    start = time.monotonic()

    try:
        response = process_request(request)
        return response
    finally:
        # Record duration regardless of success or failure
        duration_ms = (time.monotonic() - start) * 1000
        request_duration.record(duration_ms, {
            "http.method": request.method,
            "http.route": request.path,
        })
```

## Configuring Histogram Buckets for SLI Precision

The default histogram bucket boundaries may not align with your latency thresholds. OpenTelemetry lets you configure explicit bucket boundaries through Views.

```python
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View, ExplicitBucketHistogramAggregation

# Define bucket boundaries that match your SLO thresholds
# If your SLO says "99% of requests under 200ms", include 200 as a boundary
latency_view = View(
    instrument_name="http.server.request.duration",
    aggregation=ExplicitBucketHistogramAggregation(
        boundaries=[5, 10, 25, 50, 100, 200, 500, 1000, 2500, 5000]
    ),
)

provider = MeterProvider(
    metric_readers=[reader],
    views=[latency_view],
)
```

## Collector Configuration for SLI Metrics

The OpenTelemetry Collector should be configured to receive and forward these metrics to your monitoring backend. Here is a minimal collector configuration.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  # Batch metrics to reduce export overhead
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  # Send to Prometheus for SLI querying
  prometheus:
    endpoint: "0.0.0.0:8889"
    metric_expiration: 5m

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

## SLI Query Examples

Once your metrics reach Prometheus (or any compatible backend), you can query your SLIs directly.

For availability over the last 30 minutes:

```promql
# Availability SLI: ratio of successful requests
1 - (
  sum(rate(http_server_request_errors_total[30m]))
  /
  sum(rate(http_server_request_total[30m]))
)
```

For latency SLI (fraction of requests under 200ms):

```promql
# Latency SLI: proportion of requests faster than 200ms
sum(rate(http_server_request_duration_bucket{le="200"}[30m]))
/
sum(rate(http_server_request_duration_count[30m]))
```

## Key Takeaways

When defining SLIs with OpenTelemetry, keep a few principles in mind. First, always instrument from the user's perspective - measure what they experience, not internal system health. Second, use counters for ratio-based SLIs and histograms for latency-based SLIs. Third, configure histogram buckets to match your SLO thresholds so you get precise measurements at the boundaries that matter. Finally, add meaningful attributes to your metrics so you can slice SLIs by route, method, or service version during investigations.

For more on connecting SLIs to SLO targets, see the next post on implementing SLOs with OpenTelemetry and Prometheus recording rules.
