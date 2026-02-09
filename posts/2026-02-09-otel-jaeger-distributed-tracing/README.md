# How to use OpenTelemetry with Jaeger backend for distributed tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Jaeger, Distributed Tracing, Observability, Telemetry

Description: Learn how to configure OpenTelemetry applications and collectors to export traces to Jaeger for distributed tracing visualization and analysis in microservice environments.

---

Jaeger provides a powerful backend for storing and visualizing OpenTelemetry traces. OpenTelemetry supports Jaeger through OTLP protocol, making it easy to send traces from instrumented applications to Jaeger for analysis and troubleshooting.

## Deploying Jaeger

Deploy Jaeger all-in-one for development or production components for scalable deployments.

```bash
# Run Jaeger all-in-one with Docker
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Access Jaeger UI at http://localhost:16686
```

The all-in-one image includes collector, query service, and UI in a single container.

## Configuring SDK to Export to Jaeger

Configure OpenTelemetry SDKs to send traces directly to Jaeger.

```python
# python_jaeger_export.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Configure resource
resource = Resource.create({
    "service.name": "my-python-service",
    "service.version": "1.0.0",
})

# Create tracer provider
provider = TracerProvider(resource=resource)

# Configure OTLP exporter for Jaeger
otlp_exporter = OTLPSpanExporter(
    endpoint="http://localhost:4317",
    insecure=True,
)

# Add span processor
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Set as global provider
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

# Create spans
with tracer.start_as_current_span("operation") as span:
    span.set_attribute("key", "value")
```

## Collector Configuration for Jaeger

Configure the OpenTelemetry Collector to forward traces to Jaeger.

```yaml
# collector-jaeger.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger]
```

## Kubernetes Deployment

Deploy Jaeger and the collector in Kubernetes.

```yaml
# jaeger-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:latest
        env:
        - name: COLLECTOR_OTLP_ENABLED
          value: "true"
        ports:
        - containerPort: 16686
          name: ui
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger
  namespace: observability
spec:
  selector:
    app: jaeger
  ports:
  - name: ui
    port: 16686
  - name: otlp-grpc
    port: 4317
  - name: otlp-http
    port: 4318
```

## Searching Traces in Jaeger

Use Jaeger UI to search and analyze traces.

```
# Jaeger search capabilities:

1. Search by service name
2. Search by operation name
3. Search by tags (attributes)
4. Search by trace ID
5. Filter by duration
6. Filter by time range

Example searches:
- service="order-service" AND error=true
- service="payment-service" AND duration>1s
- http.status_code=500
- trace_id=4bf92f3577b34da6a3ce929d0e0e4736
```

## Best Practices

First, use OTLP protocol instead of legacy Jaeger protocol for better compatibility.

Second, configure appropriate retention periods in Jaeger based on storage capacity.

Third, use sampling to control trace volume sent to Jaeger.

Fourth, add meaningful tags to spans for easier searching and filtering.

Fifth, configure Jaeger storage backend (Elasticsearch, Cassandra) for production deployments.

OpenTelemetry integration with Jaeger provides comprehensive distributed tracing capabilities. Jaeger's visualization and search features make it easy to understand system behavior and troubleshoot issues in microservice architectures.
