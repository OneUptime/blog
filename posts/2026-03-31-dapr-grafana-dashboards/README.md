# How to Create Grafana Dashboards for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Grafana, Dashboard, Metric, Observability

Description: Build Grafana dashboards to visualize Dapr service invocation, pub/sub, and actor metrics for real-time monitoring of your microservices.

---

Grafana dashboards give you a visual overview of how your Dapr services are performing. This guide walks through creating panels for the most important Dapr metrics including request rates, latency, pub/sub throughput, and actor activity.

## Prerequisites

- Prometheus scraping Dapr metrics (see the Prometheus configuration guide)
- Grafana connected to your Prometheus data source
- Dapr-enabled services generating traffic

## Importing the Official Dapr Dashboard

The Dapr project publishes pre-built Grafana dashboards. Import them from the Dapr GitHub repository:

```bash
# Download the official Dapr system services dashboard JSON
curl -o dapr-system-services.json \
  https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-system-services-dashboard.json

# Other available dashboards:
# grafana-sidecar-dashboard.json   - Dapr sidecar metrics
# grafana-actor-dashboard.json     - Dapr actor metrics
```

In Grafana, go to **Dashboards > Import**, upload the JSON file, and select your Prometheus data source.

## Creating a Custom Service Invocation Panel

Add a panel to track request rates per service:

```text
# PromQL for HTTP request rate by app
sum by (app_id) (
  rate(dapr_http_server_request_count[5m])
)
```

Panel settings:
- Visualization: Time series
- Title: "HTTP Request Rate by App"
- Unit: requests/sec

## Latency Percentile Panel

```text
# P50, P95, P99 latency for service invocation
histogram_quantile(0.50, sum by (le, app_id) (rate(dapr_http_server_latency_bucket[5m])))
histogram_quantile(0.95, sum by (le, app_id) (rate(dapr_http_server_latency_bucket[5m])))
histogram_quantile(0.99, sum by (le, app_id) (rate(dapr_http_server_latency_bucket[5m])))
```

Use a multi-query panel with different display names for each percentile.

## Pub/Sub Throughput Panel

```text
# Messages published per second
rate(dapr_component_pubsub_egress_count[5m])

# Messages received per second
rate(dapr_component_pubsub_ingress_count[5m])
```

## Error Rate Panel

Track failed requests to catch regressions:

```text
# HTTP error rate (non-2xx)
sum by (app_id) (
  rate(dapr_http_server_request_count{status!~"2.."}[5m])
)
/
sum by (app_id) (
  rate(dapr_http_server_request_count[5m])
)
```

## Actor Metrics Panel

```text
# Pending actor calls by actor type
dapr_runtime_actor_pending_actor_calls

# Actor timers count
dapr_runtime_actor_timers

# Actor reminders count
dapr_runtime_actor_reminders
```

## Dashboard Variables

Add template variables for filtering by namespace and app:

```json
{
  "name": "namespace",
  "type": "query",
  "query": "label_values(dapr_http_server_request_count, namespace)",
  "refresh": 2
}
```

```json
{
  "name": "app_id",
  "type": "query",
  "query": "label_values(dapr_http_server_request_count{namespace=\"$namespace\"}, app_id)",
  "refresh": 2
}
```

## Exporting the Dashboard as Code

Save your dashboard as a ConfigMap so it is provisioned automatically:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dapr-grafana-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  dapr-dashboard.json: |
    { ... dashboard JSON here ... }
```

## Summary

Grafana dashboards for Dapr should cover service invocation rates, latency percentiles, error rates, pub/sub throughput, and actor metrics such as pending calls, timers, and reminders. Start with the official Dapr dashboards from GitHub, then customize with template variables to filter by namespace and app ID. Provisioning dashboards as ConfigMaps ensures they survive Grafana restarts and are version-controlled alongside your infrastructure code.
