# How to Create Custom Dapr Metrics Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Dashboard, Grafana, Metric, Observability

Description: Build tailored Grafana dashboards for Dapr that combine service invocation, pub/sub, state store, and actor metrics in a single operational view.

---

While the official Dapr Grafana dashboards cover common cases, custom dashboards let you combine metrics across services, correlate different signal types, and surface the KPIs that matter most to your team.

## Dashboard Design Principles

A good Dapr operational dashboard should answer:
1. Are all services healthy right now?
2. Which services have the most traffic?
3. Are there any latency or error regressions?
4. How are backing components performing?

Structure your dashboard in rows by concern: overview, service health, component health, and actor health.

## Row 1 - Fleet Overview

Use stat panels for at-a-glance health:

```text
# Total request rate across all services
sum(rate(dapr_http_server_request_count[5m]))

# Overall error rate
sum(rate(dapr_http_server_request_count{status!~"2.."}[5m]))
/ sum(rate(dapr_http_server_request_count[5m]))

# Number of active services
count(
  sum by (app_id) (
    rate(dapr_http_server_request_count[5m])
  ) > 0
)

# Total pending actor calls
sum(dapr_runtime_actor_pending_actor_calls)
```

## Row 2 - Service Health Heatmap

Create a table panel showing all services with color-coded health:

```text
# Color: green = low error rate, red = high error rate
sum by (app_id) (rate(dapr_http_server_request_count{status!~"2.."}[5m]))
/ sum by (app_id) (rate(dapr_http_server_request_count[5m]))
```

Set thresholds: 0=green, 0.01=yellow, 0.05=red.

## Row 3 - Latency Distribution

Show a heatmap of request latency across all services:

```text
# Heatmap data source query
sum by (le) (
  rate(dapr_http_server_latency_bucket{app_id=~"$app_id"}[5m])
)
```

Use visualization type "Heatmap" with Y-axis showing latency buckets.

## Row 4 - Component Health

State store and pub/sub error rates in a single table:

```text
# State store errors
sum by (component) (
  rate(dapr_component_state_count{status="fail"}[5m])
)

# Pub/sub failures
sum by (component, topic) (
  rate(dapr_component_pubsub_ingress_count{status!="success"}[5m])
)
```

## Dashboard Variables JSON

Define template variables for filtering:

```json
{
  "templating": {
    "list": [
      {
        "name": "namespace",
        "type": "query",
        "query": "label_values(dapr_http_server_request_count, namespace)",
        "refresh": 2,
        "sort": 1
      },
      {
        "name": "app_id",
        "type": "query",
        "query": "label_values(dapr_http_server_request_count{namespace=\"$namespace\"}, app_id)",
        "refresh": 2,
        "multi": true,
        "includeAll": true
      }
    ]
  }
}
```

## Provisioning the Dashboard as Code

Store your dashboard in a ConfigMap for automatic provisioning:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dapr-custom-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  dapr-custom.json: |
    {
      "title": "Dapr Operations",
      "uid": "dapr-ops-v1",
      "panels": [ ... ],
      "templating": { ... },
      "refresh": "30s"
    }
```

```bash
kubectl apply -f dapr-custom-dashboard-configmap.yaml
```

Grafana will pick up the ConfigMap automatically if the sidecar is enabled.

## Summary

Custom Dapr dashboards should aggregate signals from service invocation, pub/sub, state stores, and actors into a single operational view. Organize panels in rows by concern and use dashboard variables to filter by namespace and app ID. Provisioning dashboards as ConfigMaps ensures consistency across environments and makes your observability configuration version-controlled.
