# How to Create Custom Grafana Dashboards for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Grafana, Dashboard, Metric, Visualization

Description: Learn how to create custom Grafana dashboards for Dapr microservices with panels for request rates, latency distributions, error rates, and resiliency metrics.

---

## Overview

Custom Grafana dashboards tailored to your Dapr services provide better operational visibility than generic templates. A well-designed Dapr dashboard surfaces the most important health signals - request rates, latency percentiles, error rates, and resiliency activations - in a layout that maps to your team's incident response workflow.

## Prerequisites

Ensure you have Prometheus scraping Dapr sidecar metrics:

```yaml
scrape_configs:
  - job_name: dapr-sidecars
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_ip]
        replacement: "${1}:9090"
        target_label: __address__
    metrics_path: /
```

## Dashboard Structure

Organize your Dapr dashboard into logical sections:

1. Overview row - fleet-wide health
2. Service-level row - per-service metrics
3. Resiliency row - circuit breaker and retry data
4. Component row - state, pub/sub, binding health

## Key Dashboard Panels and Queries

**Request Rate Panel:**

```bash
# Total requests across all Dapr services
sum(rate(dapr_http_server_request_count[5m])) by (app_id)
```

**Error Rate Panel:**

```bash
# Percentage of 5xx responses
sum(rate(dapr_http_server_request_count{status=~"5.."}[5m])) by (app_id)
  /
sum(rate(dapr_http_server_request_count[5m])) by (app_id)
* 100
```

**P50/P95/P99 Latency Panel:**

```bash
# Latency percentiles
histogram_quantile(0.50, sum(rate(dapr_http_server_latency_bucket[5m])) by (le, app_id))
histogram_quantile(0.95, sum(rate(dapr_http_server_latency_bucket[5m])) by (le, app_id))
histogram_quantile(0.99, sum(rate(dapr_http_server_latency_bucket[5m])) by (le, app_id))
```

**Resiliency Activations Panel:**

```bash
# Circuit breaker and retry activations
rate(dapr_resiliency_activations_total[5m])
```

## Deploying a Dashboard via ConfigMap

Store the dashboard JSON in a Kubernetes ConfigMap for GitOps management:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dapr-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  dapr-services.json: |
    {
      "title": "Dapr Services",
      "uid": "dapr-services-v1",
      "refresh": "30s",
      "time": { "from": "now-1h", "to": "now" },
      "templating": {
        "list": [
          {
            "name": "app_id",
            "type": "query",
            "datasource": "Prometheus",
            "query": "label_values(dapr_http_server_request_count, app_id)",
            "multi": true,
            "includeAll": true
          }
        ]
      },
      "panels": []
    }
```

## Adding a Heatmap for Latency Distribution

A latency heatmap shows distribution shifts over time:

```json
{
  "type": "heatmap",
  "title": "Request Latency Heatmap",
  "datasource": "Prometheus",
  "targets": [
    {
      "expr": "sum(rate(dapr_http_server_latency_bucket{app_id=~\"$app_id\"}[5m])) by (le)",
      "format": "heatmap",
      "legendFormat": "{{le}}"
    }
  ],
  "options": {
    "calculate": false,
    "yAxis": { "unit": "ms" }
  }
}
```

## Adding Service Health Stat Panels

Display current health as stat panels at the top of the dashboard:

```json
{
  "type": "stat",
  "title": "Services Healthy",
  "targets": [
    {
      "expr": "count(up{job=\"dapr-sidecars\"} == 1)",
      "legendFormat": "Healthy"
    }
  ],
  "options": {
    "colorMode": "background",
    "thresholds": {
      "mode": "absolute",
      "steps": [
        { "color": "red", "value": 0 },
        { "color": "green", "value": 1 }
      ]
    }
  }
}
```

## Summary

Custom Grafana dashboards for Dapr should cover request rate, error rate, latency percentiles, and resiliency activations at both fleet and service levels. Store dashboards as ConfigMaps for GitOps-managed deployment, use template variables for service-level filtering, and include heatmaps for latency distribution analysis. A well-structured Dapr dashboard significantly reduces time to detect and resolve service health issues.
