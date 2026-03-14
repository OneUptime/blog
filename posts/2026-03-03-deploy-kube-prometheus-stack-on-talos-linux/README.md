# How to Deploy kube-prometheus-stack on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kube-prometheus-stack, Prometheus, Grafana, Monitoring, Kubernetes

Description: Deploy the complete kube-prometheus-stack on Talos Linux for an all-in-one monitoring solution with Prometheus, Grafana, and Alertmanager.

---

The kube-prometheus-stack Helm chart is the fastest way to get a production-ready monitoring stack running on Kubernetes. It bundles Prometheus, Grafana, Alertmanager, node-exporter, kube-state-metrics, and a set of pre-configured dashboards and alerting rules into a single deployment. Instead of installing and configuring each component separately, you get everything working together out of the box. On Talos Linux, this is the recommended approach for monitoring because it covers all the bases with minimal configuration.

This guide covers deploying the kube-prometheus-stack on Talos Linux, customizing it for your environment, and handling the Talos-specific configuration needed for full metrics collection.

## What is Included

The kube-prometheus-stack chart deploys:

- **Prometheus Operator** - manages Prometheus instances as Kubernetes resources
- **Prometheus** - metrics collection and storage
- **Alertmanager** - alert routing and notifications
- **Grafana** - dashboards and visualization
- **node-exporter** - host-level metrics (CPU, memory, disk, network)
- **kube-state-metrics** - Kubernetes object metrics (deployments, pods, services)
- **Pre-built dashboards** - over 20 Grafana dashboards ready to use
- **Pre-built alerting rules** - alerts for common Kubernetes issues

## Prerequisites

You need:

- A Talos Linux cluster (Kubernetes 1.25+)
- `kubectl` configured for the cluster
- Helm 3 installed
- A StorageClass available for persistent volumes

```bash
# Verify prerequisites
kubectl get nodes
kubectl get storageclass
helm version
```

## Installation

```bash
# Add the Prometheus community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create the monitoring namespace
kubectl create namespace monitoring
```

Create a values file tailored for Talos Linux:

```yaml
# kube-prometheus-stack-values.yaml

# Prometheus configuration
prometheus:
  prometheusSpec:
    # Storage for metrics
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi

    # Retention settings
    retention: 30d
    retentionSize: "45GB"

    # Resource limits
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: 2
        memory: 4Gi

    # Scrape all ServiceMonitors in all namespaces
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false

# Grafana configuration
grafana:
  enabled: true
  persistence:
    enabled: true
    size: 10Gi
  service:
    type: NodePort
    nodePort: 31300
  adminPassword: "change-me-please"

  # Additional data sources
  additionalDataSources:
  - name: Alertmanager
    type: alertmanager
    url: http://kube-prometheus-stack-alertmanager.monitoring:9093
    access: proxy
    jsonData:
      implementation: prometheus

# Alertmanager configuration
alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 5Gi

# Node exporter - runs on all nodes including Talos control plane
nodeExporter:
  enabled: true

# kube-state-metrics
kubeStateMetrics:
  enabled: true

# Talos-specific: kubelet configuration
kubelet:
  enabled: true
  serviceMonitor:
    # Talos exposes kubelet metrics on a different path
    cAdvisorMetricRelabelings:
    - sourceLabels: [__name__]
      regex: 'container_cpu_cfs_throttled_seconds_total'
      action: drop

# Talos-specific: etcd monitoring
kubeEtcd:
  enabled: true
  service:
    enabled: true
    port: 2381
    targetPort: 2381
```

Install the stack:

```bash
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  -f kube-prometheus-stack-values.yaml
```

## Verifying the Installation

Check all components:

```bash
# Check all pods
kubectl get pods -n monitoring

# You should see:
# - prometheus-kube-prometheus-stack-prometheus-0 (Prometheus)
# - kube-prometheus-stack-grafana-xxx (Grafana)
# - alertmanager-kube-prometheus-stack-alertmanager-0 (Alertmanager)
# - kube-prometheus-stack-kube-state-metrics-xxx (kube-state-metrics)
# - kube-prometheus-stack-prometheus-node-exporter-xxx (one per node)
# - prometheus-kube-prometheus-stack-operator-xxx (Prometheus Operator)

# Check services
kubectl get svc -n monitoring

# Check ServiceMonitors
kubectl get servicemonitor -n monitoring

# Check PrometheusRules
kubectl get prometheusrule -n monitoring
```

