# How to Configure Prometheus for Dapr Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Prometheus, Metric, Kubernetes, Observability

Description: Step-by-step guide to configuring Prometheus to scrape Dapr sidecar and control plane metrics using service discovery and relabeling rules.

---

Prometheus is the most common metrics backend for Dapr deployments. This guide shows how to configure scraping rules, use Kubernetes service discovery, and apply relabeling to organize Dapr metrics effectively.

## Prerequisites

- Prometheus deployed in your cluster (via Helm or the Prometheus Operator)
- Dapr installed with metrics enabled
- `kubectl` access to your cluster

## Installing Prometheus with Dapr Support

Use the kube-prometheus-stack Helm chart which includes the Prometheus Operator:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

## Enabling Dapr Metrics Annotations

Dapr sidecars expose metrics when annotated correctly. Ensure your pods have these annotations:

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "checkout-service"
    dapr.io/metrics-port: "9090"
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
    prometheus.io/path: "/metrics"
```

## Kubernetes Pod Service Discovery Config

Add this scrape config to your Prometheus configuration to auto-discover Dapr-enabled pods:

```yaml
scrape_configs:
  - job_name: 'dapr-sidecars'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Keep only Dapr-enabled pods
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      # Use the pod IP with the metrics port
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: "$1:9090"
      # Add the Dapr app ID as a label
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_app_id]
        target_label: dapr_app_id
      # Add namespace label
      - source_labels: [__meta_kubernetes_namespace]
        target_label: kubernetes_namespace
      # Add pod name label
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: kubernetes_pod_name
```

## Scraping Dapr Control Plane Components

Add a separate job for control plane metrics:

```yaml
  - job_name: 'dapr-system'
    static_configs:
      - targets:
        - dapr-operator.dapr-system:9090
        - dapr-sentry.dapr-system:9090
        - dapr-placement-server.dapr-system:9090
        - dapr-sidecar-injector.dapr-system:9090
    metrics_path: /metrics
    relabel_configs:
      - source_labels: [__address__]
        target_label: component
        regex: "([^.]+)\\..*"
        replacement: "$1"
```

## Using PodMonitor with Prometheus Operator

If you use the Prometheus Operator, create a PodMonitor instead:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: dapr-metrics
  namespace: monitoring
spec:
  namespaceSelector:
    any: true
  selector:
    matchExpressions:
    - key: app
      operator: Exists
  podMetricsEndpoints:
  - port: dapr-metrics
    path: /metrics
    interval: 30s
```

## Verifying Scrape Targets

Check that Prometheus has discovered your targets:

```bash
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 -n monitoring
```

Navigate to `http://localhost:9090/targets` and look for the `dapr-sidecars` job. All active pods should show as `UP`.

## Useful Prometheus Queries

```text
# Request rate per Dapr app
rate(dapr_http_server_request_count[5m])

# P99 latency per app
histogram_quantile(0.99, rate(dapr_http_server_latency_bucket[5m]))

# Error rate
rate(dapr_http_server_request_count{status!~"2.."}[5m])
```

## Summary

Configuring Prometheus for Dapr requires enabling metrics annotations on pods and setting up scrape configurations with Kubernetes service discovery. Using relabeling rules lets you add meaningful labels like `dapr_app_id` for per-service filtering in dashboards. The Prometheus Operator's PodMonitor resource provides a Kubernetes-native alternative to static scrape configs.
