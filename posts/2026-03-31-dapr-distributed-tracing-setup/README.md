# How to Set Up Distributed Tracing in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, OpenTelemetry, Observability, Microservice, Monitoring

Description: Enable distributed tracing in Dapr to gain end-to-end visibility into requests flowing across microservices, from setup to viewing traces.

---

## Overview

Distributed tracing tracks requests as they flow through multiple microservices, correlating spans into a single trace. Dapr generates trace data automatically for service invocations and pub/sub messages, injecting trace context headers so you can follow a request from entry point to all downstream services without adding instrumentation code to your application.

## How Dapr Generates Traces

Dapr's sidecar automatically:
- Creates a root span for incoming requests
- Propagates W3C Trace Context headers to downstream services
- Records spans for Dapr API calls (service invocation, pub/sub)
- Exports trace data to configured backends via OpenTelemetry

## Enabling Tracing with Configuration

Dapr tracing is enabled via a `Configuration` resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin.monitoring.svc.cluster.local:9411/api/v2/spans"
```

Apply it:

```bash
kubectl apply -f dapr-tracing.yaml
```

Reference the configuration in your deployment:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "dapr-tracing"
```

## Setting Up Zipkin

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zipkin
  template:
    metadata:
      labels:
        app: zipkin
    spec:
      containers:
        - name: zipkin
          image: openzipkin/zipkin:latest
          ports:
            - containerPort: 9411
---
apiVersion: v1
kind: Service
metadata:
  name: zipkin
  namespace: monitoring
spec:
  selector:
    app: zipkin
  ports:
    - port: 9411
      targetPort: 9411
```

```bash
kubectl apply -f zipkin.yaml
kubectl port-forward -n monitoring svc/zipkin 9411:9411
```

## Using OpenTelemetry Collector

For more flexibility, route traces through the OpenTelemetry Collector:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-tracing
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

## Testing Trace Generation

Deploy two services and make a service invocation call:

```bash
# Service A calls Service B via Dapr
curl -X POST http://localhost:3500/v1.0/invoke/service-b/method/process \
  -H "Content-Type: application/json" \
  -d '{"requestId": "trace-test-001"}'

# Open Zipkin UI to see the trace
open http://localhost:9411
```

You should see a trace with spans from both sidecar proxies showing latency at each hop.

## Self-Hosted Tracing Setup

For local development:

```yaml
# ~/.dapr/config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprConfig
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://localhost:9411/api/v2/spans"
```

```bash
# Start Zipkin
docker run -d -p 9411:9411 openzipkin/zipkin

# Run app with tracing config
dapr run --app-id order-service \
  --app-port 5000 \
  --config ./dapr-config.yaml \
  python app.py
```

## Summary

Dapr generates distributed traces automatically for all sidecar-mediated operations. Enable tracing with a `Configuration` resource that sets a sampling rate and backend endpoint. For Kubernetes, deploy Zipkin or an OpenTelemetry Collector and reference the configuration in your deployment annotations. Dapr's automatic instrumentation means you gain full distributed tracing visibility without modifying your application code.
