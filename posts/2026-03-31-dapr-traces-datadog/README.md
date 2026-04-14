# How to Send Dapr Traces to Datadog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Datadog, Distributed Tracing, APM, Observability, Microservice, Monitoring

Description: Export Dapr distributed traces to Datadog APM for full-stack observability, service maps, and intelligent alerting across microservices.

---

## Overview

Datadog APM provides distributed tracing with automatic service dependency mapping, anomaly detection, and tight integration with Datadog's metrics and logs. Dapr can export traces to Datadog via the Datadog Agent or OpenTelemetry Collector. This guide covers both approaches for Kubernetes deployments.

## Prerequisites

- Datadog account with APM enabled
- Datadog API key
- Dapr installed on Kubernetes

## Approach 1: OpenTelemetry Collector with Datadog Exporter

Deploy the OTel Collector with the Datadog exporter:

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
      resource:
        attributes:
          - key: deployment.environment
            value: "production"
            action: upsert

    exporters:
      datadog:
        api:
          key: ${DD_API_KEY}
          site: datadoghq.com
        traces:
          span_name_as_resource_name: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [resource, batch]
          exporters: [datadog]
```

Create the API key secret:

```bash
kubectl create secret generic datadog-secret \
  --from-literal=api-key="your-datadog-api-key" \
  -n monitoring
```

OTel Collector deployment with the secret:

```yaml
env:
  - name: DD_API_KEY
    valueFrom:
      secretKeyRef:
        name: datadog-secret
        key: api-key
```

## Approach 2: Dapr to Datadog Agent Direct

Deploy the Datadog Agent with APM enabled and OTel receiver:

```bash
helm repo add datadog https://helm.datadoghq.com

helm install datadog-agent datadog/datadog \
  --namespace monitoring \
  --set datadog.apiKey=your-api-key \
  --set datadog.apm.portEnabled=true \
  --set datadog.otlp.receiver.protocols.grpc.enabled=true \
  --set datadog.otlp.receiver.protocols.grpc.endpoint=0.0.0.0:4317
```

## Dapr Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-datadog
  namespace: default
spec:
  tracing:
    samplingRate: "0.1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

Note: In production, use `samplingRate: "0.1"` (10%) rather than sampling everything to control costs.

## Applying to Services

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "dapr-datadog"
```

## Enriching Traces with Resource Attributes

Add environment and version metadata to traces via OTel Collector:

```yaml
processors:
  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: upsert
      - key: service.version
        from_attribute: k8s.pod.labels.version
        action: insert
```

## Viewing Traces in Datadog

1. Navigate to APM > Traces
2. Filter by service: `order-service`
3. View the flame graph for individual traces
4. Use APM > Service Map to see dependencies

Search for traces via the Spans API:

```bash
curl -X POST "https://api.datadoghq.com/api/v2/spans/events/search" \
  -H "DD-API-KEY: your-api-key" \
  -H "DD-APPLICATION-KEY: your-app-key" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "attributes": {
        "filter": {
          "from": "now-1h",
          "to": "now",
          "query": "service:order-service"
        },
        "sort": "timestamp"
      },
      "type": "search_request"
    }
  }'
```

## Creating APM Monitors

```bash
curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
  -H "DD-API-KEY: your-api-key" \
  -H "DD-APPLICATION-KEY: your-app-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dapr Order Service High Latency",
    "type": "query alert",
    "query": "avg(last_5m):avg:trace.http.request.duration{service:order-service} > 1",
    "message": "Order service average latency exceeded 1s"
  }'
```

## Summary

Dapr traces flow to Datadog via the OpenTelemetry Collector with the Datadog exporter, or directly via the Datadog Agent's OTLP receiver. Use a sampling rate below 1 in production to manage trace ingestion costs. Datadog's service map auto-discovers dependencies from trace data, giving you a live view of how Dapr services communicate without manual configuration.
