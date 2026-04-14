# How to Send Dapr Traces to Jaeger

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Jaeger, Distributed Tracing, Observability, Microservice, Monitoring

Description: Configure Dapr to export distributed traces to Jaeger for visualization and analysis of request flows across your microservices.

---

## Overview

Jaeger is an open-source distributed tracing platform originally developed by Uber. It provides a powerful UI for visualizing trace data, analyzing latency distributions, and finding bottlenecks in microservice architectures. Dapr supports sending traces to Jaeger directly via Zipkin-compatible API or through OpenTelemetry Collector. This guide covers both approaches.

## Deploying Jaeger on Kubernetes

The simplest deployment uses the Jaeger all-in-one image (not for production - use Jaeger with Cassandra/Elasticsearch for production):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: monitoring
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
          image: jaegertracing/all-in-one:1.53
          ports:
            - containerPort: 16686  # UI
            - containerPort: 4317   # OTLP gRPC
            - containerPort: 14268  # HTTP collector
            - containerPort: 14250  # gRPC collector
            - containerPort: 9411   # Zipkin compatible
          env:
            - name: COLLECTOR_ZIPKIN_HOST_PORT
              value: ":9411"
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger
  namespace: monitoring
spec:
  selector:
    app: jaeger
  ports:
    - name: ui
      port: 16686
      targetPort: 16686
    - name: zipkin
      port: 9411
      targetPort: 9411
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
    - name: grpc
      port: 14250
      targetPort: 14250
```

```bash
kubectl apply -f jaeger.yaml
```

## Dapr Configuration - Direct Zipkin Protocol

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-jaeger
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://jaeger.monitoring.svc.cluster.local:9411/api/v2/spans"
```

## Dapr Configuration - Via OTel Collector (Recommended)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-jaeger-otel
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

OTel Collector config to export to Jaeger:

```yaml
exporters:
  otlp/jaeger:
    endpoint: jaeger.monitoring.svc.cluster.local:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger]
```

## Applying the Configuration to a Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/config: "dapr-jaeger"
```

## Accessing the Jaeger UI

```bash
kubectl port-forward -n monitoring svc/jaeger 16686:16686
open http://localhost:16686
```

## Searching for Traces

In the Jaeger UI:
1. Select service: `order-service`
2. Set time range
3. Click "Find Traces"

Or search by trace ID from application logs:

```bash
# Find trace ID in application logs
kubectl logs -l app=order-service | grep "traceId"

# Search directly via Jaeger API
curl "http://localhost:16686/api/traces?service=order-service&limit=10"
```

## Production Jaeger with Elasticsearch

```bash
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts

helm install jaeger jaegertracing/jaeger \
  --namespace monitoring \
  --set provisionDataStore.cassandra=false \
  --set storage.type=elasticsearch \
  --set storage.elasticsearch.host=elasticsearch.monitoring.svc.cluster.local \
  --set storage.elasticsearch.port=9200
```

## Summary

Dapr sends traces to Jaeger using the Zipkin-compatible collector endpoint (port 9411) or via the OpenTelemetry Collector for more flexibility. Deploy Jaeger's all-in-one image for development and use the Jaeger Helm chart with Elasticsearch for production. Apply the Dapr `Configuration` resource to your deployments via the `dapr.io/config` annotation to enable tracing per service.
