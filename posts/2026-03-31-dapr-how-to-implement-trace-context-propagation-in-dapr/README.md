# How to Implement Trace Context Propagation in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpenTelemetry, Distributed Tracing, W3C TraceContext, Observability, Microservice

Description: Learn how Dapr propagates trace context across service boundaries using W3C TraceContext headers, and how to extend traces into your application code with OpenTelemetry.

---

Distributed tracing connects the dots between microservice calls: a single user request may touch a dozen services, and without trace context propagation you get isolated spans instead of a coherent end-to-end trace. Dapr automatically propagates W3C TraceContext headers between services, creating parent-child span relationships across service invocation and pub/sub calls. This guide covers how Dapr's trace propagation works, how to configure it, and how to extend traces into your application code using the OpenTelemetry SDK.

## How Dapr Propagates Trace Context

Dapr injects and forwards W3C TraceContext headers (`traceparent` and `tracestate`) on all service invocation and pub/sub calls:

```text
Service A                    Service B
   |                              |
   | Dapr sidecar A               |
   |   Creates span A             |
   |   Sets traceparent header    |
   |                              |
   | HTTP/gRPC + traceparent ---->| Dapr sidecar B
   |                              |   Reads traceparent
   |                              |   Creates child span B
   |                              |   Forwards to app B
```

For pub/sub, trace context is embedded in the CloudEvent `extensions` field:

```json
{
  "specversion": "1.0",
  "type": "orders",
  "source": "order-service",
  "id": "abc123",
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "tracestate": "",
  "data": { "orderId": "ord-42" }
}
```

## Configuring Dapr Tracing

```yaml
# components/config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  tracing:
    samplingRate: "1"          # 1 = 100% sampling (use lower in production)
    otel:
      endpointAddress: "http://otel-collector:4317"
      isSecure: false
      protocol: grpc
  metric:
    enabled: true
```

For Zipkin backend (alternative):

```yaml
spec:
  tracing:
    samplingRate: "0.1"        # 10% sampling in production
    zipkin:
      endpointAddress: "http://zipkin:9411/api/v2/spans"
```

## Running the OpenTelemetry Collector

```yaml
# otel-collector.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: "0.0.0.0:4317"
          http:
            endpoint: "0.0.0.0:4318"

    processors:
      batch:
        timeout: 1s
        send_batch_size: 1024

    exporters:
      otlp/jaeger:
        endpoint: "jaeger:4317"
        tls:
          insecure: true
      debug:
        verbosity: basic

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp/jaeger, debug]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector:0.92.0
        args: ["--config=/etc/otel/config.yaml"]
        ports:
        - containerPort: 4317
        - containerPort: 4318
        volumeMounts:
        - name: config
          mountPath: /etc/otel
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

## Extending Dapr Traces with Application Spans

The `traceparent` header is forwarded to your application. Extract it and create child spans using the OpenTelemetry SDK:

```python
# order_service.py
import os
from flask import Flask, request, jsonify
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.propagate import extract, inject
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
import requests

# Initialize OpenTelemetry
otel_endpoint = os.environ.get("OTEL_ENDPOINT", "http://localhost:4317")
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint=otel_endpoint, insecure=True))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("order-service")

app = Flask(__name__)
DAPR_PORT = int(os.environ.get("DAPR_HTTP_PORT", 3500))

def get_otel_headers_from_request() -> dict:
    """Extract trace headers forwarded by Dapr sidecar."""
    return {
        "traceparent": request.headers.get("traceparent", ""),
        "tracestate": request.headers.get("tracestate", "")
    }

@app.route("/orders", methods=["POST"])
def create_order():
    # Extract trace context from Dapr-forwarded headers
    carrier = get_otel_headers_from_request()
    ctx = TraceContextTextMapPropagator().extract(carrier=carrier)
    
    with tracer.start_as_current_span("create-order", context=ctx) as span:
        order = request.json
        order_id = order.get("orderId")
        
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.amount", order.get("amount", 0))
        
        # Validate order (child span)
        with tracer.start_as_current_span("validate-order") as validate_span:
            if not order_id:
                validate_span.set_attribute("validation.error", "missing orderId")
                return jsonify({"error": "missing orderId"}), 400
            validate_span.set_attribute("validation.passed", True)
        
        # Save to state store (child span)
        with tracer.start_as_current_span("save-state") as save_span:
            headers = {"Content-Type": "application/json"}
            inject(headers)  # Propagate trace context to Dapr state call
            
            resp = requests.post(
                f"http://localhost:{DAPR_PORT}/v1.0/state/statestore",
                json=[{"key": order_id, "value": order}],
                headers=headers
            )
            save_span.set_attribute("state.status", resp.status_code)
        
        span.set_attribute("order.status", "created")
        return jsonify({"orderId": order_id, "status": "created"}), 201

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

## Propagating Trace Context Through Pub/Sub

When publishing messages, include the current trace context so subscribers can continue the trace:

```python
# publisher with trace context
from opentelemetry.propagate import inject as otel_inject

def publish_order_created(order_id: str, order_data: dict):
    with tracer.start_as_current_span("publish-order-created") as span:
        span.set_attribute("messaging.system", "dapr-pubsub")
        span.set_attribute("messaging.destination", "orders")
        
        # Dapr pub/sub with CloudEvents extensions
        headers = {}
        otel_inject(headers)
        
        # Pass trace headers in the CloudEvent extensions
        cloud_event = {
            "specversion": "1.0",
            "type": "order.created",
            "source": "order-service",
            "id": order_id,
            "datacontenttype": "application/json",
            "traceparent": headers.get("traceparent", ""),
            "data": order_data
        }
        
        resp = requests.post(
            f"http://localhost:{DAPR_PORT}/v1.0/publish/pubsub/orders",
            json=cloud_event,
            headers={"Content-Type": "application/cloudevents+json"}
        )
        span.set_attribute("messaging.status", resp.status_code)
```

## Viewing Traces in Jaeger

```bash
# Deploy Jaeger
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/examples/simplest.yaml

# Port-forward to Jaeger UI
kubectl port-forward svc/jaeger-query 16686:16686

# Open Jaeger UI
open http://localhost:16686

# Search for a specific trace
# Use the trace ID from a request's traceparent header
```

## Summary

Dapr propagates W3C TraceContext headers automatically on all service invocation and pub/sub calls, creating parent-child span relationships across service boundaries. Configure the Dapr tracing endpoint to point at an OpenTelemetry Collector or Zipkin instance. In your application code, extract the `traceparent` header Dapr forwards and use the OpenTelemetry SDK to create child spans for internal operations, giving you complete end-to-end visibility from the initial HTTP request through every Dapr-mediated call in the chain.
