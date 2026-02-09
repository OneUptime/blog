# How to configure OpenTelemetry with Prometheus for metrics export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prometheus, Metrics, Monitoring, Observability

Description: Learn how to configure OpenTelemetry applications and collectors to export metrics to Prometheus using remote write or the Prometheus exporter for comprehensive metrics monitoring.

---

OpenTelemetry metrics integrate seamlessly with Prometheus through multiple export paths. You can export metrics via remote write protocol or expose them in Prometheus scrape format, enabling existing Prometheus infrastructure to collect OpenTelemetry metrics.

## Prometheus Remote Write Exporter

Configure the collector to push metrics to Prometheus via remote write.

```yaml
# collector-prometheus-remote-write.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write
    tls:
      insecure: true
    
    # Resource to metric labels mapping
    resource_to_telemetry_conversion:
      enabled: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

## Prometheus Exporter for Scraping

Expose metrics in Prometheus format for scraping.

```yaml
# collector-prometheus-exporter.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
    namespace: otel
    send_timestamps: true
    metric_expiration: 5m

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

Configure Prometheus to scrape the collector endpoint.

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'otel-collector'
    scrape_interval: 15s
    static_configs:
      - targets: ['otel-collector:8889']
```

## SDK Configuration

Configure OpenTelemetry SDKs to export metrics.

```python
# python_prometheus_metrics.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Configure exporter
exporter = OTLPMetricExporter(endpoint="http://localhost:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=10000)

# Create meter provider
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter(__name__)

# Create metrics
request_counter = meter.create_counter("http_requests_total")
request_duration = meter.create_histogram("http_request_duration_seconds")

# Record metrics
request_counter.add(1, {"method": "GET", "endpoint": "/api/users"})
request_duration.record(0.145, {"method": "GET", "endpoint": "/api/users"})
```

## Querying OpenTelemetry Metrics

Query OpenTelemetry metrics in Prometheus using standard PromQL.

```promql
# Request rate
rate(http_requests_total[5m])

# Request duration p95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Aggregate by service
sum by (service_name) (rate(http_requests_total[5m]))
```

## Best Practices

First, use remote write for push-based metrics when collectors handle high cardinality.

Second, use Prometheus exporter for existing scrape-based infrastructure.

Third, configure appropriate export intervals to balance freshness and overhead.

Fourth, map OpenTelemetry resource attributes to Prometheus labels carefully to avoid cardinality explosion.

Fifth, use metric views in SDKs to control aggregation and attributes before export.

OpenTelemetry metrics integration with Prometheus enables comprehensive monitoring using industry-standard tools. The flexible export options support both push and pull models to fit existing infrastructure patterns.
