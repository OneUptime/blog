# How to Send Dapr Traces to Lightstep

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, Lightstep, OpenTelemetry, Observability

Description: Configure Dapr distributed tracing to send spans to Lightstep (now ServiceNow Cloud Observability) using OTLP with access token authentication.

---

## Overview

Lightstep, now known as ServiceNow Cloud Observability, accepts traces via the OTLP protocol. Dapr's OpenTelemetry exporter can be pointed at Lightstep's public OTLP endpoint with an access token for authentication. This guide covers both direct export and collector-proxied configurations.

## Get Your Lightstep Access Token

In the Lightstep console, navigate to Settings > Access Tokens and create a token with trace write permissions. Note your project name.

## Direct Export Configuration

Configure Dapr to export directly to Lightstep:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-lightstep-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "ingest.lightstep.com:443"
      isSecure: true
      protocol: grpc
```

Inject the access token via sidecar environment variables:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "payment-service"
  dapr.io/config: "dapr-lightstep-tracing"
  dapr.io/env: "OTEL_EXPORTER_OTLP_HEADERS=lightstep-access-token=YOUR_TOKEN"
```

## Collector-Based Configuration

For production, use the OpenTelemetry Collector to buffer and retry:

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

    exporters:
      otlp/lightstep:
        endpoint: ingest.lightstep.com:443
        headers:
          lightstep-access-token: "${LIGHTSTEP_TOKEN}"
        retry_on_failure:
          enabled: true
          initial_interval: 5s
          max_elapsed_time: 300s

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp/lightstep]
```

Store the token securely:

```bash
kubectl create secret generic lightstep-credentials \
  --from-literal=token=YOUR_ACCESS_TOKEN \
  -n monitoring
```

Mount the secret in the collector deployment:

```yaml
env:
  - name: LIGHTSTEP_TOKEN
    valueFrom:
      secretKeyRef:
        name: lightstep-credentials
        key: token
```

## Validating Trace Flow

Trigger a Dapr service call and verify traces appear in Lightstep:

```bash
# Generate a trace
curl -X POST http://localhost:3500/v1.0/invoke/payment-service/method/charge \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "USD"}'

# Check collector logs for successful export
kubectl logs -n monitoring deployment/otel-collector | grep lightstep
```

## Service Diagram in Lightstep

Lightstep automatically builds a service diagram from Dapr trace data. Ensure service names are consistent by setting resource attributes:

```yaml
annotations:
  dapr.io/env: "OTEL_RESOURCE_ATTRIBUTES=service.name=payment-service,OTEL_EXPORTER_OTLP_HEADERS=lightstep-access-token=YOUR_TOKEN"
```

## Sampling Strategy

For high-traffic services, reduce to probabilistic sampling at the sidecar:

```yaml
spec:
  tracing:
    samplingRate: "0.1"
```

Then enable Lightstep's dynamic sampling to retain 100% of error traces regardless of the base rate.

## Summary

Sending Dapr traces to Lightstep requires pointing the OTLP exporter at `ingest.lightstep.com:443` with the access token in the `lightstep-access-token` header. Using the OpenTelemetry Collector adds retry-on-failure logic that prevents trace loss during network interruptions. Set consistent service names via OTEL resource attributes so Lightstep builds an accurate service dependency graph from your Dapr service calls.
