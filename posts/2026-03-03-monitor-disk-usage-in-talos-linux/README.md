# How to Monitor Disk Usage in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Monitoring, Disk Usage, Prometheus, Kubernetes, Observability

Description: A comprehensive guide to monitoring disk usage on Talos Linux nodes using talosctl, Kubernetes tools, Prometheus, and Grafana dashboards.

---

Monitoring disk usage is one of the most important operational tasks when running a Talos Linux cluster. Running out of disk space can lead to pod evictions, etcd failures, and even node crashes. Since Talos does not give you shell access to run commands like `df` or `du`, you need to use alternative approaches. This guide covers multiple methods for keeping track of disk usage across your Talos nodes.

## Monitoring with talosctl

The most direct way to check disk usage on a Talos node is through the `talosctl` command line tool.

### Checking Mount Points

```bash
# View all mounted filesystems and their usage
talosctl get mounts --nodes 192.168.1.10

# For detailed output including usage percentages
talosctl get mounts --nodes 192.168.1.10 -o yaml
```

The output shows each mounted partition, its total size, used space, and available space. Pay particular attention to the EPHEMERAL partition, which is where Kubernetes workloads store their data.

### Checking Disk Information

```bash
# View physical disk information
talosctl get disks --nodes 192.168.1.10

# Check block device details
talosctl get blockdevices --nodes 192.168.1.10
```

### Checking System Statistics

```bash
# Get overall system statistics including disk IO
talosctl get systemstat --nodes 192.168.1.10

# Check system resource usage
talosctl stats --nodes 192.168.1.10
```

### Querying Multiple Nodes

For a fleet-wide view, query all nodes at once:

```bash
# Check mounts across all control plane nodes
talosctl get mounts --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# Check mounts across all worker nodes
talosctl get mounts --nodes 192.168.1.20,192.168.1.21,192.168.1.22
```

## Monitoring with Kubernetes

Kubernetes itself provides disk usage information through the node status and metrics API.

### Node Conditions

```bash
# Check if any nodes have disk pressure
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
DISK_PRESSURE:.status.conditions[?(@.type=="DiskPressure")].status

# Example output:
# NAME        DISK_PRESSURE
# cp-01       False
# cp-02       False
# worker-01   False
# worker-02   True   <-- This node has disk pressure
```

### Node Describe

```bash
# Get detailed node information including allocatable resources
kubectl describe node worker-01

# Look for the "Conditions" section:
#   Type             Status
#   DiskPressure     False
#
# And the "Capacity" vs "Allocatable" section:
#   ephemeral-storage:  200Gi
```

### Metrics Server

If you have the Kubernetes Metrics Server deployed:

```bash
# Check resource usage across all nodes
kubectl top nodes

# Example output:
# NAME        CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
# worker-01   250m         12%    2048Mi           25%
# worker-02   180m         9%     1536Mi           19%
```

Note that `kubectl top nodes` shows CPU and memory but not disk. For disk metrics, you need Prometheus or a similar monitoring system.

## Monitoring with Prometheus

Prometheus is the gold standard for monitoring Kubernetes clusters, and it provides detailed disk metrics through the Node Exporter.

### Setting Up Node Exporter

If you are using the kube-prometheus-stack Helm chart, the Node Exporter is included by default:

```bash
# Install kube-prometheus-stack with Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

### Key Disk Metrics

Once Node Exporter is running, the following metrics are available:

```promql
# Total filesystem size in bytes
node_filesystem_size_bytes{mountpoint="/var"}

# Available space in bytes
node_filesystem_avail_bytes{mountpoint="/var"}

# Used space (calculated)
node_filesystem_size_bytes{mountpoint="/var"} - node_filesystem_avail_bytes{mountpoint="/var"}

# Usage percentage
(1 - node_filesystem_avail_bytes{mountpoint="/var"} / node_filesystem_size_bytes{mountpoint="/var"}) * 100

# Disk IO - read bytes per second
rate(node_disk_read_bytes_total[5m])

# Disk IO - write bytes per second
rate(node_disk_written_bytes_total[5m])

# Disk IO operations per second
rate(node_disk_io_time_seconds_total[5m])

