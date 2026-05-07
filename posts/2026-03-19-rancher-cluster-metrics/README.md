# How to View Cluster Metrics in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Management, Node Management

Description: Learn how to view and monitor cluster metrics in Rancher using built-in dashboards and the Rancher monitoring stack.

Monitoring cluster metrics is essential for understanding resource utilization, identifying bottlenecks, and planning capacity. Rancher provides built-in cluster dashboards and supports a full Prometheus and Grafana monitoring stack. This guide shows you how to access and use cluster metrics in Rancher.

## Built-in Cluster Metrics

Rancher displays basic cluster information in the Cluster Dashboard, and live resource usage depends on the metrics-server running in your cluster.

### Accessing the Cluster Dashboard

1. Log in to the Rancher UI
2. Go to **Cluster Management**
3. Click **Explore** for your cluster
4. The cluster dashboard opens

The default dashboard shows:

- **Node count**: Number of nodes in the cluster
- **Memory usage**: Current memory consumption
- **Events**: Recent cluster events
- **Resources**: A summary of cluster resources

### Viewing Node-Level Metrics

1. Navigate to your cluster
2. Click **Nodes** in the left sidebar
3. Each node row shows CPU and memory usage bars
4. Click on a node name for detailed metrics

Node details include:

- CPU requests and limits vs capacity
- Memory requests and limits vs capacity
- Pod count vs allocatable
- Conditions (Ready, DiskPressure, MemoryPressure, etc.)

### Viewing Workload Metrics

1. Navigate to **Workloads** in your cluster
2. Each deployment, DaemonSet, and StatefulSet shows replica counts
3. Click on a workload for detailed pod-level information

## Verifying metrics-server

The metrics-server provides the resource metrics API used by the dashboard. Verify it is running:

```bash
kubectl get deployment -n kube-system metrics-server
kubectl top node
kubectl top pod -A
```

If metrics-server is not installed:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

For RKE2 and K3s clusters, metrics-server is included by default.

## Installing the Rancher Monitoring Stack

For comprehensive metrics, install the Rancher Monitoring chart which deploys Prometheus, Grafana, and Alertmanager.

### Step 1: Install the Monitoring Chart

1. Navigate to your cluster in Rancher
2. Click **Explore**
3. Click **Cluster Tools** in the lower-left corner
4. Click **Install** for **Monitoring**

### Step 2: Configure Monitoring

Configure the monitoring stack during installation:

#### Prometheus Settings

```yaml
prometheus:
  prometheusSpec:
    scrapeInterval: 30s
    evaluationInterval: 30s
    retention: 7d
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 2Gi
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes:
          - ReadWriteOnce
          resources:
            requests:
              storage: 50Gi
```

#### Grafana Settings

```yaml
grafana:
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  persistence:
    enabled: true
    size: 10Gi
```

#### Alertmanager Settings

```yaml
alertmanager:
  alertmanagerSpec:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
```

### Step 3: Complete Installation

Click **Install** and wait for all components to deploy:

```bash
kubectl get pods -n cattle-monitoring-system
```

Expected pods:

- `prometheus-rancher-monitoring-prometheus-0`
- `alertmanager-rancher-monitoring-alertmanager-0`
- `rancher-monitoring-grafana-*`
- `rancher-monitoring-kube-state-metrics-*`
- `rancher-monitoring-prometheus-node-exporter-*` (one per node)

## Using Grafana Dashboards

### Accessing Grafana

1. In the Rancher UI, go to **Monitoring** in the left sidebar
2. Click **Grafana** to open the Grafana UI
3. Or access it directly through the Grafana service:

```bash
kubectl get svc -n cattle-monitoring-system | grep grafana
```

### Built-in Dashboards

Rancher Monitoring includes many pre-configured Grafana dashboards:

#### Cluster Overview

- **Kubernetes / Compute Resources / Cluster**: Overall CPU, memory, and network metrics
- **Kubernetes / Compute Resources / Namespace (Pods)**: Per-namespace resource usage
- **Kubernetes / Compute Resources / Node (Pods)**: Per-node resource usage

#### Node Metrics

