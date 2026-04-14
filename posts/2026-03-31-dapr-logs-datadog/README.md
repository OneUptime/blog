# How to Send Dapr Logs to Datadog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Datadog, Logging, Observability, Kubernetes

Description: Learn how to forward Dapr sidecar and application logs to Datadog using the Datadog Agent DaemonSet with container log collection and JSON log parsing.

---

## Overview

Datadog provides unified logging, metrics, and APM in a single platform. Sending Dapr logs to Datadog allows you to correlate log events with Dapr metrics and traces, set up log-based monitors, and build operational dashboards for your microservice fleet.

## Enabling Dapr JSON Logging

Enable structured JSON logging on your Dapr-enabled pods:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "checkout-service"
  dapr.io/app-port: "8080"
  dapr.io/log-as-json: "true"
  dapr.io/log-level: "info"
```

## Deploying the Datadog Agent

Install the Datadog Agent using Helm:

```bash
helm repo add datadog https://helm.datadoghq.com
helm repo update

helm install datadog-agent datadog/datadog \
  --namespace datadog \
  --create-namespace \
  --set datadog.apiKey="${DD_API_KEY}" \
  --set datadog.logs.enabled=true \
  --set datadog.logs.containerCollectAll=true \
  --set agents.image.tag=7
```

## Configuring Log Collection for Dapr Containers

Add a Datadog pod annotation to enable log collection with JSON parsing:

```yaml
annotations:
  ad.datadoghq.com/daprd.logs: |
    [{
      "source": "dapr",
      "service": "order-service",
      "log_processing_rules": [
        {
          "type": "multi_line",
          "name": "json_logs",
          "pattern": "^\\{"
        }
      ]
    }]
```

For the application container:

```yaml
annotations:
  ad.datadoghq.com/order-service.logs: |
    [{
      "source": "nodejs",
      "service": "order-service",
      "auto_multi_line_detection": true
    }]
```

## Creating a Datadog Log Pipeline

Datadog automatically parses JSON-formatted logs during preprocessing, so Dapr's JSON fields are available as attributes. Create a log pipeline to remap those attributes to Datadog's reserved fields:

```json
{
  "name": "Dapr Sidecar Logs",
  "filter": {
    "query": "source:dapr"
  },
  "processors": [
    {
      "type": "status-remapper",
      "name": "Remap level to status",
      "is_enabled": true,
      "sources": ["level"]
    },
    {
      "type": "service-remapper",
      "name": "Remap app_id to service",
      "is_enabled": true,
      "sources": ["app_id"]
    }
  ]
}
```

## Querying Dapr Logs in Datadog

Use the Logs Explorer with Datadog query syntax:

```bash
# All errors from Dapr sidecars
source:dapr status:error

# Circuit breaker events
source:dapr "circuit breaker"

# Errors for a specific service
source:dapr service:order-service status:error

# Resiliency policy activations
source:dapr "resiliency" @app_id:payment-service
```

## Setting Up Log-Based Monitors

Create a Datadog monitor that alerts on elevated Dapr error rates:

```bash
curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Dapr Error Rate",
    "type": "log alert",
    "query": "logs(\"source:dapr status:error\").index(\"*\").rollup(\"count\").last(\"5m\") > 50",
    "message": "Dapr error rate is high. Notify: @slack-dapr-alerts",
    "options": {
      "thresholds": { "critical": 50, "warning": 20 }
    }
  }'
```

## Summary

Sending Dapr logs to Datadog using the Datadog Agent DaemonSet provides log-metrics-trace correlation in a single platform. Enable Dapr JSON logging, configure the Datadog Agent for container log collection, add pod annotations for structured parsing, and build Datadog log pipelines to normalize Dapr fields. Log-based monitors catch error spikes before they impact users.
