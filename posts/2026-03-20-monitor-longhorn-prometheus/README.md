# How to Monitor Longhorn with Prometheus - Monitor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Monitoring, Prometheus, Observability

Description: Configure Prometheus to scrape Longhorn metrics and set up alerting rules to monitor storage health, capacity, and performance in your Kubernetes cluster.

## Introduction

Longhorn exposes a rich set of Prometheus metrics that provide visibility into volume health, replica status, disk capacity, and I/O performance. By integrating Longhorn with Prometheus (and optionally the Prometheus Operator), you can build comprehensive monitoring dashboards and set up alerts for storage issues before they impact your workloads.

## Prerequisites

- Longhorn installed and running
- Prometheus Operator or Prometheus server deployed in the cluster
- `kubectl` access to the cluster

## Longhorn Metrics Overview

Longhorn exposes metrics at the `/metrics` endpoint. Key metric categories include:

| Metric Category | Examples |
|----------------|---------|
| Volume | `longhorn_volume_actual_size_bytes`, `longhorn_volume_state`, `longhorn_volume_robustness` |
| Node | `longhorn_node_status`, `longhorn_node_count_total`, `longhorn_node_storage_capacity_bytes` |
| Disk | `longhorn_disk_capacity_bytes`, `longhorn_disk_usage_bytes`, `longhorn_disk_reservation_bytes` |
| Manager | `longhorn_manager_cpu_usage_millicpu`, `longhorn_manager_memory_usage_bytes` |
| Instance Manager | `longhorn_instance_manager_cpu_usage_millicpu` |

## Method 1: Using ServiceMonitor (Prometheus Operator)

If you have the Prometheus Operator installed:

```yaml
# longhorn-servicemonitor.yaml - Prometheus ServiceMonitor for Longhorn

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: longhorn-prometheus-servicemonitor
  namespace: monitoring           # Namespace where Prometheus is deployed
  labels:
    # These labels must match your Prometheus serviceMonitorSelector
    app: longhorn-prometheus
spec:
  namespaceSelector:
    matchNames:
      - longhorn-system
  selector:
    matchLabels:
      app: longhorn-manager       # Selects the Longhorn manager service
  endpoints:
    - port: manager               # The metrics port name
      path: /metrics
      interval: 30s               # Scrape every 30 seconds
```

```bash
kubectl apply -f longhorn-servicemonitor.yaml

# Verify Prometheus discovered the target
# Check Prometheus UI → Status → Targets
```

## Method 2: Static Prometheus Scrape Config

For standalone Prometheus (not Operator-based):

```yaml
# prometheus-config.yaml - Add Longhorn scrape job to Prometheus config
scrape_configs:
  - job_name: 'longhorn'
    # Service discovery from Kubernetes
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
            - longhorn-system
    # Only scrape the Longhorn manager endpoints
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_app]
        action: keep
        regex: longhorn-manager
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        action: keep
        regex: manager
```

```bash
# Update the Prometheus ConfigMap with the new scrape config
kubectl apply -f prometheus-config.yaml
kubectl rollout restart deployment prometheus -n monitoring
```

## Verify Metrics are Being Scraped

```bash
# Port-forward Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# In browser: http://localhost:9090/targets
# Look for "longhorn" in the target list
```

Or query metrics directly:

```bash
# Test querying Longhorn metrics
curl http://localhost:9090/api/v1/query?query=longhorn_volume_state | jq .
```

## Important Metrics to Monitor

### Volume Health

```promql
# Volumes currently in error state
longhorn_volume_robustness == 3   # 3 = faulted

# Volumes that are degraded (missing replicas)
longhorn_volume_robustness == 2   # 2 = degraded

# Total number of volumes
count(longhorn_volume_state)
```

### Disk Capacity

```promql
# Available disk space per disk (bytes)
longhorn_disk_capacity_bytes - longhorn_disk_usage_bytes

# Disk usage percentage
(longhorn_disk_usage_bytes / longhorn_disk_capacity_bytes) * 100

# Disks with less than 20% available
(longhorn_disk_capacity_bytes - longhorn_disk_usage_bytes) / longhorn_disk_capacity_bytes < 0.20
```

### Node Status

```promql
# Nodes that are not schedulable
longhorn_node_status{condition="schedulable"} == 0

# Node count
longhorn_node_count_total
```

## Setting Up Prometheus Alerting Rules

```yaml
# longhorn-alerting-rules.yaml - PrometheusRule for Longhorn
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: longhorn-alerts
  namespace: monitoring
  labels:
    app: kube-prometheus-stack
spec:
  groups:
    - name: longhorn-storage
      interval: 30s
      rules:
        # Alert when a volume is degraded
        - alert: LonghornVolumeDegraded
          expr: longhorn_volume_robustness == 2
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Longhorn volume is degraded"
            description: "Volume {{ $labels.volume }} has degraded robustness."

        # Alert when a volume is faulted
        - alert: LonghornVolumeFaulted
          expr: longhorn_volume_robustness == 3
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Longhorn volume is faulted"
            description: "Volume {{ $labels.volume }} is in a faulted state."

        # Alert when disk is almost full
        - alert: LonghornDiskStorageLow
          expr: |
            (longhorn_disk_capacity_bytes - longhorn_disk_usage_bytes) / longhorn_disk_capacity_bytes < 0.20
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Longhorn disk storage is running low"
            description: "Disk on node {{ $labels.node }} has less than 20% available storage."

        # Alert when disk is critically full
        - alert: LonghornDiskStorageCritical
          expr: |
            (longhorn_disk_capacity_bytes - longhorn_disk_usage_bytes) / longhorn_disk_capacity_bytes < 0.10
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Longhorn disk storage is critically low"
            description: "Disk on node {{ $labels.node }} has less than 10% available storage."

        # Alert when a node is not schedulable
        - alert: LonghornNodeNotSchedulable
          expr: longhorn_node_status{condition="schedulable"} == 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Longhorn node is not schedulable"
            description: "Node {{ $labels.node }} is not schedulable for new replicas."
```

```bash
kubectl apply -f longhorn-alerting-rules.yaml
```

## Conclusion

Integrating Longhorn with Prometheus provides the observability needed to proactively manage your Kubernetes storage infrastructure. By monitoring key metrics like volume health, disk capacity, and node status, and setting up appropriate alerts, you can detect and address storage issues before they impact applications. Pair Prometheus with Grafana (using the Longhorn dashboard) for visual monitoring that makes trends and anomalies immediately apparent.
