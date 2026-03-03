# How to Set Up Prometheus on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Prometheus, Monitoring, Kubernetes, Metrics, Observability

Description: A complete guide to deploying and configuring Prometheus on Talos Linux for monitoring your Kubernetes cluster and applications.

---

Prometheus is the standard monitoring tool in the Kubernetes ecosystem. It collects time-series metrics from your applications and infrastructure, stores them efficiently, and provides a powerful query language (PromQL) for analyzing them. On Talos Linux, Prometheus is essential because the immutable nature of the OS means you cannot use traditional monitoring agents installed on nodes. Instead, everything runs inside the cluster as Kubernetes workloads, which is exactly how Prometheus is designed to work.

This guide covers deploying Prometheus on a Talos Linux cluster, configuring it to scrape metrics from your services, and setting up the alerting pipeline.

## Why Prometheus on Talos Linux?

Prometheus was built for cloud-native environments and fits naturally with both Kubernetes and Talos Linux:

- It discovers monitoring targets automatically through Kubernetes service discovery
- It runs as a regular Kubernetes deployment, requiring no OS-level installation
- It integrates with every major Kubernetes component out of the box
- Its pull-based model means applications just expose a metrics endpoint
- PromQL provides flexible querying for dashboards and alerts

On Talos Linux specifically, Prometheus can scrape node-level metrics through node-exporter DaemonSets and kubelet metrics through the Kubernetes API, giving you full visibility even without shell access to the nodes.

## Prerequisites

You will need:

- A Talos Linux cluster with at least one worker node
- `kubectl` configured for the cluster
- Helm 3 installed
- A StorageClass for persistent volume claims (recommended for production)

```bash
# Verify cluster and storage
kubectl get nodes
kubectl get storageclass
```

## Installing Prometheus with Helm

The community Prometheus Helm chart is the recommended installation method:

```bash
# Add the Prometheus community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create a namespace for monitoring
kubectl create namespace monitoring
```

Create a values file for your configuration:

```yaml
# prometheus-values.yaml
server:
  # Persistent storage for metrics
  persistentVolume:
    enabled: true
    size: 50Gi

  # Retention settings
  retention: "30d"

  # Resource allocation
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2
      memory: 4Gi

  # Service configuration
  service:
    type: NodePort
    nodePort: 30090

  # Global scrape interval
  global:
    scrape_interval: 15s
    evaluation_interval: 15s

# Enable node-exporter for node metrics
nodeExporter:
  enabled: true

# Enable kube-state-metrics for Kubernetes object metrics
kubeStateMetrics:
  enabled: true

# Alertmanager configuration
alertmanager:
  enabled: true
  persistentVolume:
    enabled: true
    size: 5Gi

# Push gateway for batch jobs
pushgateway:
  enabled: false
```

Install Prometheus:

```bash
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  -f prometheus-values.yaml
```

## Verifying the Installation

Check that all components are running:

```bash
# Check pods
kubectl get pods -n monitoring

# You should see:
# prometheus-server - the main Prometheus server
# prometheus-node-exporter - runs on each node
# prometheus-kube-state-metrics - Kubernetes object metrics
# prometheus-alertmanager - alert routing

# Access the Prometheus UI
kubectl port-forward -n monitoring svc/prometheus-server 9090:80
```

Open `http://localhost:9090` to access the Prometheus web interface.

## Configuring Scrape Targets

Prometheus discovers targets through Kubernetes service discovery. The default configuration scrapes:

- Kubernetes API server
- Kubelet metrics
- Node-exporter metrics
- kube-state-metrics
- CoreDNS
- cAdvisor (container metrics)

To add your own applications, use annotations:

```yaml
# my-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: app
        image: my-app:latest
        ports:
        - containerPort: 8080
```

The annotations tell Prometheus to scrape port 8080 at the `/metrics` path.

## Custom Scrape Configuration

For more control over scraping, add custom scrape configs:

