# How to Monitor Talos Linux with Prometheus

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Prometheus, Monitoring, Kubernetes, Alerting

Description: Complete guide to setting up Prometheus monitoring for a Talos Linux Kubernetes cluster with alerts and best practices.

---

Prometheus is the standard monitoring solution for Kubernetes environments, and Talos Linux is no exception. Its pull-based metric collection model works naturally with Kubernetes service discovery, and the ecosystem of exporters and dashboards gives you comprehensive visibility into every layer of your cluster. Setting up Prometheus on Talos Linux follows the same general patterns as any Kubernetes cluster, with a few Talos-specific considerations around filesystem paths and access.

This guide covers deploying Prometheus, configuring it to monitor all components of a Talos Linux cluster, setting up alerting rules, and keeping the system running smoothly in production.

## Deploying the Prometheus Stack

The fastest way to get a full monitoring setup is through the kube-prometheus-stack Helm chart. It bundles Prometheus, Alertmanager, Grafana, node-exporter, and kube-state-metrics into a single deployment.

```bash
# Add the Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create the monitoring namespace
kubectl create namespace monitoring

# Install the full Prometheus stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.retention=15d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
  --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage=10Gi
```

For a more detailed configuration, use a values file:

```yaml
# prometheus-values.yaml
# kube-prometheus-stack values for Talos Linux
prometheus:
  prometheusSpec:
    retention: 30d
    retentionSize: 45GB
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: local-path
          resources:
            requests:
              storage: 50Gi
    # Scrape all ServiceMonitors across namespaces
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false
    ruleSelectorNilUsesHelmValues: false

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: local-path
          resources:
            requests:
              storage: 10Gi

grafana:
  adminPassword: your-secure-password
  service:
    type: LoadBalancer

# Node exporter needs tolerations for Talos control plane nodes
nodeExporter:
  tolerations:
    - operator: Exists
      effect: NoSchedule

# kube-state-metrics configuration
kubeStateMetrics:
  enabled: true
```

Install with the custom values:

```bash
# Deploy with custom configuration
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  -f prometheus-values.yaml
```

## Monitoring Talos System Services

Talos Linux exposes metrics for its internal services. To scrape these, you need to configure additional scrape targets that point to the Talos API endpoints on each node.

Create a ServiceMonitor or use additional scrape configs:

```yaml
# talos-scrape-config.yaml
# Additional scrape configuration for Talos machine metrics
apiVersion: v1
kind: Secret
metadata:
  name: additional-scrape-configs
  namespace: monitoring
stringData:
  prometheus-additional.yaml: |
    - job_name: 'talos-machine-metrics'
      scheme: https
      tls_config:
        insecure_skip_verify: true
      static_configs:
        - targets:
            - '192.168.1.10:9100'
            - '192.168.1.11:9100'
            - '192.168.1.12:9100'
            - '192.168.1.20:9100'
            - '192.168.1.21:9100'
          labels:
            source: 'talos-machine'
```

Reference this in your Prometheus configuration:

```yaml
# Add to your Helm values
prometheus:
  prometheusSpec:
    additionalScrapeConfigsSecret:
      enabled: true
      name: additional-scrape-configs
      key: prometheus-additional.yaml
```

## Monitoring etcd

etcd health is critical for a functioning Kubernetes cluster. On Talos Linux, etcd metrics are exposed on port 2381 of each control plane node.

```yaml
# etcd-monitoring.yaml
# ServiceMonitor for etcd on Talos Linux
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: etcd-monitor
  namespace: monitoring
  labels:
    release: prometheus
spec:
  endpoints:
    - interval: 30s
      port: "2381"
      scheme: http
  namespaceSelector:
    matchNames:
      - kube-system
  selector:
    matchLabels:
      component: etcd
```

Alternatively, add static scrape targets for etcd:

```yaml
# etcd scrape configuration
- job_name: 'etcd'
  scheme: http
  static_configs:
    - targets:
        - '192.168.1.10:2381'
        - '192.168.1.11:2381'
        - '192.168.1.12:2381'
```

## Essential Alert Rules for Talos Linux

Set up alerting rules that catch common problems before they affect your workloads:

```yaml
# talos-alert-rules.yaml
# Alert rules specific to Talos Linux clusters
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: talos-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
    - name: talos-node-alerts
      rules:
        - alert: NodeHighCPU
          expr: |
            100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High CPU usage on {{ $labels.instance }}"
            description: "CPU usage is above 85% for more than 10 minutes"

        - alert: NodeHighMemory
          expr: |
            (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High memory usage on {{ $labels.instance }}"

        - alert: NodeDiskPressure
          expr: |
            (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 > 85
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Disk usage above 85% on {{ $labels.instance }}"

    - name: etcd-alerts
      rules:
        - alert: EtcdNoLeader
          expr: etcd_server_has_leader == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "etcd member has no leader on {{ $labels.instance }}"

        - alert: EtcdHighFsyncDuration
          expr: |
            histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])) > 0.5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "etcd WAL fsync is slow on {{ $labels.instance }}"

        - alert: EtcdHighCommitDuration
          expr: |
            histogram_quantile(0.99, rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])) > 0.25
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "etcd backend commit is slow on {{ $labels.instance }}"

    - name: kubernetes-alerts
      rules:
        - alert: KubeletTooManyPods
          expr: |
            kubelet_running_pods > 100
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Kubelet running too many pods on {{ $labels.instance }}"

        - alert: PodCrashLooping
          expr: |
            increase(kube_pod_container_status_restarts_total[1h]) > 5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"
```

Apply the alert rules:

```bash
# Deploy the alert rules
kubectl apply -f talos-alert-rules.yaml
```

## Configuring Alertmanager

Set up Alertmanager to send notifications when alerts fire:

```yaml
# alertmanager-config.yaml
# Alertmanager configuration for routing alerts
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-prometheus-kube-prometheus-alertmanager
  namespace: monitoring
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m
    route:
      group_by: ['alertname', 'namespace']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      receiver: 'default'
      routes:
        - match:
            severity: critical
          receiver: 'critical-alerts'
          repeat_interval: 1h
    receivers:
      - name: 'default'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
            channel: '#alerts'
            title: '{{ .GroupLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
      - name: 'critical-alerts'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
            channel: '#critical-alerts'
```

## Recording Rules for Performance

Recording rules pre-compute expensive queries so that dashboards load quickly:

```yaml
# recording-rules.yaml
# Pre-computed metrics for faster dashboard queries
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: talos-recording-rules
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
    - name: node-recording-rules
      interval: 30s
      rules:
        - record: node:cpu_utilization:ratio
          expr: |
            1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))

        - record: node:memory_utilization:ratio
          expr: |
            1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)

        - record: node:disk_utilization:ratio
          expr: |
            1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})
```

## Verifying the Setup

After deploying everything, verify that Prometheus is working correctly:

```bash
# Check all monitoring pods are running
kubectl get pods -n monitoring

# Access the Prometheus UI
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Check Prometheus targets
# Navigate to http://localhost:9090/targets
```

In the Prometheus UI, check the Targets page to confirm all endpoints are being scraped successfully. Green status means healthy, and you should see entries for node-exporter, kubelet, kube-state-metrics, and any custom targets you configured.

Prometheus monitoring on Talos Linux gives you deep visibility into every layer of your cluster. The combination of node metrics, kubelet metrics, etcd health, and Kubernetes object status through kube-state-metrics covers all the bases. With alerting rules tailored to Talos-specific concerns and recording rules for dashboard performance, you have a production-ready monitoring setup that will keep you informed about your cluster's health around the clock.
