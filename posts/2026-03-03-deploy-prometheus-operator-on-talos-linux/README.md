# How to Deploy Prometheus Operator on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Prometheus, Monitoring, Operator, Observability

Description: A complete guide to deploying and configuring the Prometheus Operator on Talos Linux for comprehensive Kubernetes cluster monitoring.

---

Monitoring is not optional for production Kubernetes clusters. The Prometheus Operator makes deploying and managing Prometheus on Kubernetes straightforward by introducing custom resources like ServiceMonitor and PodMonitor that let you configure monitoring targets declaratively. On Talos Linux, where the operating system is minimal and purpose-built for Kubernetes, the Prometheus Operator is the standard way to set up cluster-wide monitoring.

This guide covers deploying the Prometheus Operator on Talos Linux, configuring it for your workloads, and setting up alerting.

## What the Prometheus Operator Provides

The Prometheus Operator introduces several custom resources:

- **Prometheus** - Defines a Prometheus server deployment
- **Alertmanager** - Defines an Alertmanager deployment
- **ServiceMonitor** - Declares how to monitor services
- **PodMonitor** - Declares how to monitor pods directly
- **PrometheusRule** - Defines alerting and recording rules
- **ThanosRuler** - Integrates with Thanos for long-term storage

Instead of editing Prometheus configuration files manually, you create these Kubernetes resources and the Operator handles the rest.

## Installing with kube-prometheus-stack

The recommended way to deploy the Prometheus Operator is through the kube-prometheus-stack Helm chart, which includes Prometheus, Alertmanager, Grafana, and a set of default monitoring rules:

```bash
# Add the Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create the monitoring namespace
kubectl create namespace monitoring

# Install the stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=local-path \
  --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage=10Gi \
  --set grafana.adminPassword='YourGrafanaPassword' \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false
```

The `serviceMonitorSelectorNilUsesHelmValues=false` flag is important. Without it, Prometheus only discovers ServiceMonitors that have a specific label matching the Helm release, which can be confusing.

```bash
# Verify the installation
kubectl get pods -n monitoring

# You should see:
# prometheus-prometheus-kube-prometheus-prometheus-0   Running
# alertmanager-prometheus-kube-prometheus-alertmanager-0   Running
# prometheus-kube-prometheus-operator-xxxx   Running
# prometheus-grafana-xxxx   Running
# prometheus-kube-state-metrics-xxxx   Running
# prometheus-prometheus-node-exporter-xxxx   Running (one per node)
```

## Accessing the Dashboards

### Prometheus UI

```bash
# Port-forward to access Prometheus locally
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Open http://localhost:9090 in your browser
```

### Grafana

```bash
# Port-forward to access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Open http://localhost:3000
# Login with admin / YourGrafanaPassword
```

### Alertmanager

```bash
# Port-forward to access Alertmanager
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-alertmanager 9093:9093

# Open http://localhost:9093
```

## Creating ServiceMonitors

ServiceMonitors tell Prometheus how to discover and scrape metrics from your services. Here is an example for a web application:

```yaml
# service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: webapp-monitor
  namespace: default
  labels:
    release: prometheus  # Match this to your Helm release name
spec:
  selector:
    matchLabels:
      app: webapp
  namespaceSelector:
    matchNames:
    - default
  endpoints:
  - port: http-metrics
    interval: 15s
    path: /metrics
    scrapeTimeout: 10s
```

Your service needs a port named `http-metrics` (or whatever you specify in the endpoint):

```yaml
# webapp-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  selector:
    app: webapp
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: http-metrics
    port: 9090
    targetPort: 9090
```

```bash
kubectl apply -f webapp-service.yaml
kubectl apply -f service-monitor.yaml

# Verify Prometheus is scraping the target
# Check in Prometheus UI under Status > Targets
```

## Creating PodMonitors

For pods that do not have a Service (like DaemonSets or Jobs), use PodMonitors:

