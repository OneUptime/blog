# How to Send Dapr Traces to Honeycomb

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, Honeycomb, OpenTelemetry, Observability

Description: Configure Dapr to send distributed traces to Honeycomb using OTLP export, with API key authentication and service dataset routing.

---

## Overview

Honeycomb is an observability platform optimized for high-cardinality event analysis. Dapr's OpenTelemetry integration sends spans directly to Honeycomb's OTLP endpoint using an API key for authentication. You can either use the OpenTelemetry Collector as a proxy or send directly from the Dapr sidecar.

## Get Your Honeycomb API Key

Log into Honeycomb and navigate to Account Settings > API Keys. Create a new API key with "Send Events" permission and note your team name and dataset.

## Option 1 - Direct Export from Dapr

Configure Dapr to export directly to Honeycomb's OTLP endpoint:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-honeycomb-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "api.honeycomb.io:443"
      isSecure: true
      protocol: grpc
```

Inject the API key as an environment variable via the sidecar:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "checkout-service"
  dapr.io/config: "dapr-honeycomb-tracing"
  dapr.io/env: "OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY"
```

## Option 2 - Via OpenTelemetry Collector

Using the collector gives you more control over batching and sampling:

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
        send_batch_size: 1024
      attributes:
        actions:
          - key: environment
            value: production
            action: upsert

    exporters:
      otlp/honeycomb:
        endpoint: api.honeycomb.io:443
        headers:
          x-honeycomb-team: "${HONEYCOMB_API_KEY}"
          x-honeycomb-dataset: dapr-traces

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch, attributes]
          exporters: [otlp/honeycomb]
```

Store the API key as a Kubernetes secret:

```bash
kubectl create secret generic honeycomb-credentials \
  --from-literal=api-key=YOUR_API_KEY \
  -n monitoring
```

Reference the secret in the collector deployment:

```yaml
env:
  - name: HONEYCOMB_API_KEY
    valueFrom:
      secretKeyRef:
        name: honeycomb-credentials
        key: api-key
```

## Enriching Spans with Custom Fields

Add high-cardinality fields that Honeycomb can query:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def process_order(order_id: str, customer_id: str):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("customer.id", customer_id)
        span.set_attribute("order.total_usd", 99.99)
        span.set_attribute("order.item_count", 3)
        # business logic
```

## Querying in Honeycomb

In Honeycomb's query builder, filter by Dapr-specific fields:

```sql
WHERE service.name = "checkout-service"
AND dapr.app_id EXISTS
GROUP BY dapr.method
CALCULATE P99(duration_ms)
```

## Verifying the Connection

```bash
# Verify API key and connectivity
curl https://api.honeycomb.io/1/auth \
  -H "x-honeycomb-team: YOUR_API_KEY" \
  -w "\n%{http_code}"
# Expected: 200
```

## Summary

Sending Dapr traces to Honeycomb requires setting the OTLP endpoint to `api.honeycomb.io:443` with TLS enabled and passing your API key via the `x-honeycomb-team` header. You can export directly from the sidecar using environment variable injection, or route through the OpenTelemetry Collector for additional processing. Add high-cardinality span attributes to take full advantage of Honeycomb's query engine.