```yaml
# In prometheus-values.yaml, add:
extraScrapeConfigs: |
  - job_name: 'custom-app'
    kubernetes_sd_configs:
    - role: endpoints
      namespaces:
        names:
        - production
    relabel_configs:
    - source_labels: [__meta_kubernetes_service_label_app]
      regex: my-custom-app
      action: keep
    - source_labels: [__meta_kubernetes_endpoint_port_name]
      regex: metrics
      action: keep
    metric_relabel_configs:
    - source_labels: [__name__]
      regex: 'go_.*'
      action: drop
```

This custom configuration:
1. Discovers endpoints in the production namespace
2. Filters for services with the label `app: my-custom-app`
3. Only scrapes ports named "metrics"
4. Drops Go runtime metrics to save storage

## Writing PromQL Queries

PromQL is powerful. Here are some essential queries for monitoring a Talos Linux cluster:

```promql
# CPU usage by node
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage percentage by node
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# Pod memory usage
sum(container_memory_working_set_bytes{container!=""}) by (pod, namespace)

# HTTP request rate by service
sum(rate(http_requests_total[5m])) by (service)

# 99th percentile latency
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))

# Disk usage on persistent volumes
kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes * 100

# Pod restart count
sum(kube_pod_container_status_restarts_total) by (pod, namespace)
```

## Setting Up Recording Rules

Recording rules pre-compute frequently used expressions:

```yaml
# recording-rules.yaml
serverFiles:
  recording_rules.yml:
    groups:
    - name: node-metrics
      interval: 30s
      rules:
      - record: node:cpu_usage:percent
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

      - record: node:memory_usage:percent
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

    - name: service-metrics
      interval: 30s
      rules:
      - record: service:request_rate:5m
        expr: sum(rate(http_requests_total[5m])) by (service)

      - record: service:error_rate:5m
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service)
```

## Configuring Alerting Rules

Set up alerts for common issues:

```yaml
# alerting-rules.yaml
serverFiles:
  alerting_rules.yml:
    groups:
    - name: cluster-alerts
      rules:
      - alert: NodeDown
        expr: up{job="kubernetes-nodes"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Node {{ $labels.instance }} is down"

      - alert: HighCPU
        expr: node:cpu_usage:percent > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU on {{ $labels.instance }}: {{ $value }}%"

      - alert: HighMemory
        expr: node:memory_usage:percent > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory on {{ $labels.instance }}: {{ $value }}%"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.pod }} is crash looping"

      - alert: DiskAlmostFull
        expr: kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "PV {{ $labels.persistentvolumeclaim }} is {{ $value | humanizePercentage }} full"
```

## Monitoring Talos-Specific Metrics

Talos exposes some of its own metrics. You can scrape them by adding a scrape config:

```yaml
extraScrapeConfigs: |
  - job_name: 'talos-nodes'
    static_configs:
    - targets:
      - '10.0.0.1:9100'  # Node 1
      - '10.0.0.2:9100'  # Node 2
      - '10.0.0.3:9100'  # Node 3
```

Also check Talos system health through `talosctl`:

```bash
# Check system services health
talosctl health -n <NODE_IP>

# Check resource usage
talosctl stats -n <NODE_IP>
```

## Scaling Prometheus

For large clusters, consider these scaling strategies:

1. Increase storage and memory
2. Use Thanos or Cortex for long-term storage and horizontal scaling
3. Use recording rules to pre-aggregate frequently queried metrics
4. Set appropriate retention periods
5. Use metric relabeling to drop unnecessary metrics

## Conclusion

Prometheus on Talos Linux provides comprehensive monitoring for your cluster and applications. The pull-based metrics collection, automatic service discovery, and powerful PromQL query language give you deep visibility into your infrastructure. Combined with alerting rules and Alertmanager, you get notified about problems before they affect users. Since everything runs as Kubernetes workloads, the monitoring stack is fully compatible with Talos Linux's immutable design and can be managed through the same GitOps workflows you use for your applications.