```yaml
# pod-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: batch-jobs-monitor
  namespace: default
spec:
  selector:
    matchLabels:
      app: batch-processor
  podMetricsEndpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

## Setting Up Alerting Rules

PrometheusRule resources define alerting and recording rules:

```yaml
# alerting-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: webapp-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
  - name: webapp.rules
    rules:
    # Alert when pod is restarting frequently
    - alert: PodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total{namespace="default"}[15m]) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pod {{ $labels.pod }} is crash looping"
        description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has been restarting."

    # Alert when deployment has no available replicas
    - alert: DeploymentUnavailable
      expr: kube_deployment_status_replicas_available{namespace="default"} == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Deployment {{ $labels.deployment }} has no available replicas"

    # Alert on high error rate
    - alert: HighErrorRate
      expr: |
        sum(rate(http_requests_total{status=~"5..",job="webapp"}[5m]))
        /
        sum(rate(http_requests_total{job="webapp"}[5m])) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "More than 5% of requests are returning 5xx errors."

    # Alert on high latency
    - alert: HighLatency
      expr: |
        histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="webapp"}[5m])) by (le))
        > 1.0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High request latency"
        description: "95th percentile latency is above 1 second."
```

```bash
kubectl apply -f alerting-rules.yaml

# Verify rules are loaded
# Check in Prometheus UI under Status > Rules
```

## Configuring Alertmanager

Configure Alertmanager to send notifications:

```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-prometheus-kube-prometheus-alertmanager
  namespace: monitoring
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m
      slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

    route:
      group_by: ['alertname', 'namespace']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      receiver: 'slack-notifications'
      routes:
      - match:
          severity: critical
        receiver: 'slack-critical'
        repeat_interval: 1h
      - match:
          severity: warning
        receiver: 'slack-warnings'
        repeat_interval: 4h

    receivers:
    - name: 'slack-notifications'
      slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

    - name: 'slack-critical'
      slack_configs:
      - channel: '#alerts-critical'
        title: 'CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

    - name: 'slack-warnings'
      slack_configs:
      - channel: '#alerts-warnings'
        title: 'WARNING: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
```

```bash
kubectl apply -f alertmanager-config.yaml
```

## Monitoring Talos Linux Nodes

The kube-prometheus-stack includes node-exporter which runs on every node and collects OS-level metrics. On Talos Linux, the node-exporter runs as a DaemonSet and provides metrics like:

- CPU usage per core
- Memory utilization
- Disk I/O and space
- Network traffic
- System load

```bash
# Check that node-exporter is running on all nodes
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus-node-exporter -o wide

# Verify node metrics are being collected
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Query: node_cpu_seconds_total
# Query: node_memory_MemAvailable_bytes
```

## Monitoring Kubernetes Components

The kube-prometheus-stack automatically monitors Kubernetes components on Talos Linux:

```bash
# Check which targets Prometheus is scraping
# In Prometheus UI, go to Status > Targets

# Key targets on Talos Linux:
# - kubelet (each node)
# - kube-apiserver
# - kube-controller-manager
# - kube-scheduler
# - etcd
# - coredns
# - kube-proxy
```

For Talos Linux specifically, you may need to adjust some scrape targets since Talos exposes metrics differently than traditional Linux distributions:

```yaml
# If you need to customize Prometheus scrape settings
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set kubeEtcd.service.targetPort=2381 \
  --set kubeControllerManager.service.targetPort=10257 \
  --set kubeScheduler.service.targetPort=10259 \
  --reuse-values
```

## Storage Considerations

For production monitoring on Talos Linux, configure persistent storage:

```yaml
# prometheus-storage-values.yaml
prometheus:
  prometheusSpec:
    retention: 30d
    retentionSize: "45GB"
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: your-storage-class
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
    resources:
      requests:
        cpu: "500m"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: your-storage-class
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi
```

```bash
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  -f prometheus-storage-values.yaml \
  --reuse-values
```

## Useful Prometheus Queries for Talos Linux

```promql
# Cluster CPU utilization
1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))

# Cluster memory utilization
1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)

# Pod CPU usage by namespace
sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (namespace)

# Pod memory usage by namespace
sum(container_memory_working_set_bytes{container!=""}) by (namespace)

# API server request rate
sum(rate(apiserver_request_total[5m])) by (verb)

# etcd leader changes (important for Talos cluster health)
changes(etcd_server_is_leader[1h])

# Node disk usage
1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)
```

## Wrapping Up

The Prometheus Operator on Talos Linux gives you a declarative, Kubernetes-native approach to monitoring. Deploy it with the kube-prometheus-stack Helm chart for a batteries-included setup, create ServiceMonitors and PodMonitors for your applications, define PrometheusRules for alerting, and configure Alertmanager to notify your team. The Operator handles all the Prometheus configuration generation and reloading, letting you manage monitoring the same way you manage everything else on Kubernetes - through YAML and the Kubernetes API.
