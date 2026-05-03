# How to Deploy Jaeger on Rancher for Distributed Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Jaeger, Distributed Tracing, Observability, Kubernetes, OpenTelemetry

Description: Deploy Jaeger distributed tracing on Rancher with Elasticsearch backend, configure auto-instrumentation, and query traces through the Jaeger UI.

## Introduction

Jaeger is an open-source distributed tracing system originally built by Uber. It helps you track requests as they flow through microservices, identify latency bottlenecks, and debug failures. This guide deploys the Jaeger Operator on Rancher for production-grade tracing.

## Prerequisites

- Rancher cluster with `helm` and `kubectl`
- Elasticsearch cluster (or use in-memory for testing)
- Applications instrumented with OpenTelemetry or Jaeger client libraries

## Step 1: Install the Jaeger Operator

```bash
# Install cert-manager (required by Jaeger Operator)

helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set crds.enabled=true

# Install Jaeger Operator
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm install jaeger-operator jaegertracing/jaeger-operator \
  --namespace observability \
  --create-namespace
```

## Step 2: Create a Jaeger Instance

For production, use Elasticsearch as the trace store:

```yaml
# jaeger-production.yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace: observability
spec:
  strategy: production

  collector:
    replicas: 2
    resources:
      limits:
        memory: "1Gi"
        cpu: "500m"

  query:
    replicas: 2

  storage:
    type: elasticsearch
    options:
      es:
        server-urls: https://elasticsearch.observability.svc.cluster.local:9200
        tls:
          ca: /es/certificates/ca.crt
    secretName: jaeger-es-credentials
```

For development/testing, use the all-in-one strategy with in-memory storage:

```yaml
# jaeger-dev.yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-dev
  namespace: observability
spec:
  strategy: allInOne
  allInOne:
    image: jaegertracing/all-in-one:latest
    options:
      log-level: debug
```

```bash
kubectl apply -f jaeger-dev.yaml
```

## Step 3: Access the Jaeger UI

```bash
# Port-forward the Jaeger query service
kubectl port-forward svc/jaeger-dev-query \
  -n observability 16686:16686

# Open http://localhost:16686
```

## Step 4: Instrument an Application

Use OpenTelemetry SDK to send traces to Jaeger:

```python
# Python OpenTelemetry instrumentation
# Jaeger natively supports OTLP since v1.35, so use the OTLP exporter.
# The opentelemetry-exporter-jaeger packages were removed in OTel Python 1.22.
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Configure the OTLP exporter pointed at the Jaeger collector's OTLP gRPC port
otlp_exporter = OTLPSpanExporter(
    endpoint="http://jaeger-dev-collector.observability.svc.cluster.local:4317",
    insecure=True,
)

# Set up the tracer provider
provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("my-service")

# Create a span
with tracer.start_as_current_span("process-order") as span:
    span.set_attribute("order.id", "12345")
    span.set_attribute("user.id", "user-789")
    # Your business logic here
```

## Conclusion

Jaeger is running on Rancher and ready to collect distributed traces. For production deployments, always use Elasticsearch or Cassandra as the storage backend rather than in-memory, which loses data on restart. Combine Jaeger with Prometheus metrics and Loki logs for a complete observability stack.
