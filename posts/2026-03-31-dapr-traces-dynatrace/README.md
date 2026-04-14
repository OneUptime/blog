# How to Send Dapr Traces to Dynatrace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Dynatrace, Distributed Tracing, APM, Observability, Microservice, Monitoring

Description: Export Dapr distributed traces to Dynatrace using the OpenTelemetry Collector for AI-powered dependency analysis and automatic baselining.

---

## Overview

Dynatrace is an AI-powered observability platform that automatically discovers service dependencies through its Davis AI engine. While Dynatrace natively instruments applications via OneAgent, you can also ingest Dapr's OpenTelemetry trace data via Dynatrace's OTLP ingest endpoint. This guide covers configuring the OpenTelemetry Collector to forward Dapr traces to Dynatrace.

## Prerequisites

- Dynatrace SaaS or Managed environment
- Dynatrace API token with `openTelemetryTrace.ingest` permission
- OpenTelemetry Collector deployed
- Dapr installed

## Creating a Dynatrace API Token

1. Go to Dynatrace Settings > Access Tokens
2. Create a new token with the `openTelemetryTrace.ingest` scope

```bash
# Store the token as a Kubernetes secret
kubectl create secret generic dynatrace-secret \
  --from-literal=apiToken="dt0c01.xxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -n monitoring
```

## OTel Collector Configuration

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
        send_batch_size: 256
      resource:
        attributes:
          - key: dt.kubernetes.cluster.id
            value: "${K8S_CLUSTER_ID}"
            action: upsert

    exporters:
      otlphttp/dynatrace:
        endpoint: "https://your-environment-id.live.dynatrace.com/api/v2/otlp"
        headers:
          Authorization: "Api-Token ${DT_API_TOKEN}"

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [resource, batch]
          exporters: [otlphttp/dynatrace]
```

OTel Collector environment variables:

```yaml
env:
  - name: DT_API_TOKEN
    valueFrom:
      secretKeyRef:
        name: dynatrace-secret
        key: apiToken
  - name: K8S_CLUSTER_ID
    value: "your-cluster-id"
```

## Dapr Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-dynatrace
  namespace: default
spec:
  tracing:
    samplingRate: "0.1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

## Applying to Deployments

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
        dapr.io/config: "dapr-dynatrace"
```

## Verifying Ingestion

```bash
# Check OTel Collector logs for successful exports to Dynatrace
kubectl logs -l app=otel-collector -n monitoring --tail=100 | grep -i "export"

# Verify traces appear in Dynatrace:
# Open your Dynatrace environment and navigate to Distributed Traces.
# Filter by service name "order-service" and time range "Last 30 minutes".

# Or query discovered services via the Entities API (requires entities.read scope):
curl "https://your-environment-id.live.dynatrace.com/api/v2/entities" \
  -H "Authorization: Api-Token your-token" \
  -G \
  --data-urlencode "entitySelector=type(SERVICE),entityName(\"order-service\")" \
  --data-urlencode "from=now-30m"
```

## Using DQL to Analyze Traces

```sql
-- Find slowest service-to-service calls
fetch spans
| filter service.name == "order-service"
| filter span.kind == "client"
| sort duration desc
| limit 20
| fields timestamp, name, duration, service.name, peer.service
```

## Combining with Dynatrace OneAgent

If you run Dynatrace OneAgent alongside Dapr, the traces from both are correlated automatically. OneAgent captures JVM/Node/Python level traces while Dapr captures network-level spans, giving you full-stack visibility in the same Dynatrace Service Flow view.

## Summary

Dapr traces reach Dynatrace via an OTel Collector configured with the `otlphttp/dynatrace` exporter and a Dynatrace API token. Use Dynatrace's DQL query language to analyze span data and Davis AI automatically baselines performance to detect anomalies. For maximum visibility, combine OTel-based Dapr traces with Dynatrace OneAgent process-level instrumentation.
