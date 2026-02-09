# How to Implement Storage Monitoring with Prometheus CSI Driver Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Prometheus

Description: Monitor CSI driver performance and storage health using Prometheus metrics, enabling proactive capacity management and performance troubleshooting for persistent volumes.

---

CSI drivers expose metrics through Prometheus endpoints that provide visibility into volume operations, capacity utilization, and driver health. Without proper monitoring, storage issues manifest as application failures rather than preventable capacity or performance problems.

This guide implements comprehensive storage monitoring through CSI driver metrics, kubelet volume stats, and custom alerts for capacity exhaustion, performance degradation, and provisioning failures.

## Understanding CSI Metrics

CSI drivers expose metrics at three levels: controller metrics track provisioning and attachment operations, node metrics monitor mounting and volume usage, and sidecar metrics from external-provisioner and external-attacher components track specific operations.

Controller metrics include volume creation/deletion latency, provisioning success/failure rates, and active volume counts. Node metrics track filesystem usage, IOPS, throughput, and mount operation success rates. Sidecar metrics provide detailed visibility into CSI RPC call durations and error rates.

## Enabling CSI Driver Metrics

Most CSI drivers expose metrics on a dedicated port. Verify your driver supports Prometheus metrics.

```bash
# Check if CSI controller exposes metrics
kubectl get pods -n <csi-namespace> -o yaml | grep -A 5 "containerPort"

# Port forward to access metrics locally
kubectl port-forward -n <csi-namespace> <csi-controller-pod> 9090:9090

# Curl metrics endpoint
curl http://localhost:9090/metrics
```

Example CSI driver deployment with metrics enabled:

```yaml
# csi-controller-metrics.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: csi-controller
  namespace: csi-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: csi-controller
  template:
    metadata:
      labels:
        app: csi-controller
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: csi-provisioner
        image: registry.k8s.io/sig-storage/csi-provisioner:v3.6.0
        args:
        - --csi-address=/csi/csi.sock
        - --metrics-address=:9090
        - --leader-election=true
        ports:
        - name: metrics
          containerPort: 9090
        volumeMounts:
        - name: socket-dir
          mountPath: /csi
      - name: csi-attacher
        image: registry.k8s.io/sig-storage/csi-attacher:v4.4.0
        args:
        - --csi-address=/csi/csi.sock
        - --metrics-address=:9091
        ports:
        - name: metrics
          containerPort: 9091
        volumeMounts:
        - name: socket-dir
          mountPath: /csi
      volumes:
      - name: socket-dir
        emptyDir: {}
```

## Creating ServiceMonitors

Deploy ServiceMonitors to scrape CSI metrics.

```yaml
# csi-servicemonitors.yaml
apiVersion: v1
kind: Service
metadata:
  name: csi-controller-metrics
  namespace: csi-system
  labels:
    app: csi-controller
spec:
  ports:
  - name: provisioner-metrics
    port: 9090
    targetPort: 9090
  - name: attacher-metrics
    port: 9091
    targetPort: 9091
  selector:
    app: csi-controller
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: csi-controller
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: csi-controller
  namespaceSelector:
    matchNames:
    - csi-system
  endpoints:
  - port: provisioner-metrics
    interval: 30s
    path: /metrics
  - port: attacher-metrics
    interval: 30s
    path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: csi-node
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: csi-node
  namespaceSelector:
    matchNames:
    - csi-system
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

Apply the configurations:

```bash
kubectl apply -f csi-servicemonitors.yaml

# Verify Prometheus is scraping targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets and search for csi
```

## Monitoring Volume Capacity

Track filesystem usage across all persistent volumes.

```promql
# Filesystem usage percentage
(kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) * 100

# Volumes above 80% capacity
(kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) > 0.80

# Available bytes per volume
kubelet_volume_stats_available_bytes