- **Node Exporter / Nodes**: Detailed node hardware metrics
- **Node Exporter / USE Method / Cluster**: Utilization, Saturation, Errors per node

#### Workload Metrics

- **Kubernetes / Compute Resources / Workload**: Per-workload CPU and memory
- **Kubernetes / Compute Resources / Pod**: Individual pod resource usage

#### Network Metrics

- **Kubernetes / Networking / Cluster**: Cluster-wide network traffic
- **Kubernetes / Networking / Namespace**: Per-namespace network traffic

#### Storage Metrics

- **Kubernetes / Persistent Volumes**: PV utilization and capacity

### Navigating Dashboards

1. In Grafana, click the dashboard icon in the left sidebar
2. Browse by folder:
   - **Kubernetes**: Core Kubernetes metrics
   - **Node Exporter**: Node-level hardware metrics
   - **Rancher**: Rancher-specific dashboards

## Using Prometheus Directly

### Accessing the Prometheus UI

1. In the Rancher UI, go to **Monitoring**
2. Click **Prometheus Graph** to open the Prometheus UI
3. Use the expression browser to query metrics

### Useful PromQL Queries

#### Cluster CPU Usage

```promql
sum(rate(node_cpu_seconds_total{mode!="idle"}[5m])) / sum(machine_cpu_cores) * 100
```

#### Cluster Memory Usage

```promql
(sum(node_memory_MemTotal_bytes) - sum(node_memory_MemAvailable_bytes)) / sum(node_memory_MemTotal_bytes) * 100
```

#### Pod CPU Usage by Namespace

```promql
sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (namespace)
```

#### Node Disk Usage

```promql
(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100
```

#### Pod Count by Node

```promql
count(kube_pod_info) by (node)
```

#### Container Restarts

```promql
sum(increase(kube_pod_container_status_restarts_total[1h])) by (namespace, pod) > 0
```

## Setting Up Alerts

### Create Alert Rules

1. In the Rancher UI, go to **Monitoring > Advanced > Prometheus Rules**
2. Click **Create**
3. Configure the alert:

Example: High CPU usage alert:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cpu-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: cpu
    rules:
    - alert: HighNodeCPU
      expr: (1 - avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m]))) > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High CPU usage on {{ $labels.instance }}"
        description: "CPU usage is above 85% for 10 minutes"
```

### Configure Alert Receivers

Set up notification channels in Alertmanager:

1. Go to **Monitoring > Alerting > AlertManagerConfigs**
2. Click **Create** to create an AlertManagerConfig
3. Open it and add a receiver for your preferred notification method:
   - Slack
   - Email
   - PagerDuty
   - Webhook

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: team-notifications
  namespace: cattle-monitoring-system
spec:
  route:
    receiver: slack-notifications
    groupBy:
    - alertname
    - namespace
  receivers:
  - name: slack-notifications
    slackConfigs:
    - channel: '#alerts'
      apiURL:
        name: slack-webhook
        key: url
      sendResolved: true
```

## Viewing Metrics via kubectl

For quick metric checks without the UI:

```bash
# Node resource usage

kubectl top node

# Pod resource usage
kubectl top pod -A --sort-by=cpu
kubectl top pod -A --sort-by=memory

# Detailed node metrics
kubectl describe node <NODE_NAME> | grep -A15 "Allocated resources"
```

## Best Practices

- Set resource requests and limits on all pods so metrics are meaningful for capacity planning
- Configure persistent storage for Prometheus to retain metrics across restarts
- Set appropriate retention periods based on your storage capacity
- Create dashboards specific to your applications and SLOs
- Set up alerts for critical conditions before they impact users
- Monitor monitoring: ensure Prometheus and Grafana are healthy
- Use recording rules for frequently queried complex PromQL expressions

## Conclusion

Rancher provides multiple layers of cluster metrics visibility. The built-in dashboard covers basic resource utilization, while the Rancher Monitoring stack with Prometheus and Grafana provides deep observability into every aspect of your cluster. Install the monitoring stack on production clusters, configure alerts for critical conditions, and use Grafana dashboards to understand resource usage patterns for capacity planning and troubleshooting.
