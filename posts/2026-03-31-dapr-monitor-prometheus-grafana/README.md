# How to Monitor Dapr on Kubernetes with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Prometheus, Grafana, Monitoring, Kubernetes, Observability

Description: Set up Prometheus and Grafana to monitor Dapr metrics on Kubernetes, including sidecar telemetry, service invocation, and pub/sub performance dashboards.

---

## Overview

Dapr exposes Prometheus metrics from each sidecar and from its system services. By scraping these endpoints and visualizing them in Grafana, you gain insight into request rates, latency, error rates, and component health.

## Prerequisites

- Dapr installed on Kubernetes
- Prometheus Operator or kube-prometheus-stack
- Grafana

## Step 1: Enable Metrics in Dapr

Dapr metrics are enabled by default on port 9090. Verify with:

```bash
kubectl get cm dapr-config -n dapr-system -o yaml | grep metric
```

To configure globally via a Dapr Configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
  namespace: default
spec:
  metrics:
    enabled: true
```

## Step 2: Annotate Pods for Prometheus Scraping

Add annotations to your application deployments so Prometheus discovers the sidecar metrics:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "orders"
        prometheus.io/scrape: "true"
        prometheus.io/path: "/metrics"
        prometheus.io/port: "9090"
```

## Step 3: Create a ServiceMonitor (Prometheus Operator)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dapr-system
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
      - dapr-system
  selector:
    matchLabels:
      app: dapr
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
```

## Step 4: Import Dapr Grafana Dashboards

Dapr provides official Grafana dashboard JSON files. Import them:

```bash
# Download dashboards
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-system-services-dashboard.json
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-sidecar-dashboard.json
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-actor-dashboard.json
```

In Grafana, go to Dashboards - Import and upload each file.

## Step 5: Key Metrics to Watch

| Metric | Description |
|--------|-------------|
| `dapr_http_server_request_count` | Total HTTP requests |
| `dapr_http_server_latency` | Request latency histogram |
| `dapr_grpc_io_server_completed_rpcs` | gRPC call counts |
| `dapr_component_pubsub_ingress_count` | Pub/sub ingress message counts |
| `dapr_runtime_actor_pending_actor_calls` | Pending actor calls |

Query example in Grafana:

```bash
rate(dapr_http_server_request_count{app_id="orders"}[5m])
```

## Step 6: Set Up Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-alerts
  namespace: monitoring
spec:
  groups:
    - name: dapr
      rules:
        - alert: DaprHighErrorRate
          expr: rate(dapr_http_server_request_count{status=~"5.."}[5m]) > 0.1
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "High Dapr error rate on {{ $labels.app_id }}"
```

## Summary

Monitoring Dapr with Prometheus and Grafana gives you full visibility into your microservice mesh. By enabling metrics on sidecars, creating ServiceMonitors, and importing official dashboards, you can track latency, throughput, and actor health in real time. Alerting on error rates ensures you catch issues before they impact users.