# Inode usage
kubelet_volume_stats_inodes_used / kubelet_volume_stats_inodes
```

Create Grafana dashboard:

```json
{
  "dashboard": {
    "title": "Storage Capacity",
    "panels": [
      {
        "title": "Volume Usage %",
        "targets": [
          {
            "expr": "(kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) * 100"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Volumes Near Capacity",
        "targets": [
          {
            "expr": "count((kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) > 0.80)"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

## Monitoring Provisioning Operations

Track volume creation and deletion metrics.

```promql
# Provisioning success rate
rate(csi_sidecar_operations_seconds_count{method_name="CreateVolume",grpc_status_code="OK"}[5m])
/ rate(csi_sidecar_operations_seconds_count{method_name="CreateVolume"}[5m])

# Average provisioning latency
rate(csi_sidecar_operations_seconds_sum{method_name="CreateVolume"}[5m])
/ rate(csi_sidecar_operations_seconds_count{method_name="CreateVolume"}[5m])

# Failed provision attempts
rate(csi_sidecar_operations_seconds_count{method_name="CreateVolume",grpc_status_code!="OK"}[5m])

# Pending PVC count
kube_persistentvolumeclaim_status_phase{phase="Pending"}
```

## Monitoring Volume Performance

Track IOPS and throughput metrics.

```promql
# Read IOPS
rate(kubelet_volume_stats_read_total[5m])

# Write IOPS
rate(kubelet_volume_stats_write_total[5m])

# Read throughput (bytes/sec)
rate(kubelet_volume_stats_read_bytes_total[5m])

# Write throughput (bytes/sec)
rate(kubelet_volume_stats_write_bytes_total[5m])

# Average operation latency
rate(kubelet_volume_stats_read_time_seconds_total[5m])
/ rate(kubelet_volume_stats_read_total[5m])
```

## Creating Storage Alerts

Implement comprehensive alerting for storage issues.

```yaml
# storage-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: storage-alerts
  namespace: monitoring
spec:
  groups:
  - name: storage-capacity
    interval: 60s
    rules:
    - alert: VolumeNearlyFull
      expr: |
        (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Volume {{ $labels.persistentvolumeclaim }} is {{ $value | humanizePercentage }} full"
        description: "PVC {{ $labels.persistentvolumeclaim }} in namespace {{ $labels.namespace }} is above 85% capacity"

    - alert: VolumeFull
      expr: |
        (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) > 0.95
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Volume {{ $labels.persistentvolumeclaim }} is {{ $value | humanizePercentage }} full"
        description: "PVC {{ $labels.persistentvolumeclaim }} in namespace {{ $labels.namespace }} is critically full"

    - alert: VolumeInodesNearlyExhausted
      expr: |
        (kubelet_volume_stats_inodes_used / kubelet_volume_stats_inodes) > 0.90
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Volume {{ $labels.persistentvolumeclaim }} inodes {{ $value | humanizePercentage }} used"

  - name: storage-provisioning
    interval: 60s
    rules:
    - alert: HighProvisioningFailureRate
      expr: |
        (
          rate(csi_sidecar_operations_seconds_count{method_name="CreateVolume",grpc_status_code!="OK"}[5m])
          / rate(csi_sidecar_operations_seconds_count{method_name="CreateVolume"}[5m])
        ) > 0.10
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High CSI provisioning failure rate: {{ $value | humanizePercentage }}"

    - alert: SlowVolumeProvisioning
      expr: |
        histogram_quantile(0.99,
          rate(csi_sidecar_operations_seconds_bucket{method_name="CreateVolume"}[5m])
        ) > 60
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Slow volume provisioning: p99 latency is {{ $value }}s"

    - alert: PendingPVCTooLong
      expr: |
        kube_persistentvolumeclaim_status_phase{phase="Pending"} == 1
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "PVC {{ $labels.persistentvolumeclaim }} pending for >15min"

  - name: storage-performance
    interval: 30s
    rules:
    - alert: HighVolumeLatency
      expr: |
        (
          rate(kubelet_volume_stats_read_time_seconds_total[5m])
          / rate(kubelet_volume_stats_read_total[5m])
        ) > 0.1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High read latency on volume {{ $labels.persistentvolumeclaim }}"
        description: "Average read latency is {{ $value }}s"
```

Apply alerts:

```bash
kubectl apply -f storage-alerts.yaml

# Verify alerts loaded
kubectl get prometheusrules -n monitoring storage-alerts
```

## Building Storage Dashboards

Create comprehensive Grafana dashboards for storage monitoring.

```bash
# Import community dashboard
# Dashboard ID: 11454 - Kubernetes Persistent Volumes

# Or create custom dashboard with panels for:
# - Total cluster storage capacity and usage
# - Top volumes by usage percentage
# - Provisioning success rate and latency
# - Volume IOPS and throughput
# - Failed mount operations
# - CSI driver health
```

Key dashboard queries:

```promql
# Cluster-wide storage usage
sum(kubelet_volume_stats_used_bytes) / sum(kubelet_volume_stats_capacity_bytes)

# Storage used by namespace
sum(kubelet_volume_stats_used_bytes) by (namespace)

# Most used volumes
topk(10, kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes)

# Provisioning rate
sum(rate(csi_sidecar_operations_seconds_count{method_name="CreateVolume"}[5m]))
```

## Monitoring CSI Driver Health

Track CSI driver availability and RPC latencies.

```promql
# Driver pods running
count(kube_pod_status_phase{namespace="csi-system",phase="Running"})

# RPC call durations
histogram_quantile(0.99,
  rate(csi_sidecar_operations_seconds_bucket[5m])
)

# RPC error rate
rate(csi_sidecar_operations_seconds_count{grpc_status_code!="OK"}[5m])
```

Comprehensive storage monitoring through CSI metrics and Prometheus enables proactive capacity management and performance optimization. By tracking volume usage, provisioning operations, and I/O performance, you prevent storage-related outages and identify optimization opportunities. The combination of real-time metrics, alerting, and historical trending provides complete visibility into your storage infrastructure.
