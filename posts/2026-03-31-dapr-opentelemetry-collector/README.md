# How to Configure OpenTelemetry Collector for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpenTelemetry, Collector, Distributed Tracing, Observability, Microservice

Description: Configure the OpenTelemetry Collector as a trace aggregation layer for Dapr, enabling fan-out to multiple backends and trace processing pipelines.

---

## Overview

The OpenTelemetry Collector is a vendor-neutral agent that receives, processes, and exports telemetry data. Using it between Dapr and your tracing backend adds flexibility: you can fan out traces to multiple backends simultaneously, filter or sample traces before export, and change backends without modifying Dapr configuration. This guide covers deploying and configuring the OTel Collector for Dapr.

## Architecture

```json
[Dapr Sidecar] --> [OTel Collector] --> [Jaeger]
                                    --> [Zipkin]
                                    --> [Datadog]
                                    --> [Prometheus]
```

## Deploying the OTel Collector on Kubernetes

Create a ConfigMap with the collector configuration:

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
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
      zipkin:
        endpoint: 0.0.0.0:9411

    processors:
      batch:
        timeout: 10s
        send_batch_size: 1000
      memory_limiter:
        check_interval: 1s
        limit_mib: 512
      filter/dapr:
        spans:
          include:
            match_type: strict
            services: ["order-service", "payment-service"]

    exporters:
      otlp/jaeger:
        endpoint: jaeger-collector.monitoring.svc.cluster.local:4317
        tls:
          insecure: true
      debug:
        verbosity: detailed

    service:
      pipelines:
        traces:
          receivers: [otlp, zipkin]
          processors: [memory_limiter, batch]
          exporters: [otlp/jaeger, debug]
```

Deploy the collector:

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
          image: otel/opentelemetry-collector-contrib:0.95.0
          args: ["--config=/conf/config.yaml"]
          ports:
            - containerPort: 4317
            - containerPort: 4318
            - containerPort: 9411
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
      targetPort: 4317
    - name: http
      port: 4318
      targetPort: 4318
    - name: zipkin
      port: 9411
      targetPort: 9411
```

## Dapr Configuration to Use OTel Collector

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-otel-config
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

Apply to your deployment:

```yaml
annotations:
  dapr.io/config: "dapr-otel-config"
```

## Adding Multiple Exporters

Export to both Jaeger and a commercial APM:

```yaml
exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
  datadog:
    api:
      key: ${DD_API_KEY}
      site: datadoghq.com

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger, datadog]
```

## Testing the Pipeline

```bash
# Port-forward the collector
kubectl port-forward -n monitoring svc/otel-collector 4317:4317

# Send a test span using telemetrygen
docker run --rm ghcr.io/open-telemetry/opentelemetry-collector-contrib/telemetrygen:latest \
  traces --otlp-endpoint localhost:4317 --otlp-insecure --duration 5s
```

## Summary

The OpenTelemetry Collector acts as a central aggregation and routing layer for Dapr traces. Configure Dapr to send traces to the collector via gRPC OTLP, then fan out to multiple backends using the collector's exporter configuration. The collector's processor pipeline lets you batch, filter, and sample traces before export, reducing backend load without modifying Dapr or application configuration.
