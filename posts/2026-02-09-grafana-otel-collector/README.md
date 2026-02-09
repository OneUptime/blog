# How to implement Grafana with OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, OpenTelemetry, Observability

Description: Learn how to integrate Grafana with OpenTelemetry Collector to collect metrics, logs, and traces from your applications using vendor-neutral instrumentation.

---

OpenTelemetry provides a single instrumentation standard for collecting metrics, logs, and traces from your applications. The OpenTelemetry Collector acts as a central pipeline that receives, processes, and exports telemetry data to backends like Grafana's observability stack. This integration gives you vendor-neutral instrumentation with the power of Grafana's visualization and alerting.

## Understanding the OpenTelemetry Collector

The OpenTelemetry Collector is a standalone service that receives telemetry data from instrumented applications, processes it through pipelines, and exports it to one or more backends. It supports dozens of protocols and can fan out data to multiple destinations simultaneously.

For Grafana users, the Collector exports metrics to Prometheus or Mimir, logs to Loki, and traces to Tempo, providing a complete observability pipeline.

## Installing the OpenTelemetry Collector

Deploy the Collector using Docker for quick setup and testing.

```yaml
# docker-compose.yml
version: '3.8'

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "9090:9090"   # Prometheus exporter
      - "13133:13133" # Health check
```

The contrib version includes additional receivers and exporters beyond the core distribution.

## Configuring Basic Telemetry Pipeline

Create a configuration that receives OTLP data and exports to Grafana backends.

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
    timeout: 10s
    send_batch_size: 1024

  memory_limiter:
    check_interval: 1s
    limit_mib: 512

  resource:
    attributes:
      - key: environment
        value: production
        action: upsert

exporters:
  # Export metrics to Prometheus
  prometheus:
    endpoint: "0.0.0.0:9090"
    namespace: "otel"

  # Export logs to Loki
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    labels:
      resource:
        service.name: "service_name"
        service.namespace: "service_namespace"
      attributes:
        severity: "severity"

  # Export traces to Tempo
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/tempo]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [prometheus]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [loki]
```

This configuration creates three separate pipelines for traces, metrics, and logs.

## Instrumenting Applications with OpenTelemetry

Add OpenTelemetry instrumentation to your applications to send data to the Collector.

```python
# Python application with OpenTelemetry
from opentelemetry import trace, metrics
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource

# Configure resource attributes
resource = Resource.create({
    "service.name": "my-application",
    "service.version": "1.0.0",
    "deployment.environment": "production"
})

# Setup tracing
trace.set_tracer_provider(TracerProvider(resource=resource))
tracer = trace.get_tracer(__name__)
span_exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317")
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(span_exporter)
)

# Setup metrics
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317")
)
metrics.set_meter_provider(MeterProvider(
    resource=resource,
    metric_readers=[metric_reader]
))
meter = metrics.get_meter(__name__)

# Create metrics
request_counter = meter.create_counter(
    "http_requests_total",
    description="Total HTTP requests"
)

# Use in application code
@app.route("/api/data")
def get_data():
    with tracer.start_as_current_span("get_data") as span:
        request_counter.add(1, {"method": "GET", "endpoint": "/api/data"})
        # Application logic here
        return {"data": "response"}
```

The application automatically sends traces and metrics to the Collector.

## Processing Telemetry with Transformations

Use processors to enrich, filter, and transform telemetry data before export.

```yaml
# otel-collector-config.yaml
processors:
  # Add resource attributes
  resource:
    attributes:
      - key: cluster
        value: prod-us-east
        action: insert
      - key: cloud.provider
        value: aws
        action: insert

  # Filter out health check spans
  filter:
    traces:
      span:
        - 'attributes["http.route"] == "/health"'

  # Sample traces
  probabilistic_sampler:
    sampling_percentage: 10

  # Transform attribute names
  attributes:
    actions:
      - key: http.status_code
        action: insert
        from_attribute: http.response.status_code
      - key: http.response.status_code
        action: delete

  # Group and batch data
  batch:
    timeout: 10s
    send_batch_size: 1024
    send_batch_max_size: 2048

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, filter, probabilistic_sampler, batch]
      exporters: [otlp/tempo]
