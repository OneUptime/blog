# How to Set Up Dapr Metrics with Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Metric, Prometheus, Monitoring, Observability

Description: Learn how to enable and scrape Dapr sidecar metrics with Prometheus, and build Grafana dashboards to monitor service invocation rates, latencies, and component health.

---

## Introduction

Dapr exposes rich metrics from each sidecar in Prometheus format on port 9090 by default. These metrics cover service invocations, pub/sub operations, actor calls, state store operations, and more. By scraping Dapr sidecars with Prometheus, you gain deep visibility into the health and performance of your microservices without adding any instrumentation code.

## What Dapr Exposes

Dapr sidecars expose metrics at `http://localhost:9090/metrics` (on the sidecar, not the app). Key metric families include:

| Metric Family | Description |
|---|---|
| `dapr_http_server_request_count` | Count of inbound HTTP requests |
| `dapr_http_client_completed_count` | Count of outbound service invocations |
| `dapr_http_server_latency` | Latency histogram for inbound requests |
| `dapr_http_client_roundtrip_latency` | Latency histogram for outbound invocations |
| `dapr_component_pubsub_*` | Pub/sub publish and subscription metrics |
| `dapr_runtime_actor_*` | Actor activation, deactivation, method call metrics |
| `dapr_runtime_*` | Dapr runtime health and internal metrics |

## Prerequisites

- Dapr installed on Kubernetes
- Prometheus installed (kube-prometheus-stack recommended)
- Dapr metrics enabled (default on)

## Step 1: Enable Metrics on Dapr Sidecars

Metrics are enabled by default. Verify with the annotation:

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "order-service"
    dapr.io/app-port: "3000"
    dapr.io/enable-metrics: "true"
    dapr.io/metrics-port: "9090"
```

Disable metrics (not recommended in production):

```yaml
dapr.io/enable-metrics: "false"
```

## Step 2: Install Prometheus

### Using kube-prometheus-stack (Recommended)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.scrapeInterval=15s
```

## Step 3: Configure Prometheus to Scrape Dapr

Dapr exposes metrics on port 9090 of the sidecar container. Use a `PodMonitor` (when using kube-prometheus-stack) or a `ServiceMonitor`:

### PodMonitor (Scrapes All Dapr Sidecars)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: dapr-metrics
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  namespaceSelector:
    any: true
  selector:
    matchLabels:
      app: order-service
  podMetricsEndpoints:
  - port: dapr-metrics
    path: /metrics
    interval: 15s
```

Alternatively, add a Prometheus scrape annotation to your pods and use a scrape config:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/path: "/metrics"
    prometheus.io/port: "9090"
```

Add the scrape config to Prometheus:

```yaml
scrape_configs:
- job_name: 'dapr-sidecar-metrics'
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
    action: replace
    target_label: __metrics_path__
    regex: (.+)
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    regex: ([^:]+)(?::\d+)?;(\d+)
    replacement: $1:$2
    target_label: __address__
  - source_labels: [__meta_kubernetes_pod_label_app]
    action: replace
    target_label: app
  - source_labels: [__meta_kubernetes_namespace]
    action: replace
    target_label: namespace
```

## Step 4: Install Dapr Grafana Dashboards

Dapr provides pre-built Grafana dashboards. Import them from the Dapr GitHub repository:

```bash
# Download dashboard JSONs
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-system-services-dashboard.json
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-sidecar-dashboard.json
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-actor-dashboard.json
```

## Step 5: Key Metrics to Monitor

### Service Invocation Rate

```promql
rate(dapr_http_client_completed_count[5m])
```

### Service Invocation Latency (P99)

```promql
histogram_quantile(0.99,
  sum(rate(dapr_http_client_roundtrip_latency_bucket[5m])) by (app_id, method, le)
)
```

### Error Rate

```promql
rate(dapr_http_server_request_count{status_code=~"5.."}[5m])
  /
rate(dapr_http_server_request_count[5m])
```

### Pub/Sub Message Publish Rate

```promql
rate(dapr_component_pubsub_egress_count[5m])
```

### Actor Pending Calls

```promql
dapr_runtime_actor_pending_actor_calls
```

## Step 6: Access Prometheus and Grafana

```bash
# Prometheus UI
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
# Open http://localhost:9090

# Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
# Open http://localhost:3000
# Default creds: admin/prom-operator
```

## Summary

Dapr exposes detailed Prometheus metrics from each sidecar at port 9090. Enable scraping with `prometheus.io/scrape: "true"` annotations or a PodMonitor resource. Import the official Dapr Grafana dashboards for instant visibility into service invocation rates, latencies, error rates, and actor metrics. Monitor these metrics in production to detect anomalies, capacity issues, and service degradation before they impact users.
