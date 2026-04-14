# How to Send Dapr Metrics to Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Prometheus, Grafana, Metric, Monitoring

Description: Learn how to configure Dapr metrics collection with Prometheus and visualize service health, latency, and resiliency data in Grafana dashboards.

---

## Overview

Dapr exposes a Prometheus-compatible metrics endpoint from each sidecar. Scraping these endpoints with Prometheus and visualizing them in Grafana gives you real-time visibility into service invocation latency, error rates, component health, and resiliency policy activations across your microservice fleet.

## Enabling Dapr Metrics

Enable the metrics endpoint via Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-metrics-config
  namespace: default
spec:
  metric:
    enabled: true
```

Apply to pods:

```yaml
annotations:
  dapr.io/config: "dapr-metrics-config"
  dapr.io/metrics-port: "9090"
```

## Configuring Prometheus to Scrape Dapr

Use Kubernetes service discovery to scrape all Dapr-enabled pods:

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
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app
    metrics_path: /metrics
    scheme: http
```

Also scrape the Dapr control plane:

```yaml
  - job_name: dapr-system
    static_configs:
      - targets:
          - dapr-operator.dapr-system.svc:9091
          - dapr-sentry.dapr-system.svc:9091
          - dapr-placement-server.dapr-system.svc:9091
```

## Key Dapr Prometheus Metrics

| Metric | Description |
|--------|-------------|
| `dapr_http_server_request_count` | Total HTTP requests to the sidecar |
| `dapr_http_server_latency` | Request processing latency histogram |
| `dapr_http_client_sent_bytes` | Bytes sent by the sidecar HTTP client |
| `dapr_component_pubsub_ingress_count` | Pub/sub incoming message count |
| `dapr_resiliency_activations_total` | Resiliency policy activations |
| `dapr_runtime_actor_pending_actor_calls` | Pending actor method invocations |

## Useful PromQL Queries

```bash
# Request rate per service
rate(dapr_http_server_request_count[5m])

# P99 service invocation latency
histogram_quantile(0.99,
  sum(rate(dapr_http_server_latency_bucket[5m])) by (le, app_id)
)

# Error rate (5xx responses)
sum(rate(dapr_http_server_request_count{status_code=~"5.."}[5m])) by (app_id)

# Resiliency activation rate
rate(dapr_resiliency_activations_total[5m])
```

## Creating a Grafana Dashboard

Deploy a Grafana dashboard for Dapr using a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dapr-grafana-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  dapr-overview.json: |
    {
      "title": "Dapr Overview",
      "panels": [
        {
          "type": "graph",
          "title": "Request Rate by Service",
          "targets": [
            {
              "expr": "sum(rate(dapr_http_server_request_count[5m])) by (app_id)",
              "legendFormat": "{{app_id}}"
            }
          ]
        },
        {
          "type": "graph",
          "title": "P99 Latency",
          "targets": [
            {
              "expr": "histogram_quantile(0.99, sum(rate(dapr_http_server_latency_bucket[5m])) by (le, app_id))",
              "legendFormat": "{{app_id}}"
            }
          ]
        }
      ]
    }
```

## Setting Prometheus Alerting Rules

```yaml
groups:
  - name: dapr
    rules:
      - alert: DaprHighLatency
        expr: |
          histogram_quantile(0.99, sum(rate(dapr_http_server_latency_bucket[5m])) by (le, app_id)) > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Dapr P99 latency high for {{ $labels.app_id }}"
```

## Summary

Dapr's built-in Prometheus metrics endpoint makes it straightforward to build comprehensive observability with Prometheus and Grafana. Enable metrics via the Configuration CRD, configure Prometheus Kubernetes service discovery, and use PromQL to build dashboards tracking request rates, latency distributions, error rates, and resiliency activations across all your Dapr services.
