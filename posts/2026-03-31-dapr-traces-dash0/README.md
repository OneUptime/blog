# How to Send Dapr Traces to Dash0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Dash0, Distributed Tracing, OpenTelemetry, Observability, Microservice, Monitoring

Description: Configure Dapr to send distributed traces to Dash0, an OpenTelemetry-native observability platform, for trace analysis and alerting.

---

## Overview

Dash0 is an OpenTelemetry-native observability platform built specifically around the OTel standard. It accepts traces, metrics, and logs via OTLP, making it straightforward to connect Dapr's tracing pipeline. Because Dash0 is designed for OTel-first workflows, there is minimal configuration overhead to get Dapr traces flowing. This guide covers the setup from Dapr to Dash0.

## Prerequisites

- Dash0 account with an auth token
- Dapr installed on Kubernetes
- OpenTelemetry Collector (recommended for production)

## Getting Dash0 Credentials

From the Dash0 dashboard:
1. Navigate to Settings > Auth Tokens
2. Create a new token with write access
3. Note your Dash0 endpoint (e.g., `ingress.eu-west-1.aws.dash0.com`)

```bash
kubectl create secret generic dash0-secret \
  --from-literal=authToken="your-dash0-auth-token" \
  -n monitoring
```

## Direct OTLP Export to Dash0

Configure Dapr to send traces directly to Dash0's OTLP endpoint:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-dash0
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "ingress.eu-west-1.aws.dash0.com:4317"
      isSecure: true
      protocol: grpc
```

Note: Dapr supports custom headers via the `spec.tracing.otel.headers` field with `secretKeyRef` for Kubernetes secrets, so direct export with auth is possible. However, routing through the OTel Collector is recommended for production as it enables batching, processing, and multi-backend fanout.

## OTel Collector with Dash0 Auth Header

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
      resource:
        attributes:
          - key: service.namespace
            value: "production"
            action: upsert

    exporters:
      otlp/dash0:
        endpoint: ingress.eu-west-1.aws.dash0.com:4317
        headers:
          Authorization: "Bearer ${DASH0_AUTH_TOKEN}"

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [resource, batch]
          exporters: [otlp/dash0]
```

Inject the auth token:

```yaml
env:
  - name: DASH0_AUTH_TOKEN
    valueFrom:
      secretKeyRef:
        name: dash0-secret
        key: authToken
```

## Dapr Configuration via Collector

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-dash0
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

Apply to your deployments:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "dapr-dash0"
```

## Viewing Traces in Dash0

After traces start flowing, the Dash0 UI shows:
- Trace timeline view with span waterfalls
- Service graph showing Dapr service dependencies
- Span attribute search and filtering
- Latency distribution histograms

## Verifying Data Flow

```bash
# Check OTel Collector logs
kubectl logs -n monitoring -l app=otel-collector | grep "dash0"

# Verify with a test service invocation
curl -X POST http://localhost:3500/v1.0/invoke/downstream-service/method/ping \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Setting Up Dash0 Alerts

Create an alert in the Dash0 UI for high latency:

1. Navigate to Monitoring > Alerting and configure a new alert check
2. Use the `dash0.spans.duration` histogram metric with a p99 quantile
3. Filter by `service.name = "order-service"`
4. Set threshold and notification channel

## Querying Trace Data

Dash0 supports filtering and querying trace data. Use the filter bar in the trace explorer to search by attributes:

```text
service.name = "order-service"
span.kind = "server"
```

For metric-based queries (e.g., latency analysis), Dash0 uses PromQL with native histogram metrics like `dash0.spans.duration`.

## Summary

Dash0's OTel-native design makes it one of the simplest backends to connect to Dapr. Route Dapr's OTLP traces through the OpenTelemetry Collector to inject the Dash0 auth token header, then fan traces out to Dash0 for visualization and alerting. The Dash0 service graph automatically maps Dapr microservice dependencies from trace data without additional configuration.
