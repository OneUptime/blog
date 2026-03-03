# How to Monitor Resource Utilization on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Monitoring, Resource Utilization, Prometheus, Kubernetes

Description: A complete guide to monitoring CPU, memory, disk, and network resource utilization on Talos Linux Kubernetes clusters

---

Monitoring resource utilization is essential for maintaining a healthy Kubernetes cluster. Without visibility into how your nodes and pods consume CPU, memory, disk, and network resources, you are flying blind. You cannot tune what you cannot measure, and you cannot plan capacity without historical data. On Talos Linux, monitoring requires a different approach because there is no SSH access and no traditional system tools installed. Everything goes through the Talos API or Kubernetes-native monitoring solutions.

This guide covers the tools, configurations, and metrics you need to effectively monitor resource utilization on Talos Linux.

## Monitoring with talosctl

The talosctl command provides direct access to system information through the Talos API. This is your first line of investigation for any resource utilization questions.

```bash
# CPU and memory overview
talosctl stats --nodes 10.0.0.1

# Detailed memory information
talosctl read /proc/meminfo --nodes 10.0.0.1

# CPU utilization
talosctl read /proc/stat --nodes 10.0.0.1

# Disk usage
talosctl read /proc/diskstats --nodes 10.0.0.1

# Network statistics
talosctl read /proc/net/dev --nodes 10.0.0.1

# Load average
talosctl read /proc/loadavg --nodes 10.0.0.1

# Process list
talosctl processes --nodes 10.0.0.1
```

These commands are useful for quick troubleshooting, but they do not provide historical data or alerting. For that, you need a proper monitoring stack.

## Deploying Prometheus and Grafana

The standard Kubernetes monitoring stack consists of Prometheus for metrics collection and Grafana for visualization. The kube-prometheus-stack Helm chart bundles everything you need:

```bash
# Add the Prometheus community Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install the kube-prometheus-stack
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values monitoring-values.yaml
```

```yaml
# monitoring-values.yaml
prometheus:
  prometheusSpec:
    retention: 30d                     # Keep 30 days of data
    resources:
      requests:
        memory: 4Gi
        cpu: "2"
      limits:
        memory: 8Gi
        cpu: "4"
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi           # Persistent storage for metrics

nodeExporter:
  enabled: true                        # Deploy node-exporter on every node

grafana:
  enabled: true
  persistence:
    enabled: true
    size: 10Gi
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'default'
        folder: ''
        type: file
        options:
          path: /var/lib/grafana/dashboards
```

## Node Exporter for System Metrics

Node Exporter is a Prometheus exporter that runs as a DaemonSet and exposes system metrics from every node. It is the primary source of node-level resource utilization data.

```yaml
# node-exporter runs as part of kube-prometheus-stack
# Key metrics it provides:

# CPU metrics
# node_cpu_seconds_total{mode="idle|system|user|iowait|steal"}
# Shows time spent in each CPU mode

# Memory metrics
# node_memory_MemTotal_bytes
# node_memory_MemAvailable_bytes
# node_memory_MemFree_bytes
# node_memory_Buffers_bytes
# node_memory_Cached_bytes

# Disk metrics
# node_disk_read_bytes_total
# node_disk_written_bytes_total
# node_disk_io_time_seconds_total
# node_filesystem_avail_bytes
# node_filesystem_size_bytes

# Network metrics
# node_network_receive_bytes_total
# node_network_transmit_bytes_total
# node_network_receive_drop_total
# node_network_transmit_drop_total
```

## Essential Prometheus Queries

Here are the most useful PromQL queries for monitoring resource utilization:

### CPU Utilization

```promql
# CPU utilization per node (percentage)
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# CPU utilization per pod
sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (pod, namespace)

# CPU throttling (indicates pods hitting their CPU limits)
sum(rate(container_cpu_cfs_throttled_seconds_total[5m])) by (pod, namespace)

# System CPU vs User CPU
sum(rate(node_cpu_seconds_total{mode="system"}[5m])) by (instance) /
sum(rate(node_cpu_seconds_total{mode!="idle"}[5m])) by (instance) * 100
```

### Memory Utilization