```

These processors clean and enrich data before it reaches Grafana.

## Implementing Multi-Backend Export

Export data to multiple destinations for redundancy or different use cases.

```yaml
# otel-collector-config.yaml
exporters:
  # Primary Tempo instance
  otlp/tempo-primary:
    endpoint: tempo-primary:4317
    tls:
      insecure: true

  # Backup Tempo instance
  otlp/tempo-backup:
    endpoint: tempo-backup:4317
    tls:
      insecure: true

  # Also export to Jaeger for comparison
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo-primary, otlp/tempo-backup, jaeger]
```

Data flows to all three backends simultaneously, providing redundancy and flexibility.

## Collecting Infrastructure Metrics

Configure receivers for infrastructure metrics in addition to application telemetry.

```yaml
# otel-collector-config.yaml
receivers:
  # Application telemetry
  otlp:
    protocols:
      grpc:
      http:

  # Host metrics
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
      disk:
      filesystem:
      load:
      memory:
      network:

  # Prometheus scraping
  prometheus:
    config:
      scrape_configs:
        - job_name: 'kubernetes-pods'
          kubernetes_sd_configs:
            - role: pod
          relabel_configs:
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
              action: keep
              regex: true

exporters:
  prometheus:
    endpoint: "0.0.0.0:9090"

service:
  pipelines:
    metrics:
      receivers: [otlp, hostmetrics, prometheus]
      processors: [batch]
      exporters: [prometheus]
```

This configuration collects metrics from applications, hosts, and Kubernetes pods.

## Implementing Logs Collection

Configure the Collector to receive and forward logs to Loki.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

  # Collect logs from files
  filelog:
    include:
      - /var/log/app/*.log
    operators:
      # Parse JSON logs
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%d %H:%M:%S'

processors:
  # Add log attributes
  resource:
    attributes:
      - key: log.source
        value: application
        action: insert

  # Transform log structure for Loki
  attributes:
    actions:
      - key: loki.attribute.labels
        value: level,service
        action: insert

exporters:
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    labels:
      resource:
        service.name: "service_name"
        service.namespace: "namespace"
      attributes:
        level: "level"

service:
  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors: [resource, attributes, batch]
      exporters: [loki]
```

Logs from applications and files flow through the same pipeline to Loki.

## Monitoring Collector Health

The Collector exposes its own metrics for monitoring pipeline health.

```yaml
# otel-collector-config.yaml
service:
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
      address: 0.0.0.0:8888

extensions:
  health_check:
    endpoint: 0.0.0.0:13133

  pprof:
    endpoint: 0.0.0.0:1777

  zpages:
    endpoint: 0.0.0.0:55679

service:
  extensions: [health_check, pprof, zpages]
```

Query these metrics in Grafana to monitor Collector performance:

```promql
# Data received by receivers
rate(otelcol_receiver_accepted_spans[5m])
rate(otelcol_receiver_accepted_metric_points[5m])

# Data exported
rate(otelcol_exporter_sent_spans[5m])
rate(otelcol_exporter_sent_metric_points[5m])

# Errors
rate(otelcol_exporter_send_failed_spans[5m])
rate(otelcol_processor_dropped_spans[5m])
```

These metrics reveal pipeline bottlenecks and errors.

## Deploying Collector in Kubernetes

Run the Collector as a DaemonSet to collect node-level metrics and as a Deployment for centralized processing.

```yaml
# kubernetes/collector-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector-agent
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-collector-agent
  template:
    metadata:
      labels:
        app: otel-collector-agent
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          command: ["--config=/conf/otel-agent-config.yaml"]
          volumeMounts:
            - name: config
              mountPath: /conf
            - name: varlog
              mountPath: /var/log
              readOnly: true
          resources:
            limits:
              memory: 512Mi
              cpu: 500m
      volumes:
        - name: config
          configMap:
            name: otel-agent-config
        - name: varlog
          hostPath:
            path: /var/log

---
# Deployment for centralized processing
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector-gateway
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector-gateway
  template:
    metadata:
      labels:
        app: otel-collector-gateway
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          command: ["--config=/conf/otel-gateway-config.yaml"]
          ports:
            - containerPort: 4317
            - containerPort: 4318
          volumeMounts:
            - name: config
              mountPath: /conf
          resources:
            limits:
              memory: 2Gi
              cpu: 2000m
      volumes:
        - name: config
          configMap:
            name: otel-gateway-config
```

Agents collect local data while the gateway handles centralized processing and export.

## Best Practices for OpenTelemetry Integration

Use the memory limiter processor to prevent the Collector from consuming too much memory during traffic spikes.

Enable batching to reduce network overhead when sending data to backends.

Add resource attributes early in the pipeline to enrich all telemetry with context.

Monitor Collector metrics to identify pipeline issues before they impact observability.

Use filtering processors to drop unneeded data and reduce storage costs.

Deploy Collectors close to applications to minimize network latency and improve reliability.

Configure appropriate retry and backoff settings for exporters to handle temporary backend outages.

Use semantic conventions for attribute names to ensure consistency across services.

Test configuration changes in staging before deploying to production Collectors.

OpenTelemetry Collector provides a flexible, vendor-neutral pipeline for getting telemetry data into Grafana. It gives you control over data processing while maintaining compatibility with multiple backends and instrumentation libraries.
