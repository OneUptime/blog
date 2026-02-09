# How to Use Exemplars to Link Error Rate Metric Spikes to Specific OpenTelemetry Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Exemplars, Metrics, Trace Linking

Description: Use OpenTelemetry exemplars to link error rate metric spikes directly to specific distributed traces for faster debugging.

You see a spike on your error rate graph. The next step is figuring out which specific request caused it. Without exemplars, you switch to your trace backend and try to find a matching trace by guessing the time window. With exemplars, you click on the spike and it takes you directly to a representative trace. This post shows how to set up exemplars in OpenTelemetry to bridge the gap between metrics and traces.

## What Are Exemplars?

An exemplar is a sample data point attached to a metric that links back to a specific trace. When OpenTelemetry records a metric (like an error count), it can also record the trace ID and span ID of the request that produced that data point. This creates a direct link from any metric spike to an actual trace you can investigate.

## Enabling Exemplars in the OpenTelemetry SDK

### Python Setup

```python
# tracing_with_exemplars.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics.view import ExplicitBucketHistogramAggregation, View

# Set up tracing
trace_provider = TracerProvider()
trace_provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317"))
)
trace.set_tracer_provider(trace_provider)

# Set up metrics with exemplar support
metric_exporter = OTLPMetricExporter(endpoint="http://localhost:4317")
metric_reader = PeriodicExportingMetricReader(
    metric_exporter,
    export_interval_millis=10000,
)

meter_provider = MeterProvider(
    metric_readers=[metric_reader],
    views=[
        # Configure histogram with exemplars
        View(
            instrument_name="http.server.duration",
            aggregation=ExplicitBucketHistogramAggregation(
                boundaries=[5, 10, 25, 50, 100, 250, 500, 1000, 5000]
            ),
        ),
    ],
)
metrics.set_meter_provider(meter_provider)
```

### Recording Metrics with Trace Context

The key is that metrics are recorded while a span is active. The SDK automatically attaches the current span's trace ID as an exemplar.

```python
# request_handler.py
import time
from opentelemetry import trace, metrics, context

tracer = trace.get_tracer("my-service")
meter = metrics.get_meter("my-service")

# Create metrics instruments
request_duration = meter.create_histogram(
    name="http.server.duration",
    description="HTTP request duration in milliseconds",
    unit="ms",
)

error_counter = meter.create_counter(
    name="http.server.errors",
    description="Count of HTTP server errors",
    unit="1",
)

def handle_request(method, route, handler):
    """
    Wrapper that records request metrics with exemplars.
    The exemplar automatically includes the active trace ID.
    """
    with tracer.start_as_current_span(f"{method} {route}") as span:
        start_time = time.time()
        attributes = {
            "http.method": method,
            "http.route": route,
        }

        try:
            result = handler()

            # Record duration - exemplar is attached automatically
            # because there is an active span
            duration_ms = (time.time() - start_time) * 1000
            request_duration.record(duration_ms, attributes)

            return result

        except Exception as e:
            # Record the error counter with the active trace context
            # The exemplar links this metric data point to this specific trace
            error_counter.add(1, attributes)

            duration_ms = (time.time() - start_time) * 1000
            request_duration.record(duration_ms, attributes)

            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
```

## Configuring the Collector to Preserve Exemplars

The collector needs to be configured to forward exemplars to your metrics backend:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

exporters:
  # Prometheus remote write supports exemplars
  prometheusremotewrite:
    endpoint: "http://prometheus:9090/api/v1/write"
    send_metadata: true

  # Direct Prometheus exposition also supports exemplars
  prometheus:
    endpoint: "0.0.0.0:8889"
    enable_open_metrics: true  # Required for exemplar support

  otlp/traces:
    endpoint: "tempo:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/traces]
    metrics:
      receivers: [otlp]
      exporters: [prometheus]
```

## Prometheus Configuration for Exemplars

Enable exemplar storage in Prometheus:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

storage:
  exemplars:
    max_exemplars: 100000

scrape_configs:
  - job_name: "otel-collector"
    scrape_interval: 15s
    static_configs:
      - targets: ["otel-collector:8889"]
```

## Querying Exemplars in Grafana

In Grafana, when you have a time series panel showing error rate, enable exemplars in the query options:

```promql
# Error rate query with exemplars enabled
sum(rate(http_server_errors_total[5m])) by (http_route)
```

In the Grafana panel settings:
1. Open the query editor.
2. Toggle "Exemplars" to on.
3. Set the "Trace ID" label to `traceID`.
4. Configure the internal link to point to your Tempo data source.

Now when you hover over the error rate graph, you will see small diamonds at specific data points. Clicking a diamond takes you directly to the trace in Tempo.

## Custom Exemplar Filtering

Sometimes you want exemplars only for interesting cases, not for every request. Build a custom exemplar filter:

```python
# exemplar_filter.py
from opentelemetry.sdk.metrics.export import ExemplarFilter
from opentelemetry import trace

class ErrorOnlyExemplarFilter(ExemplarFilter):
    """
    Only record exemplars for requests that resulted in errors.
    This keeps exemplar storage focused on the traces you
    actually want to investigate.
    """

    def should_sample(self, value, timestamp, attributes, context):
        span = trace.get_current_span()
        if span and span.is_recording():
            # Only sample if the span has an error status
            if hasattr(span, 'status') and span.status.status_code == trace.StatusCode.ERROR:
                return True
        return False
```

## End-to-End Debugging Flow

With exemplars configured, the debugging flow becomes:

1. Notice an error rate spike on the Grafana dashboard.
2. Hover over the spike to see exemplar data points.
3. Click an exemplar to jump directly to the trace in Tempo.
4. See the full distributed trace with exception events and stack traces.
5. Identify the root cause in the trace waterfall view.

No more guessing which trace matches the spike. No more manual correlation between metrics and traces. The exemplar provides the direct link.

## Conclusion

Exemplars are the bridge between "something is wrong" (metrics) and "this is what went wrong" (traces). By enabling exemplar support in your OpenTelemetry SDK, collector, Prometheus, and Grafana, you create a one-click path from any error rate spike to the specific trace that caused it. This drastically reduces the time from alert to root cause identification.
