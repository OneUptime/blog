# How to Set Up End-to-End Tracing for Dapr Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, End-to-End, Observability, Microservice, OpenTelemetry

Description: Configure complete end-to-end distributed tracing for a Dapr microservices architecture, from the API gateway through all downstream services.

---

## Overview

End-to-end tracing covers the full journey of a request from the user-facing API through all backend services. For Dapr microservices, this means setting up consistent tracing across the ingress controller, Dapr sidecars, service invocations, pub/sub message flows, and external dependencies. This guide covers building a complete tracing pipeline.

## Architecture

```text
[Client] --> [Nginx Ingress] --> [API Gateway (Dapr)] --> [Order Service (Dapr)]
                                                               |
                                                    --> [Payment Service (Dapr)]
                                                    --> [Notification Service (Dapr)]
                                                               |
                                                    [Redis State Store]
                                                    [Kafka Pub/Sub]
```

## Step 1: Ingress Trace Injection

Configure NGINX Ingress to propagate trace headers:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway
  annotations:
    nginx.ingress.kubernetes.io/enable-opentelemetry: "true"
    nginx.ingress.kubernetes.io/opentelemetry-trust-incoming-span: "true"
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 80
```

## Step 2: Dapr Configuration for All Services

Create a single configuration resource used by all services:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: global-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

Apply to all deployments:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "global-tracing"
```

## Step 3: OpenTelemetry Collector Pipeline

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: upsert
  k8sattributes:
    extract:
      metadata:
        - k8s.pod.name
        - k8s.namespace.name
        - k8s.deployment.name

exporters:
  otlp/jaeger:
    endpoint: jaeger.monitoring.svc.cluster.local:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [k8sattributes, resource, batch]
      exporters: [otlp/jaeger]
```

## Step 4: API Gateway - Root Span Creation

```python
from flask import Flask, request
import requests
import opentelemetry.trace as otel_trace
from opentelemetry.propagate import inject

app = Flask(__name__)

@app.route('/api/orders', methods=['POST'])
def create_order():
    tracer = otel_trace.get_tracer(__name__)

    with tracer.start_as_current_span("api.create_order") as span:
        data = request.json
        span.set_attribute("user.id", data.get("userId"))
        span.set_attribute("order.total", data.get("total"))

        # Inject current trace context into Dapr call
        headers = {"Content-Type": "application/json"}
        inject(headers)

        resp = requests.post(
            "http://localhost:3500/v1.0/invoke/order-service/method/create",
            json=data,
            headers=headers
        )
        return resp.json(), resp.status_code
```

## Step 5: Downstream Service - Span Continuation

Each downstream service continues the trace via the `traceparent` header that Dapr passes automatically:

```python
from flask import Flask, request
import requests

app = Flask(__name__)

@app.route('/create', methods=['POST'])
def create():
    # Dapr passes traceparent automatically
    data = request.json.get('data', {})

    # Save state - Dapr creates a child span automatically
    requests.post(
        "http://localhost:3500/v1.0/state/redis-store",
        json=[{"key": data["orderId"], "value": data}],
        headers={"traceparent": request.headers.get("traceparent", "")}
    )

    # Publish event - Dapr creates a child span automatically
    requests.post(
        "http://localhost:3500/v1.0/publish/kafka-pubsub/order-created",
        json=data,
        headers={"traceparent": request.headers.get("traceparent", "")}
    )

    return '', 200
```

## Step 6: Verifying End-to-End Traces

```bash
# Make a test request
curl -X POST https://api.example.com/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "total": 99.99, "items": [{"id": "item-1"}]}'

# Extract trace ID from the traceparent response header
# Search Jaeger: http://localhost:16686
```

The resulting trace should show spans for:
- NGINX ingress
- API gateway root span
- Dapr: order-service invocation
- Dapr: Redis state write
- Dapr: Kafka pub/sub publish
- Downstream consumer spans

## Summary

End-to-end tracing for Dapr requires propagating trace context from the ingress through each service and into all Dapr building blocks. Configure a shared `Configuration` resource for all services, deploy the OTel Collector with k8s attribute enrichment, and ensure your API gateway creates root spans and forwards trace headers. Dapr's sidecar handles trace propagation for all service-to-service calls automatically.
