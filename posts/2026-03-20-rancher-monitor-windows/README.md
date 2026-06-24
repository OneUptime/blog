# How to Monitor Windows Nodes in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, Monitoring, Prometheus, Node Exporter

Description: Set up monitoring for Windows nodes in Rancher using Windows Exporter, Prometheus, and Grafana dashboards for comprehensive Windows node observability.

## Introduction

Monitoring Windows nodes in Kubernetes requires Windows-specific exporters since the standard Linux Node Exporter doesn't run on Windows. The Windows Exporter (formerly wmi_exporter) collects Windows performance metrics for Prometheus. On Rancher Monitoring V2 with RKE1 Windows clusters, Rancher can deploy windows_exporter automatically; this guide covers the manual HostProcess DaemonSet approach when you need to deploy or customize it yourself, along with Grafana dashboards.

## Prerequisites

- Rancher cluster with Windows worker nodes
- Rancher Monitoring (Prometheus Operator) installed
- Windows HostProcess container support on the cluster with containerd on Windows nodes
- For Rancher-managed RKE1 Windows clusters, `wins` v0.1.0+ on Windows hosts if you want Monitoring V2 to deploy windows_exporter automatically
- kubectl access to the cluster

## Step 1: Deploy Windows Exporter DaemonSet

```yaml
# windows-exporter-daemonset.yaml - Deploy Windows Exporter on Windows nodes as a HostProcess DaemonSet

apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: windows-exporter
  namespace: cattle-monitoring-system
  labels:
    app: windows-exporter
spec:
  selector:
    matchLabels:
      app: windows-exporter
  template:
    metadata:
      labels:
        app: windows-exporter
    spec:
      os:
        name: windows
      securityContext:
        windowsOptions:
          hostProcess: true
          runAsUserName: "NT AUTHORITY\\SYSTEM"
      hostNetwork: true
      nodeSelector:
        kubernetes.io/os: windows

      tolerations:
        - key: os
          operator: Equal
          value: windows
          effect: NoSchedule

      initContainers:
        - name: configure-firewall
          image: mcr.microsoft.com/powershell:lts-nanoserver-1809
          command: ["powershell"]
          args:
            - New-NetFirewallRule
            - -DisplayName
            - windows-exporter
            - -Direction
            - inbound
            - -Profile
            - Any
            - -Action
            - Allow
            - -LocalPort
            - "9182"
            - -Protocol
            - TCP

      containers:
        - name: windows-exporter
          image: ghcr.io/prometheus-community/windows-exporter:0.31.6
          imagePullPolicy: IfNotPresent
          args:
            - --config.file=%CONTAINER_SANDBOX_MOUNT_POINT%/config.yml
          ports:
            - name: http
              containerPort: 9182
              hostPort: 9182
              protocol: TCP
          volumeMounts:
            - name: windows-exporter-config
              mountPath: /config.yml
              subPath: config.yml
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
      volumes:
        - name: windows-exporter-config
          configMap:
            name: windows-exporter-config
```

## Step 2: Create ConfigMap for Windows Exporter

```yaml
# windows-exporter-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: windows-exporter-config
  namespace: cattle-monitoring-system
  labels:
    app: windows-exporter
data:
  config.yml: |
    collectors:
      enabled: '[defaults],container'
    collector:
      service:
        include: "containerd|kubelet"
```

## Step 3: Configure PodMonitor for Scraping

```yaml
# windows-exporter-podmonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: windows-exporter
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  namespaceSelector:
    matchNames:
      - cattle-monitoring-system
  selector:
    matchLabels:
      app: windows-exporter
  podMetricsEndpoints:
    - port: http
      scheme: http
      path: /metrics
      interval: 30s
      # Use the Windows node name for Prometheus target labels
      relabelings:
        - sourceLabels: [__meta_kubernetes_pod_node_name]
          targetLabel: node
        - sourceLabels: [__meta_kubernetes_pod_node_name]
          targetLabel: instance
```

## Step 4: Create Windows-Specific Alerts

```yaml
# windows-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: windows-node-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: windows.nodes
      rules:
        # High CPU usage
        - alert: WindowsHighCPU
          expr: |
            100 - (avg by (instance) (rate(windows_cpu_time_total{mode="idle"}[5m])) * 100) > 90
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Windows node {{ $labels.instance }} CPU > 90%"

        # Low memory
        - alert: WindowsLowMemory
          expr: |
            windows_memory_physical_free_bytes /
            windows_memory_physical_total_bytes * 100 < 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Windows node {{ $labels.instance }} memory < 10% free"

        # Disk space low
        - alert: WindowsLowDiskSpace
          expr: |
            100 - (windows_logical_disk_free_bytes{volume="C:"} /
            windows_logical_disk_size_bytes{volume="C:"} * 100) > 85
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Windows node {{ $labels.instance }} C: drive > 85% full"

        # Windows service down
        - alert: WindowsServiceDown
          expr: |
            windows_service_state{name=~"containerd|kubelet",state="running"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Required Windows service {{ $labels.name }} not running on {{ $labels.instance }}"
```

## Step 5: Key Prometheus Queries for Windows Nodes

```promql
# CPU usage per Windows node
100 - (avg by (instance) (
  rate(windows_cpu_time_total{mode="idle"}[5m])
) * 100)

# Memory usage percentage
(1 - windows_memory_physical_free_bytes /
windows_memory_physical_total_bytes) * 100

# Disk I/O read bytes/sec
rate(windows_logical_disk_read_bytes_total{volume="C:"}[5m])

# Network throughput per Windows node
sum by (instance) (
  rate(windows_net_bytes_received_total[5m]) +
  rate(windows_net_bytes_sent_total[5m])
)

# Container CPU usage on Windows
sum by (namespace, pod, container) (
  rate(windows_container_cpu_usage_seconds_total[5m])
)

# Container memory usage
sum by (namespace, pod, container) (
  windows_container_memory_usage_private_working_set_bytes
)
```

## Step 6: Import Grafana Dashboard

```bash
# Import pre-built Windows Exporter dashboard
# Dashboard ID: 14694 (Windows Exporter Dashboard)

# Or create a custom dashboard shell via Grafana API
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -d '{
    "dashboard": {
      "id": null,
      "uid": null,
      "title": "Rancher Windows Nodes",
      "tags": ["windows"],
      "timezone": "browser",
      "schemaVersion": 16,
      "refresh": "30s"
    },
    "overwrite": true
  }' \
  "https://<grafana-url>/api/dashboards/db"
```

## Step 7: Monitor Windows Container Metrics

```promql
# Windows container CPU (per container)
sum by (namespace, pod, container) (
  rate(windows_container_cpu_usage_seconds_total[5m])
)

# Container restarts on Windows pods
(
  kube_pod_container_status_restarts_total
  * on(namespace, pod, uid) group_left(node)
  kube_pod_info
)
and on(node)
kube_node_info{os_image=~".*Windows.*"}
```

## Conclusion

Monitoring Windows nodes in Rancher requires windows_exporter as a bridge between Windows performance counters and Prometheus. On Rancher Monitoring V2 for RKE1 Windows clusters, Rancher can deploy it automatically; otherwise, a HostProcess DaemonSet and PodMonitor like the manifests above provide the supported manual path. Combined with a Windows Exporter Grafana dashboard and targeted alerts, you get comparable node-level observability for Windows workers. Ensure the DaemonSet tolerates your Windows node taints so it deploys on every Windows worker.
