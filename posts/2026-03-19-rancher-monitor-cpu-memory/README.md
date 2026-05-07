# How to Monitor Cluster CPU and Memory Usage in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Prometheus, Grafana

Description: Learn how to monitor cluster-wide CPU and memory usage in Rancher using built-in dashboards, PromQL queries, and custom alerts.

Keeping track of CPU and memory usage across your Kubernetes cluster is fundamental to maintaining performance and availability. Rancher provides built-in tools for monitoring resource consumption at the cluster, node, and workload levels. This guide covers how to use these tools effectively and set up alerts for resource thresholds.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- At least one managed Kubernetes cluster.
- Access to the Rancher UI with cluster view permissions.

## Step 1: View Cluster Resources in the Rancher UI

The Rancher UI provides a quick overview of cluster resource usage:

1. Log in to Rancher and select your cluster.
2. On the **Cluster Dashboard**, you will see summary cards showing total CPU and memory allocation and usage.
3. Navigate to **Cluster > Nodes** to see per-node resource breakdowns.

Each node displays:
- CPU requests vs capacity
- Memory requests vs capacity
- Pod count vs maximum

## Step 2: Use Grafana Dashboards for Detailed Metrics

For more detailed analysis, use the pre-built Grafana dashboards:

1. Navigate to **Monitoring > Grafana** in the Rancher UI.
2. Open **Dashboards > Browse**.
3. Select **Kubernetes / Compute Resources / Cluster**.

This dashboard shows:
- Total cluster CPU usage over time
- CPU usage by namespace
- Memory usage over time
- Memory usage by namespace
- Network bandwidth by namespace

## Step 3: Query CPU Metrics with PromQL

Open the Prometheus Graph UI from **Monitoring > Prometheus Graph** and use these queries to analyze CPU usage:

### Overall Cluster CPU Usage

```promql
sum(rate(node_cpu_seconds_total{mode!="idle"}[5m])) / sum(machine_cpu_cores) * 100
```

### Per-Node CPU Usage

```promql
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

### CPU Requests vs Capacity

```promql
sum(kube_pod_container_resource_requests{resource="cpu"}) / sum(kube_node_status_capacity{resource="cpu"}) * 100
```

### CPU Limits vs Capacity

```promql
sum(kube_pod_container_resource_limits{resource="cpu"}) / sum(kube_node_status_capacity{resource="cpu"}) * 100
```

## Step 4: Query Memory Metrics with PromQL

### Overall Cluster Memory Usage

```promql
(1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)) * 100
```

### Per-Node Memory Usage

```promql
100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)
```

### Memory Requests vs Capacity

```promql
sum(kube_pod_container_resource_requests{resource="memory"}) / sum(kube_node_status_capacity{resource="memory"}) * 100
```

### Top Memory Consuming Pods

```promql
topk(10, sum by (namespace, pod) (container_memory_working_set_bytes{container!=""}))
```

## Step 5: Set Up CPU Usage Alerts

Create PrometheusRules to alert on high CPU usage:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cpu-alerts
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: cpu-usage-alerts
      rules:
        - alert: HighNodeCPUUsage
          expr: |
            100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "High CPU usage on node {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} CPU usage is {{ $value | humanize }}% for more than 15 minutes."

        - alert: CriticalNodeCPUUsage
          expr: |
            100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 95
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Critical CPU usage on node {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} CPU usage is {{ $value | humanize }}% for more than 5 minutes."

        - alert: HighClusterCPURequests
          expr: |
            sum(kube_pod_container_resource_requests{resource="cpu"}) / sum(kube_node_status_capacity{resource="cpu"}) * 100 > 80
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Cluster CPU requests are above 80% of capacity"
            description: "CPU requests are {{ $value | humanize }}% of total cluster capacity."
```

Apply the alert rules:

```bash
kubectl apply -f cpu-alerts.yaml
```

## Step 6: Set Up Memory Usage Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: memory-alerts
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: memory-usage-alerts
      rules:
        - alert: HighNodeMemoryUsage
          expr: |
            (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 85
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "High memory usage on node {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} memory usage is {{ $value | humanize }}% for more than 15 minutes."

        - alert: CriticalNodeMemoryUsage
          expr: |
            (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 95
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Critical memory usage on node {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} memory usage is {{ $value | humanize }}% for more than 5 minutes."

        - alert: NodeMemoryPressure
          expr: |
            kube_node_status_condition{condition="MemoryPressure",status="true"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Node {{ $labels.node }} is under memory pressure"
            description: "Node {{ $labels.node }} has been reporting MemoryPressure for 5 minutes."
```

## Step 7: Create a Custom Grafana Dashboard

Build a focused CPU and memory dashboard by exporting the dashboard JSON model from Grafana and storing it in a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-resources-dashboard
  namespace: cattle-dashboards
  labels:
    grafana_dashboard: "1"
data:
  cluster-resources.json: |-
    <paste-the-exported-dashboard-json-model-here>
```

## Step 8: Monitor Resource Quotas

If you use Kubernetes ResourceQuotas, monitor their usage:

```promql
# Namespace CPU quota usage

kube_resourcequota{type="used", resource="requests.cpu"} / kube_resourcequota{type="hard", resource="requests.cpu"} * 100

# Namespace memory quota usage
kube_resourcequota{type="used", resource="requests.memory"} / kube_resourcequota{type="hard", resource="requests.memory"} * 100
```

## Step 9: Use kubectl for Quick Checks

For quick command-line checks of resource usage:

```bash
# Node resource usage
kubectl top nodes

# Pod resource usage across all namespaces
kubectl top pods --all-namespaces --sort-by=cpu

# Pod resource usage in a specific namespace
kubectl top pods -n my-namespace --sort-by=memory
```

Note: The `kubectl top` command requires the Metrics Server to be installed and working in the cluster.

## Summary

Monitoring CPU and memory in Rancher combines the Rancher UI for quick overviews, Grafana dashboards for detailed visualization, PromQL queries for ad-hoc analysis, and PrometheusRules for automated alerting. Set up alerts for both usage thresholds and Kubernetes conditions like MemoryPressure to catch resource issues before they impact your workloads.
