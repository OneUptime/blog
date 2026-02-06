# How to Send OpenTelemetry Traces and Metrics to Last9 via OTLP with Native LogMetrics and TraceMetrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Last9, OTLP, Metrics

Description: Configure OpenTelemetry to send traces and metrics to Last9 using OTLP, and leverage Last9's native LogMetrics and TraceMetrics features.

Last9 is an observability platform that natively supports the OpenTelemetry Protocol (OTLP). What sets it apart is the built-in ability to derive metrics from traces (TraceMetrics) and metrics from logs (LogMetrics) on the server side. This means you can send raw telemetry data and get derived metrics without running additional Collector processors.

This post covers the end-to-end configuration for sending traces and metrics to Last9.

## How Last9 OTLP Ingestion Works

Last9 exposes an OTLP-compatible endpoint. You send traces, metrics, and logs to it using the standard OTLP exporter. On the Last9 side, the platform automatically computes RED metrics (Rate, Errors, Duration) from your traces and extracts numeric patterns from your logs. You do not need to configure span-to-metrics connectors in the Collector pipeline.

## Collector Configuration for Last9

Here is the full Collector config:

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_size: 512
    timeout: 5s

  # Add service metadata so Last9 can group signals
  resource:
    attributes:
      - key: service.name
        value: "payment-service"
        action: upsert
      - key: service.namespace
        value: "checkout"
        action: upsert

exporters:
  # Send traces to Last9 via OTLP/gRPC
  otlp/last9_traces:
    endpoint: otlp.last9.io:443
    headers:
      Authorization: "Basic ${LAST9_AUTH_TOKEN}"
    tls:
      insecure: false

  # Send metrics to Last9 via OTLP/gRPC
  otlp/last9_metrics:
    endpoint: otlp.last9.io:443
    headers:
      Authorization: "Basic ${LAST9_AUTH_TOKEN}"
    tls:
      insecure: false

  # Send logs to Last9 via OTLP/gRPC
  otlp/last9_logs:
    endpoint: otlp.last9.io:443
    headers:
      Authorization: "Basic ${LAST9_AUTH_TOKEN}"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/last9_traces]
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/last9_metrics]
    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/last9_logs]
```

## Configuring the SDK to Send Directly to Last9

If you prefer to skip the Collector and send directly from your application, here is how to configure the OpenTelemetry SDK in Python:

```python
# main.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource
import base64

# Build auth header
credentials = base64.b64encode(b"your-org-id:your-api-key").decode("utf-8")
auth_headers = (("authorization", f"Basic {credentials}"),)

# Create resource with service identification
resource = Resource.create({
    "service.name": "payment-service",
    "service.namespace": "checkout",
    "deployment.environment": "production",
})

# Configure trace exporter pointed at Last9
trace_exporter = OTLPSpanExporter(
    endpoint="otlp.last9.io:443",
    headers=auth_headers,
)

# Set up the TracerProvider with batch processing
provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(trace_exporter))
trace.set_tracer_provider(provider)

# Configure metric exporter
metric_exporter = OTLPMetricExporter(
    endpoint="otlp.last9.io:443",
    headers=auth_headers,
)

# Set up the MeterProvider
metric_reader = PeriodicExportingMetricReader(
    metric_exporter,
    export_interval_millis=30000,  # Export every 30 seconds
)
meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)

# Now use the tracer and meter
tracer = trace.get_tracer("payment-service")
meter = metrics.get_meter("payment-service")

# Create a counter for tracking payments
payment_counter = meter.create_counter(
    "payments.processed",
    description="Number of payments processed",
    unit="1",
)

# Example instrumented function
def process_payment(amount, currency):
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attribute("payment.amount", amount)
        span.set_attribute("payment.currency", currency)
        payment_counter.add(1, {"currency": currency})
        # Last9 will automatically derive TraceMetrics from this span
        # including latency percentiles, error rates, and throughput
        return do_payment_logic(amount, currency)
```

## Understanding TraceMetrics and LogMetrics

When Last9 receives your traces, it automatically generates metrics like:

- `trace.duration` histogram grouped by service, operation, and status
- `trace.error.rate` tracking the percentage of error spans
- `trace.throughput` measuring spans per second per service

For logs, Last9 extracts:

- Numeric values found in log messages (like response times or queue depths)
- Error rates derived from log severity levels
- Pattern-based counters for recurring log messages

This server-side derivation eliminates the need for Collector-side spanmetrics connectors or log-to-metric processors. Your Collector config stays simple, and you still get rich derived metrics in your dashboards.

## Verifying the Pipeline

After deploying your config, check that data flows correctly:

```bash
# Verify the Collector is running and exporting
curl -s http://localhost:8888/metrics | grep otelcol_exporter_sent

# You should see counters for sent spans, metrics, and logs
# otelcol_exporter_sent_spans{exporter="otlp/last9_traces"} 142
# otelcol_exporter_sent_metric_points{exporter="otlp/last9_metrics"} 89
```

In the Last9 dashboard, navigate to the TraceMetrics section to see the automatically derived metrics. You can build alerts and dashboards on top of these without any additional configuration.

## Production Tips

Set reasonable batch sizes. Last9 handles large batches well, but keeping `send_batch_size` around 512 balances latency and throughput. Enable compression on the OTLP exporter if your traces contain large attribute payloads. And always set `service.name` and `service.namespace` attributes, since Last9 uses these for grouping and filtering in the TraceMetrics views.

The combination of standard OTLP export with Last9's server-side metric derivation keeps your pipeline lean while giving you comprehensive observability coverage.
