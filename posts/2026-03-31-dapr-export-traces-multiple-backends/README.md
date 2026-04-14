# How to Export Dapr Traces to Multiple Backends Simultaneously

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, OpenTelemetry, Observability, Zipkin, Jaeger

Description: Configure Dapr to export distributed traces to multiple backends at the same time using OpenTelemetry Collector as a fan-out proxy.

---

By default, Dapr supports a single tracing exporter in its configuration. To send traces to multiple backends simultaneously - such as Zipkin for development and Jaeger for production - use the OpenTelemetry Collector as a central routing hub.

## Architecture Overview

The recommended pattern is:

1. Dapr sidecars export traces to the OpenTelemetry Collector using OTLP.
2. The Collector fans out to multiple exporters (Zipkin, Jaeger, Tempo, etc.).

This keeps Dapr configuration simple and centralizes the routing logic in the Collector.

## Step 1 - Configure Dapr to Use OTLP

Create a Dapr Configuration resource pointing to the OpenTelemetry Collector:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring:4317"
      isSecure: false
      protocol: grpc
```

```bash
kubectl apply -f tracing-config.yaml
```

## Step 2 - Deploy the OpenTelemetry Collector

Create a ConfigMap with the Collector configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: "0.0.0.0:4317"
          http:
            endpoint: "0.0.0.0:4318"

    exporters:
      zipkin:
        endpoint: "http://zipkin.monitoring:9411/api/v2/spans"
      otlp/jaeger:
        endpoint: "jaeger-collector.monitoring:4317"
        tls:
          insecure: true
      debug:
        verbosity: detailed

    service:
      pipelines:
        traces:
          receivers: [otlp]
          exporters: [zipkin, otlp/jaeger, debug]
```

```bash
kubectl apply -f otel-collector-configmap.yaml
```

## Step 3 - Deploy the Collector

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
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
        image: otel/opentelemetry-collector-contrib:0.96.0
        args: ["--config=/conf/config.yaml"]
        volumeMounts:
        - name: config
          mountPath: /conf
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  selector:
    app: otel-collector
  ports:
  - name: grpc
    port: 4317
  - name: http
    port: 4318
```

```bash
kubectl apply -f otel-collector-deployment.yaml
```

## Step 4 - Verify Fan-Out

Generate some traffic between your Dapr-enabled services, then check both backends:

```bash
# Port-forward to Zipkin
kubectl port-forward svc/zipkin 9411:9411 -n monitoring

# Port-forward to Jaeger
kubectl port-forward svc/jaeger-query 16686:16686 -n monitoring
```

Open both UIs and confirm the same trace ID appears in both systems.

## Adding a Third Backend

To add Grafana Tempo or another backend, simply append another exporter to the Collector pipeline:

```yaml
exporters:
  otlp/tempo:
    endpoint: "tempo.monitoring:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [zipkin, otlp/jaeger, otlp/tempo]
```

## Summary

Using the OpenTelemetry Collector as a fan-out layer lets you send Dapr traces to multiple backends without changing your Dapr configuration. The Collector handles routing, batching, and retry logic, making it the most flexible approach for multi-backend observability. This pattern also makes it easy to add or remove backends without redeploying your application.
