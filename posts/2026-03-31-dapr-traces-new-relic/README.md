# How to Send Dapr Traces to New Relic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, New Relic, Distributed Tracing, APM, Observability, Microservice, Monitoring

Description: Export Dapr distributed traces to New Relic for full-stack observability with distributed tracing, NRQL queries, and intelligent alerting.

---

## Overview

New Relic is a full-stack observability platform with strong distributed tracing support via OpenTelemetry. Dapr traces can be sent to New Relic using the OpenTelemetry Collector with the OTLP exporter, or directly using Dapr's built-in OTLP endpoint configuration pointing at New Relic's OTLP ingest endpoint. This guide covers both methods.

## Prerequisites

- New Relic account with a License Key
- Dapr installed on Kubernetes
- OpenTelemetry Collector (optional but recommended)

## Direct OTLP Export to New Relic

New Relic accepts OTLP data directly without needing a collector. Dapr supports custom OTLP headers via the `headers` field:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-newrelic
  namespace: default
spec:
  tracing:
    samplingRate: "0.1"
    otel:
      endpointAddress: "otlp.nr-data.net:4317"
      isSecure: true
      protocol: grpc
      headers:
        - "api-key=your-new-relic-license-key"
```

Note: The direct approach requires the License Key in plaintext in the configuration. For better secret management, use the OTel Collector approach below, which supports environment variable substitution for the key.

## OTel Collector with New Relic Exporter

Store the New Relic License Key as a Kubernetes secret:

```bash
kubectl create secret generic newrelic-secret \
  --from-literal=licenseKey="your-new-relic-license-key"
```

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
        timeout: 10s
      attributes:
        actions:
          - key: environment
            value: "production"
            action: upsert

    exporters:
      otlp/newrelic:
        endpoint: otlp.nr-data.net:4317
        headers:
          api-key: ${NEW_RELIC_LICENSE_KEY}
        tls:
          insecure: false

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [attributes, batch]
          exporters: [otlp/newrelic]
```

Inject the license key:

```yaml
env:
  - name: NEW_RELIC_LICENSE_KEY
    valueFrom:
      secretKeyRef:
        name: newrelic-secret
        key: licenseKey
```

## Dapr Configuration Using Collector

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-newrelic
  namespace: default
spec:
  tracing:
    samplingRate: "0.1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

## Apply to Services

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "dapr-newrelic"
```

## Querying Traces with NRQL

```sql
-- Find slow Dapr service invocations
SELECT average(duration.ms)
FROM Span
WHERE service.name = 'order-service'
AND span.kind = 'client'
SINCE 1 hour ago
FACET name
ORDER BY average(duration.ms) DESC
LIMIT 10
```

```sql
-- Count errors by operation
SELECT count(*)
FROM Span
WHERE service.name = 'order-service'
AND otel.status_code = 'ERROR'
SINCE 30 minutes ago
FACET name
```

## Viewing Distributed Traces

1. Navigate to APM & Services in New Relic
2. Select your service (e.g., `order-service`)
3. Click "Distributed tracing"
4. Filter by duration, error, or attribute

## Creating Alerts

```bash
# Using New Relic NerdGraph API
curl -s https://api.newrelic.com/graphql \
  -H "Content-Type: application/json" \
  -H "API-Key: $NEW_RELIC_USER_KEY" \
  -d @- <<'EOF'
{
  "query": "mutation($accountId: Int!, $policyId: ID!, $condition: AlertsNrqlConditionStaticInput!) { alertsNrqlConditionStaticCreate(accountId: $accountId, policyId: $policyId, condition: $condition) { id name } }",
  "variables": {
    "accountId": YOUR_ACCOUNT_ID,
    "policyId": "12345",
    "condition": {
      "name": "Dapr High Latency",
      "enabled": true,
      "nrql": {
        "query": "SELECT average(duration.ms) FROM Span WHERE service.name = 'order-service'"
      },
      "terms": [{
        "threshold": 500,
        "thresholdOccurrences": "ALL",
        "thresholdDuration": 300,
        "operator": "ABOVE",
        "priority": "CRITICAL"
      }]
    }
  }
}
EOF
```

## Summary

Dapr traces reach New Relic via the OpenTelemetry Collector using the OTLP exporter with a New Relic License Key header. Configure a low sampling rate in production to stay within your data ingest budget. New Relic's distributed tracing UI shows flame graphs and service relationships, while NRQL lets you write ad-hoc queries to find performance bottlenecks and error patterns.