# Inode usage (running out of inodes is also a problem)
node_filesystem_files_free{mountpoint="/var"}
```

### Setting Up Alerts

Configure Prometheus alerting rules to catch disk problems early:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: disk-usage-alerts
  namespace: monitoring
spec:
  groups:
    - name: disk.rules
      rules:
        # Alert when disk usage exceeds 80%
        - alert: NodeDiskUsageHigh
          expr: |
            (1 - node_filesystem_avail_bytes{mountpoint="/var"}
            / node_filesystem_size_bytes{mountpoint="/var"}) * 100 > 80
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "High disk usage on {{ $labels.instance }}"
            description: "Disk usage is {{ $value }}% on {{ $labels.instance }}"

        # Alert when disk is predicted to fill within 24 hours
        - alert: NodeDiskFillingUp
          expr: |
            predict_linear(
              node_filesystem_avail_bytes{mountpoint="/var"}[6h], 24*3600
            ) < 0
          for: 30m
          labels:
            severity: critical
          annotations:
            summary: "Disk on {{ $labels.instance }} predicted to fill within 24h"

        # Alert when inode usage is high
        - alert: NodeInodeUsageHigh
          expr: |
            (1 - node_filesystem_files_free{mountpoint="/var"}
            / node_filesystem_files{mountpoint="/var"}) * 100 > 90
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "High inode usage on {{ $labels.instance }}"

        # Alert for disk IO saturation
        - alert: NodeDiskIOSaturation
          expr: |
            rate(node_disk_io_time_seconds_total[5m]) > 0.95
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Disk IO saturation on {{ $labels.instance }}"
```

## Grafana Dashboards

Pair Prometheus with Grafana for visual disk monitoring. Here is a dashboard configuration for disk usage:

```json
{
  "panels": [
    {
      "title": "Disk Usage by Node",
      "type": "gauge",
      "targets": [
        {
          "expr": "(1 - node_filesystem_avail_bytes{mountpoint='/var'} / node_filesystem_size_bytes{mountpoint='/var'}) * 100",
          "legendFormat": "{{ instance }}"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "steps": [
              {"color": "green", "value": 0},
              {"color": "yellow", "value": 70},
              {"color": "red", "value": 85}
            ]
          }
        }
      }
    },
    {
      "title": "Disk Space Available Trend",
      "type": "timeseries",
      "targets": [
        {
          "expr": "node_filesystem_avail_bytes{mountpoint='/var'} / 1024 / 1024 / 1024",
          "legendFormat": "{{ instance }}"
        }
      ]
    }
  ]
}
```

You can also import pre-built dashboards from the Grafana community. Dashboard ID 1860 (Node Exporter Full) includes comprehensive disk monitoring panels.

## Monitoring etcd Disk Usage

For control plane nodes, etcd disk usage deserves special attention:

```bash
# Check etcd database size
talosctl etcd status --nodes 192.168.1.10

# Check etcd alarms (including space alarms)
talosctl etcd alarm list --nodes 192.168.1.10
```

Prometheus metrics for etcd:

```promql
# etcd database size
etcd_mvcc_db_total_size_in_bytes

# etcd database in use
etcd_mvcc_db_total_size_in_use_in_bytes

# Backend commit duration (indicates disk speed)
histogram_quantile(0.99, rate(etcd_disk_backend_commit_duration_seconds_bucket[5m]))
```

## Building a Monitoring Script

For quick checks without a full monitoring stack, here is a script that checks disk usage across your cluster:

```bash
#!/bin/bash
# Quick disk usage check across all Talos nodes

CONTROL_PLANE=("192.168.1.10" "192.168.1.11" "192.168.1.12")
WORKERS=("192.168.1.20" "192.168.1.21" "192.168.1.22" "192.168.1.23")

echo "=== Control Plane Nodes ==="
for NODE in "${CONTROL_PLANE[@]}"; do
  echo "Node: $NODE"
  talosctl get mounts --nodes "$NODE" 2>/dev/null | grep -E "EPHEMERAL|STATE"
  echo ""
done

echo "=== Worker Nodes ==="
for NODE in "${WORKERS[@]}"; do
  echo "Node: $NODE"
  talosctl get mounts --nodes "$NODE" 2>/dev/null | grep -E "EPHEMERAL"
  echo ""
done

echo "=== Kubernetes Disk Pressure Check ==="
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
DISK_PRESSURE:.status.conditions[?\(@.type==\"DiskPressure\"\)].status
```

## Best Practices for Disk Monitoring

1. Set alerts at 80% usage (warning) and 90% usage (critical). This gives you time to respond.
2. Use predictive alerts based on `predict_linear` to catch slow disk fills before they become emergencies.
3. Monitor both space and inodes. A filesystem can run out of inodes before running out of space, especially with many small files.
4. Track disk IO metrics alongside space metrics. High IO can indicate a performance problem even if space is fine.
5. Check etcd disk usage separately on control plane nodes.
6. Review disk usage trends weekly to plan capacity ahead of time.

## Conclusion

Monitoring disk usage in Talos Linux requires using the Talos API, Kubernetes APIs, and external monitoring tools like Prometheus and Grafana. By combining talosctl commands for quick checks, Kubernetes conditions for cluster-level awareness, and Prometheus metrics for detailed trending and alerting, you can maintain full visibility into disk usage across your Talos cluster and respond to problems before they impact your workloads.
