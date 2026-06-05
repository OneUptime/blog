# How to Send OpenTelemetry Traces and Metrics to Logz.io with the Logz.io

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Logz.io, Collector Distribution, Traces and Metrics

Description: Use the Logz.io OpenTelemetry Collector distribution to send traces and metrics with pre-configured exporters and Kubernetes integration.

Logz.io maintains its own distribution of the OpenTelemetry Collector that comes pre-configured with Logz.io exporters, sensible defaults, and Kubernetes integration out of the box. This is the fastest way to get all three signal types (logs, metrics, traces) flowing to Logz.io.

## Installing the Logz.io Collector Distribution

Logz.io provides Helm charts for Kubernetes deployment:

```bash
# Add the Logz.io Helm repo

helm repo add logzio-helm https://logzio.github.io/logzio-helm
helm repo update

# Install the collector
helm install -n monitoring --create-namespace \
  --set logs.enabled=true \
  --set logzio-k8s-telemetry.metrics.enabled=true \
  --set logzio-apm-collector.enabled=true \
  --set global.logzioLogsToken="your-logs-token" \
  --set global.logzioMetricsToken="your-metrics-token" \
  --set global.logzioTracesToken="your-tracing-token" \
  --set global.logzioRegion="us" \
  --set global.env_id="my-k8s-cluster" \
  logzio-monitoring logzio-helm/logzio-monitoring
```

## Custom Configuration Override

You can override the default configuration with your own values:

```yaml
# logzio-values.yaml
logs:
  enabled: true

global:
  logzioLogsToken: "your-logs-token"
  logzioMetricsToken: "your-metrics-token"
  logzioTracesToken: "your-tracing-token"
  logzioRegion: "us"
  env_id: "production-cluster"

logzio-k8s-telemetry:
  metrics:
    enabled: true
  applicationMetrics:
    enabled: true
  k8sObjectsConfig:
    enabled: true

logzio-apm-collector:
  enabled: true
```

Install with the custom values:

```bash
helm install -n monitoring --create-namespace logzio-monitoring logzio-helm/logzio-monitoring -f logzio-values.yaml
```

## Sending Traces from Your Application

Point your application's OTLP exporter at the Collector service:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({
    "service.name": "checkout-api",
    "service.version": "2.1.0",
})

# Point to the Logz.io Collector distribution running in the cluster
exporter = OTLPSpanExporter(
    endpoint="logzio-apm-collector.monitoring.svc.cluster.local:4317",
    insecure=True,  # The in-cluster OTLP receiver is plain gRPC
)

provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

# Create traces
tracer = trace.get_tracer("checkout-api")

def process_checkout(cart):
    with tracer.start_as_current_span("process_checkout") as span:
        span.set_attribute("cart.item_count", len(cart.items))
        span.set_attribute("cart.total", cart.total)

        with tracer.start_as_current_span("validate_payment"):
            validate_payment(cart.payment_method)

        with tracer.start_as_current_span("reserve_inventory"):
            reserve_inventory(cart.items)
```

## Sending Metrics

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

metric_exporter = OTLPMetricExporter(
    endpoint="logzio-monitoring-otel-collector.monitoring.svc.cluster.local:4317",
    insecure=True,
)

reader = PeriodicExportingMetricReader(metric_exporter)
meter_provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(meter_provider)

meter = metrics.get_meter("checkout-api")

# Create custom metrics
checkout_counter = meter.create_counter(
    "checkout.completed",
    description="Number of completed checkouts",
)

checkout_value = meter.create_histogram(
    "checkout.value",
    description="Value of completed checkouts",
    unit="USD",
)
```

## Standalone Docker Installation

If you are not using Kubernetes, the Logz.io Collector distribution Docker quickstart runs the Collector with the default tracing configuration:

```yaml
version: "3.2"
services:
  logzio-otel-collector:
    image: logzio/otel-collector-distro:latest
    ports:
      - "14268:14268"
      - "14269:14269"
      - "14250:14250"
    environment:
      - TRACING_TOKEN=${TRACING_TOKEN}
      - LOGZIO_REGION=${LOGZIO_REGION}
```

## Verifying the Setup

Check that all three signals are flowing:

```bash
# Check collector health
kubectl logs -n monitoring -l app.kubernetes.io/instance=logzio-monitoring --tail=50

# Look for export success messages
kubectl logs -n monitoring -l app.kubernetes.io/instance=logzio-monitoring | grep -i "export"

# Check metrics endpoint
kubectl port-forward -n monitoring svc/logzio-monitoring-otel-collector 8888:8888
curl localhost:8888/metrics | grep otelcol_exporter
```

In the Logz.io UI, check:
- **Log Management**: Look for logs with your service.name
- **Tracing**: Navigate to the Jaeger UI to see distributed traces
- **Metrics**: Check the Infrastructure Monitoring section for your custom metrics

The Logz.io Collector distribution removes the guesswork from configuration. Instead of setting up exporters, tokens, and endpoints manually, you provide your shipping tokens and the distribution handles the rest.
