# How to Send Dapr Traces to Splunk Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, Splunk, OpenTelemetry, Observability

Description: Configure Dapr to send distributed traces to Splunk Observability Cloud using the OpenTelemetry Collector with Splunk HEC or OTLP SAPM exporter.

---

## Overview

Splunk Observability Cloud (formerly SignalFx APM) accepts OpenTelemetry traces via the SAPM protocol or OTLP. Dapr's sidecar exports spans through the OpenTelemetry Collector, which forwards them to Splunk using an ingest token for authentication.

## Get Splunk Credentials

In Splunk Observability Cloud, navigate to Data Management > Access Tokens and create a token with "Ingest" scope. Note your realm (e.g., `us1`, `eu0`).

## OpenTelemetry Collector Configuration

Deploy the collector with the Splunk SAPM exporter:

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

    processors:
      batch:
        timeout: 5s
      resourcedetection:
        detectors: [env, k8snode]
      attributes:
        actions:
          - key: deployment.environment
            value: production
            action: upsert

    exporters:
      sapm:
        access_token: "${SPLUNK_ACCESS_TOKEN}"
        endpoint: https://ingest.YOUR_REALM.signalfx.com/v2/trace

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch, resourcedetection, attributes]
          exporters: [sapm]
```

Store the access token:

```bash
kubectl create secret generic splunk-credentials \
  --from-literal=access-token=YOUR_ACCESS_TOKEN \
  -n monitoring
```

## Alternative - OTLP Export to Splunk

If you prefer OTLP over SAPM:

```yaml
exporters:
  otlphttp/splunk:
    endpoint: https://ingest.YOUR_REALM.signalfx.com/v2/trace/otlp
    headers:
      X-SF-Token: "${SPLUNK_ACCESS_TOKEN}"
```

## Dapr Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-splunk-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring:4317"
      isSecure: false
      protocol: grpc
```

Apply to services:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "dapr-splunk-tracing"
  dapr.io/env: "OTEL_RESOURCE_ATTRIBUTES=service.name=order-service,deployment.environment=production"
```

## Kubernetes Enrichment

Add Kubernetes metadata to spans using the k8sattributes processor:

```yaml
processors:
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.pod.name
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.node.name
```

This adds pod-level context to every Dapr span in Splunk APM.

## Viewing Traces in Splunk APM

Navigate to Splunk Observability > APM > Service Map. Your Dapr services appear as nodes with edges representing service-to-service calls. Filter by `deployment.environment` tag to separate prod from staging traces.

```bash
# Verify traces are flowing using the Splunk Observability APM API
curl -X GET \
  "https://api.YOUR_REALM.signalfx.com/v2/apm/trace/TRACE_ID/latest" \
  -H "X-SF-Token: YOUR_ACCESS_TOKEN" | jq '.spans | length'
```

## Summary

Sending Dapr traces to Splunk Observability requires the OpenTelemetry Collector with either the SAPM or OTLP/HTTP exporter pointing at your Splunk realm's ingest endpoint. The `k8sattributes` processor enriches spans with Kubernetes metadata for pod-level correlation. Configure Dapr with `samplingRate: "1"` for full visibility or reduce it for high-throughput services where tail sampling at the collector handles error retention.
