# How to Send Dapr Traces to Grafana Tempo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, Grafana, Tempo, OpenTelemetry, Observability

Description: Step-by-step guide to configuring Dapr distributed tracing with Grafana Tempo using the OpenTelemetry Collector as a pipeline.

---

## Overview

Grafana Tempo is a cost-efficient distributed tracing backend that stores traces in object storage and integrates natively with Grafana dashboards. Dapr emits OpenTelemetry-compatible spans, making it straightforward to route traces to Tempo via the OpenTelemetry Collector.

## Architecture

The trace pipeline is:

```text
Dapr Sidecar --> OpenTelemetry Collector --> Grafana Tempo --> Grafana UI
```

Dapr exports spans over OTLP (gRPC or HTTP) to the collector, which forwards them to Tempo's OTLP receiver.

## Deploy Grafana Tempo

Install Tempo using Helm in a basic single-binary configuration:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install tempo grafana/tempo \
  --namespace monitoring \
  --create-namespace \
  --set tempo.storage.trace.backend=local \
  --set tempo.storage.trace.local.path=/var/tempo
```

## Deploy the OpenTelemetry Collector

Create a collector configuration that accepts OTLP from Dapr and exports to Tempo:

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

    processors:
      batch:
        timeout: 5s
        send_batch_size: 512

    exporters:
      otlp:
        endpoint: tempo:4317
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp]
```

Deploy the collector with the ConfigMap mounted:

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
          image: otel/opentelemetry-collector-contrib:latest
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
    - port: 4317
      targetPort: 4317
```

Apply both the ConfigMap and the collector manifests:

```bash
kubectl apply -f otel-collector-configmap.yaml
kubectl apply -f otel-collector-deployment.yaml
```

## Configure Dapr to Export to the Collector

Create a Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-tempo-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring:4317"
      isSecure: false
      protocol: grpc
```

Apply the configuration and annotate your deployments:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "my-service"
  dapr.io/config: "dapr-tempo-tracing"
```

## Connect Grafana to Tempo

Add Tempo as a data source in Grafana:

```bash
# Via Grafana API (using default admin credentials)
curl -X POST http://grafana:3000/api/datasources \
  -u admin:admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tempo",
    "type": "tempo",
    "url": "http://tempo:3200",
    "access": "proxy"
  }'
```

## Verifying the Pipeline

Invoke a Dapr service and check for traces:

```bash
# Trigger a service call
curl -X POST http://localhost:3500/v1.0/invoke/target-service/method/hello \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Query Tempo for recent traces
curl "http://tempo:3200/api/search?limit=5" | jq '.traces[].rootServiceName'
```

## Summary

Sending Dapr traces to Grafana Tempo requires deploying Tempo and an OpenTelemetry Collector, configuring a Dapr Configuration resource to export OTLP spans to the collector, and adding the Tempo data source to Grafana. The single-binary Tempo deployment is cost-effective for development and moderate production workloads, storing traces in local or object storage without requiring a separate index service.
