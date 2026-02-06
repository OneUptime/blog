# How to Send OpenTelemetry Traces and Metrics to Logz.io with the Logz.io Collector Distribution

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
helm install logzio-otel logzio-helm/logzio-otel-collector \
  --set secrets.LogzioLogsToken="your-logs-token" \
  --set secrets.LogzioMetricsToken="your-metrics-token" \
  --set secrets.LogzioTracesToken="your-tracing-token" \
  --set secrets.LogzioRegion="us" \
  --set secrets.env_id="my-k8s-cluster"
```

## Custom Configuration Override

You can override the default configuration with your own values:

```yaml
# logzio-values.yaml
secrets:
  LogzioLogsToken: "your-logs-token"
  LogzioMetricsToken: "your-metrics-token"
  LogzioTracesToken: "your-tracing-token"
  LogzioRegion: "us"
  env_id: "production-cluster"

# Override collector configuration
config:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318

    # Kubernetes events receiver
    k8s_events:
      namespaces: []  # Empty means all namespaces

    # Prometheus receiver for scraping
    prometheus:
      config:
        scrape_configs:
          - job_name: "kubernetes-pods"
            kubernetes_sd_configs:
              - role: pod
            relabel_configs:
              - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
                action: keep
                regex: true

  processors:
    batch:
      timeout: 5s
      send_batch_size: 512

    k8sattributes:
      auth_type: serviceAccount
      extract:
        metadata:
          - k8s.pod.name
          - k8s.namespace.name
          - k8s.node.name
          - k8s.deployment.name

  # The exporters are pre-configured, but you can add custom ones
  exporters: {}

  service:
    pipelines:
      traces:
        receivers: [otlp]
        processors: [k8sattributes, batch]
        # logzio/traces exporter is pre-configured

      metrics:
        receivers: [otlp, prometheus]
        processors: [k8sattributes, batch]
        # logzio/metrics exporter is pre-configured

      logs:
        receivers: [otlp, k8s_events]
        processors: [k8sattributes, batch]
        # logzio/logs exporter is pre-configured
```

Install with the custom values:

```bash
helm install logzio-otel logzio-helm/logzio-otel-collector -f logzio-values.yaml
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
    endpoint="logzio-otel-collector.default.svc.cluster.local:4317",
    insecure=True,  # Within the cluster, TLS is handled by the Collector
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
    endpoint="logzio-otel-collector.default.svc.cluster.local:4317",
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

If you are not using Kubernetes, run the Logz.io Collector distribution as a Docker container:

```yaml
version: "3.8"
services:
  logzio-collector:
    image: logzio/otel-collector-distro:latest
    environment:
      - LOGZIO_LOGS_TOKEN=your-logs-token
      - LOGZIO_METRICS_TOKEN=your-metrics-token
      - LOGZIO_TRACES_TOKEN=your-tracing-token
      - LOGZIO_REGION=us
      - ENV_ID=my-environment
    ports:
      - "4317:4317"
      - "4318:4318"
      - "8888:8888"
    volumes:
      - /var/log:/var/log:ro
```

## Verifying the Setup

Check that all three signals are flowing:

```bash
# Check collector health
kubectl logs -l app=logzio-otel-collector -n default --tail=50

# Look for export success messages
kubectl logs -l app=logzio-otel-collector | grep -i "export"

# Check metrics endpoint
kubectl port-forward svc/logzio-otel-collector 8888:8888
curl localhost:8888/metrics | grep otelcol_exporter
```

In the Logz.io UI, check:
- **Log Management**: Look for logs with your service.name
- **Tracing**: Navigate to the Jaeger UI to see distributed traces
- **Metrics**: Check the Infrastructure Monitoring section for your custom metrics

The Logz.io Collector distribution removes the guesswork from configuration. Instead of setting up exporters, tokens, and endpoints manually, you provide your shipping tokens and the distribution handles the rest.
