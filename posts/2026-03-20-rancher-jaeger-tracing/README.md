# How to Deploy Jaeger on Rancher for Distributed Tracing - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Jaeger, Distributed Tracing, Observability

Description: Deploy Jaeger distributed tracing on Rancher-managed clusters to visualize request flows across microservices and diagnose latency issues.

## Introduction

Jaeger is an open-source distributed tracing system that helps developers monitor and troubleshoot microservices. By instrumenting your services with OpenTelemetry, you get end-to-end visibility into request flows across your Kubernetes workloads. This guide covers deploying Jaeger on Rancher with production-grade storage backends.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x installed
- kubectl with cluster-admin access
- Elasticsearch (recommended) or Cassandra for production storage

## Step 1: Add the Jaeger Helm Repository

```bash
# Add Jaeger Helm repository

helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update
```

## Step 2: Deploy Jaeger All-in-One (Development)

```yaml
# values-dev.yaml - The chart defaults to an all-in-one deployment with in-memory storage
jaeger:
  ingress:
    enabled: true
    ingressClassName: nginx
    hosts:
      - jaeger.dev.example.com
```

```bash
helm install jaeger jaegertracing/jaeger \
  --namespace observability \
  --create-namespace \
  --values values-dev.yaml \
  --wait

# Verify Jaeger is running
kubectl get pods -n observability
```

## Step 3: Deploy Production Jaeger with Elasticsearch

```bash
# First, deploy Elasticsearch (or use existing)
helm install elasticsearch oci://registry-1.docker.io/bitnamicharts/elasticsearch \
  --namespace observability \
  --create-namespace \
  --set master.replicaCount=3 \
  --set data.replicaCount=3 \
  --wait
```

```yaml
# values-production.yaml - Jaeger v2 with Elasticsearch storage
jaeger:
  replicas: 3
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 512Mi
      cpu: 500m
  ingress:
    enabled: true
    ingressClassName: nginx
    hosts:
      - jaeger.example.com
    tls:
      - secretName: jaeger-tls
        hosts:
          - jaeger.example.com

userconfig:
  service:
    extensions: [jaeger_storage, jaeger_query, healthcheckv2]
    pipelines:
      traces:
        receivers: [otlp, jaeger, zipkin]
        processors: [batch]
        exporters: [jaeger_storage_exporter]
  extensions:
    healthcheckv2:
      use_v2: true
      http:
        endpoint: 0.0.0.0:13133
    jaeger_query:
      storage:
        traces: primary_store
        traces_archive: archive_store
    jaeger_storage:
      backends:
        primary_store:
          elasticsearch:
            server_urls: ["http://elasticsearch.observability.svc.cluster.local:9200"]
            index_prefix: jaeger
        archive_store:
          elasticsearch:
            server_urls: ["http://elasticsearch.observability.svc.cluster.local:9200"]
            index_prefix: jaeger-archive
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318
    jaeger:
      protocols:
        grpc:
    zipkin:
  processors:
    batch:
  exporters:
    jaeger_storage_exporter:
      trace_storage: primary_store

storage:
  elasticsearch:
    url: http://elasticsearch.observability.svc.cluster.local:9200

esIndexCleaner:
  enabled: true
  numberOfDays: 30
  schedule: "55 23 * * *"
```

```bash
helm upgrade --install jaeger jaegertracing/jaeger \
  --namespace observability \
  --values values-production.yaml \
  --wait
```

## Step 4: Configure Application Instrumentation

### Using OpenTelemetry SDK (Recommended)

```python
# Python application with OpenTelemetry instrumentation
from flask import Flask, jsonify, request
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

app = Flask(__name__)

# Configure tracer
resource = Resource.create({"service.name": "order-service"})
provider = TracerProvider(resource=resource)
# Send traces directly to Jaeger's OTLP endpoint
exporter = OTLPSpanExporter(
    endpoint="http://jaeger.observability.svc.cluster.local:4317",
    insecure=True,
)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

def fetch_orders_from_db():
    return [{"id": "1001", "status": "created"}]

# Instrument an HTTP handler
@app.route('/api/orders')
def get_orders():
    with tracer.start_as_current_span("get-orders") as span:
        span.set_attribute("http.method", "GET")
        span.set_attribute("http.url", request.url)

        orders = fetch_orders_from_db()
        span.set_attribute("orders.count", len(orders))
        return jsonify(orders)
```

### Configure Application Environment Variables

```yaml
# deployment-snippet.yaml - Export traces directly to Jaeger via OTLP/gRPC
env:
  - name: OTEL_SERVICE_NAME
    value: order-service
  - name: OTEL_TRACES_EXPORTER
    value: otlp
  - name: OTEL_EXPORTER_OTLP_PROTOCOL
    value: grpc
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: http://jaeger.observability.svc.cluster.local:4317
```

## Step 5: Configure Sampling Strategy

```yaml
# deployment-sampling-snippet.yaml - Head-based sampling in the OpenTelemetry SDK
env:
  - name: OTEL_TRACES_SAMPLER
    value: parentbased_traceidratio
  - name: OTEL_TRACES_SAMPLER_ARG
    value: "0.1"
```

## Step 6: Access Jaeger UI

```bash
# Port forward to Jaeger UI
kubectl port-forward -n observability svc/jaeger 16686:16686

# Access at: http://localhost:16686

# Or via Ingress if configured
# https://jaeger.example.com
```

## Step 7: Query Traces via API

```bash
# Jaeger's /api/* HTTP endpoints are used by the UI and are not a stable public API
# Search for traces via API
curl "http://localhost:16686/api/traces?service=order-service&limit=20&lookback=1h" | jq '.data[0]'

# Get trace by ID
curl "http://localhost:16686/api/traces/abc123def456" | jq '.'

# Get services list
curl "http://localhost:16686/api/services" | jq '.'
```

## Troubleshooting

```bash
# Check Jaeger logs
kubectl logs -n observability deployment/jaeger --tail=100

# Check if spans are being received and written to storage
kubectl port-forward -n observability svc/jaeger 8888:8888
curl -s http://localhost:8888/metrics | grep otelcol_receiver_accepted_spans
curl -s http://localhost:8888/metrics | grep otelcol_exporter_sent_spans

# Check Elasticsearch index
curl http://elasticsearch.observability.svc.cluster.local:9200/_cat/indices/jaeger* | sort
```

## Conclusion

Jaeger provides comprehensive distributed tracing for microservices on Rancher. Start with the chart defaults for development, then migrate to Elasticsearch-backed storage for persistent, queryable trace data. Instrument your applications with OpenTelemetry for vendor-neutral tracing that can be sent directly to Jaeger or through an OpenTelemetry Collector when you need additional processing. The combination of Jaeger with Rancher's monitoring stack gives you complete observability across your service mesh.
