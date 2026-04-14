# How to Use Dapr with GCP Cloud Trace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Tracing, Observability, Distributed Trace

Description: Configure Dapr distributed tracing to export spans to Google Cloud Trace for end-to-end visibility into microservice request flows on GCP.

---

## Overview

Google Cloud Trace is a distributed tracing system that collects latency data from applications. When integrated with Dapr, Cloud Trace gives you end-to-end visibility into service-to-service calls, pub/sub flows, and state operations across your microservice mesh.

## Prerequisites

- GCP project with Cloud Trace API enabled
- Dapr installed on GKE or locally
- OpenTelemetry Collector or a Zipkin-to-Cloud Trace bridge

## Approach 1: OpenTelemetry Collector Export

The recommended approach routes Dapr's Zipkin traces through the OpenTelemetry Collector:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://otel-collector:9411/api/v2/spans"
```

Configure the collector to export to Cloud Trace:

```yaml
exporters:
  googlecloud:
    project: my-gcp-project
    trace:
      endpoint: cloudtrace.googleapis.com
```

## Approach 2: Direct Zipkin to Cloud Trace

Use Stackdriver Zipkin proxy as an alternative:

```bash
docker run -d \
  -p 9411:9411 \
  --name zipkin-stackdriver \
  -e STORAGE_TYPE=stackdriver \
  -e STACKDRIVER_PROJECT_ID=my-gcp-project \
  openzipkin/zipkin-gcp:latest
```

Point Dapr to this proxy:

```yaml
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin-stackdriver:9411/api/v2/spans"
```

## Propagating Trace Context

Dapr automatically propagates W3C TraceContext headers between services. Ensure your services forward these headers when making outbound calls:

```python
from flask import Flask, request
import requests

app = Flask(__name__)

@app.route("/checkout", methods=["POST"])
def checkout():
    # Forward trace headers to downstream calls
    trace_headers = {
        "traceparent": request.headers.get("traceparent"),
        "tracestate": request.headers.get("tracestate")
    }
    # Dapr service invocation handles this automatically
    response = requests.post(
        "http://localhost:3500/v1.0/invoke/payment-service/method/charge",
        json=request.json,
        headers=trace_headers
    )
    return response.json()
```

## Viewing Traces in Cloud Trace

Navigate to Cloud Trace in the GCP Console. Filter by service name using the `dapr.io/app-id` label:

```bash
# List recent traces for a specific service using the Cloud Trace API
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://cloudtrace.googleapis.com/v1/projects/my-gcp-project/traces?filter=%2Blabel:dapr.io/app-id:order-service&pageSize=20"
```

## Custom Span Attributes

Add custom attributes to spans for better filtering:

```go
import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
)

func processOrder(ctx context.Context, orderId string) {
    tracer := otel.Tracer("order-service")
    ctx, span := tracer.Start(ctx, "processOrder")
    defer span.End()

    span.SetAttributes(
        attribute.String("order.id", orderId),
        attribute.String("order.region", "us-west"),
    )
    // Process order...
}
```

## Summary

Google Cloud Trace integrates with Dapr through the OpenTelemetry Collector, capturing end-to-end distributed traces across your microservices. With automatic trace context propagation and custom span attributes, you can diagnose latency bottlenecks and trace failures across complex service chains.