```promql
# Node memory utilization (percentage)
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Pod memory working set (actual memory usage)
sum(container_memory_working_set_bytes{container!=""}) by (pod, namespace)

# Memory requests vs actual usage (for right-sizing)
sum(container_memory_working_set_bytes{container!=""}) by (pod) /
sum(kube_pod_container_resource_requests{resource="memory"}) by (pod)

# OOM kill events
increase(node_vmstat_oom_kill[1h])
```

### Disk I/O Utilization

```promql
# Disk utilization (percentage of time spent doing I/O)
rate(node_disk_io_time_seconds_total[5m]) * 100

# Disk read/write throughput per node
rate(node_disk_read_bytes_total[5m])
rate(node_disk_written_bytes_total[5m])

# Filesystem usage percentage
(node_filesystem_size_bytes - node_filesystem_avail_bytes) /
node_filesystem_size_bytes * 100

# IOPS per device
rate(node_disk_reads_completed_total[5m])
rate(node_disk_writes_completed_total[5m])
```

### Network Utilization

```promql
# Network throughput per node
rate(node_network_receive_bytes_total{device!~"lo|veth.*"}[5m]) * 8  # bits/sec
rate(node_network_transmit_bytes_total{device!~"lo|veth.*"}[5m]) * 8

# Packet drop rate
rate(node_network_receive_drop_total[5m])
rate(node_network_transmit_drop_total[5m])

# Network errors
rate(node_network_receive_errs_total[5m])
rate(node_network_transmit_errs_total[5m])
```

## Setting Up Alerts

Configure alerting rules for resource utilization thresholds:

```yaml
# alerting-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: resource-utilization-alerts
  namespace: monitoring
spec:
  groups:
  - name: node-resources
    rules:
    - alert: HighCPUUtilization
      expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High CPU utilization on {{ $labels.instance }}"
        description: "CPU utilization is above 85% for 10 minutes"

    - alert: HighMemoryUtilization
      expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High memory utilization on {{ $labels.instance }}"

    - alert: DiskSpaceRunningLow
      expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 15
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Disk space running low on {{ $labels.instance }}"

    - alert: HighNetworkDropRate
      expr: rate(node_network_receive_drop_total[5m]) > 100
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High packet drop rate on {{ $labels.instance }}"
```

## Kubernetes Metrics Server

The Metrics Server provides the data for `kubectl top` commands and is required for Horizontal Pod Autoscaler:

```bash
# Install metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Check node resource utilization
kubectl top nodes

# Check pod resource utilization
kubectl top pods --all-namespaces --sort-by=memory

# Check specific pod containers
kubectl top pods --containers -n my-namespace
```

## Grafana Dashboards

Import these community dashboards for comprehensive visualization:

- Dashboard 1860: Node Exporter Full - Detailed node metrics
- Dashboard 315: Kubernetes cluster monitoring
- Dashboard 747: Pod resource usage

```bash
# Create a custom dashboard via ConfigMap
kubectl create configmap custom-dashboard \
  --from-file=dashboard.json \
  -n monitoring
```

## Right-Sizing Based on Monitoring Data

Use your monitoring data to identify over-provisioned and under-provisioned workloads:

```promql
# Pods requesting more CPU than they use (candidates for right-sizing)
(sum(kube_pod_container_resource_requests{resource="cpu"}) by (pod, namespace) -
sum(rate(container_cpu_usage_seconds_total[24h])) by (pod, namespace)) > 0.5

# Pods frequently hitting memory limits
sum(container_memory_working_set_bytes{container!=""}) by (pod, namespace) /
sum(kube_pod_container_resource_limits{resource="memory"}) by (pod, namespace) > 0.9
```

## Conclusion

Monitoring resource utilization on Talos Linux is built on the same Kubernetes-native tools used everywhere else, with the addition of talosctl for direct system access. Deploy the kube-prometheus-stack for comprehensive metrics collection, configure meaningful alerts, and use the data to drive your capacity planning and performance tuning decisions. The key is not just collecting metrics but acting on them: right-size your pods, scale your cluster proactively, and address bottlenecks before they impact your users.