## Talos-Specific Configuration

Talos Linux has some differences from standard Linux distributions that affect monitoring. Here are the key adjustments:

### Etcd Metrics

Talos exposes etcd metrics on port 2381 instead of the standard 2379:

```yaml
kubeEtcd:
  service:
    enabled: true
    port: 2381
    targetPort: 2381
  serviceMonitor:
    scheme: http
```

### Controller Manager and Scheduler Metrics

Talos exposes these on all interfaces by default:

```yaml
kubeControllerManager:
  enabled: true
  service:
    port: 10257
    targetPort: 10257
  serviceMonitor:
    https: true
    insecureSkipVerify: true

kubeScheduler:
  enabled: true
  service:
    port: 10259
    targetPort: 10259
  serviceMonitor:
    https: true
    insecureSkipVerify: true
```

### Proxy Metrics

```yaml
kubeProxy:
  enabled: true
  service:
    port: 10249
    targetPort: 10249
```

## Accessing the Dashboards

Access Grafana to see the pre-built dashboards:

```bash
# Port-forward or use NodePort
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Get the admin password
kubectl get secret -n monitoring kube-prometheus-stack-grafana \
  -o jsonpath="{.data.admin-password}" | base64 -d
```

The pre-built dashboards include:

- Kubernetes / Compute Resources / Cluster
- Kubernetes / Compute Resources / Namespace (Pods)
- Kubernetes / Compute Resources / Node (Pods)
- Kubernetes / Networking / Cluster
- Node Exporter / Nodes
- CoreDNS
- etcd
- Prometheus Stats

## Adding Custom ServiceMonitors

The Prometheus Operator uses ServiceMonitor resources to configure scraping. Add monitoring for your own applications:

```yaml
# my-app-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  namespaceSelector:
    matchNames:
    - default
  selector:
    matchLabels:
      app: my-app
  endpoints:
  - port: metrics
    interval: 15s
    path: /metrics
```

For pods without a service, use PodMonitor:

```yaml
# my-app-podmonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: my-app-pods
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
    - default
  selector:
    matchLabels:
      app: my-app
  podMetricsEndpoints:
  - port: metrics
    interval: 15s
```

## Custom Alerting Rules

Add your own alerting rules using PrometheusRule:

```yaml
# custom-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: custom-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
  - name: application-alerts
    rules:
    - alert: HighRequestLatency
      expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High latency on {{ $labels.service }}"
        description: "P99 latency is {{ $value }}s"

    - alert: HighErrorRate
      expr: sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service) > 0.05
      for: 5m
      labels:
        severity: critical
```

## Configuring Alert Notifications

Configure Alertmanager to send notifications:

```yaml
# In kube-prometheus-stack-values.yaml
alertmanager:
  config:
    global:
      resolve_timeout: 5m
    route:
      group_by: ['alertname', 'namespace']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 12h
      receiver: 'slack'
      routes:
      - match:
          severity: critical
        receiver: 'pagerduty'
    receivers:
    - name: 'slack'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        send_resolved: true
    - name: 'pagerduty'
      pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
```

## Upgrading the Stack

When upgrading, always check the release notes for breaking changes:

```bash
# Check current version
helm list -n monitoring

# Upgrade with your values
helm upgrade kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  -f kube-prometheus-stack-values.yaml
```

## Conclusion

The kube-prometheus-stack on Talos Linux gives you a complete, production-ready monitoring solution in a single Helm installation. With Prometheus for metrics collection, Grafana for visualization, Alertmanager for notifications, and pre-built dashboards and alerting rules, you get immediate visibility into your cluster's health. The Prometheus Operator's custom resources (ServiceMonitor, PodMonitor, PrometheusRule) make it easy to extend the monitoring to your own applications. Combined with Talos Linux's secure, immutable infrastructure, you have a solid foundation for operating Kubernetes workloads with confidence.
