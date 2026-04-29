# How to Monitor Windows Nodes in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Windows Monitoring, Prometheus, Windows Exporter, Grafana, Kubernetes

Description: Monitor Windows worker nodes in Rancher using windows_exporter, Prometheus ServiceMonitors, and Grafana dashboards for node-level metrics.

## Introduction

Monitoring Windows nodes requires a Windows-specific metrics exporter since the standard node_exporter doesn't run on Windows. The `windows_exporter` (formerly wmi_exporter) exposes CPU, memory, disk, and Windows-specific metrics in Prometheus format.

## Step 1: Install windows_exporter via DaemonSet

```yaml
# windows-exporter-ds.yaml

apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: windows-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: windows-exporter
  template:
    metadata:
      labels:
        app: windows-exporter
    spec:
      hostNetwork: true
      securityContext:
        windowsOptions:
          hostProcess: true
          runAsUserName: "NT AUTHORITY\\SYSTEM"
      nodeSelector:
        kubernetes.io/os: windows    # Only run on Windows nodes
      tolerations:
        - key: os
          operator: Equal
          value: windows
          effect: NoSchedule
      containers:
        - name: windows-exporter
          image: ghcr.io/prometheus-community/windows-exporter:latest
          args:
            - --collectors.enabled=cpu,cpu_info,logical_disk,memory,net,os,service,system
          ports:
            - containerPort: 9182
              name: metrics
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
```

## Step 2: Create a ServiceMonitor

```yaml
# windows-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: windows-exporter
  namespace: monitoring
  labels:
    release: monitoring
spec:
  selector:
    matchLabels:
      app: windows-exporter
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

## Step 3: Create a Windows Node Service

```yaml
# windows-exporter-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: windows-exporter
  namespace: monitoring
  labels:
    app: windows-exporter
spec:
  selector:
    app: windows-exporter
  ports:
    - name: metrics
      port: 9182
      targetPort: 9182
```

## Step 4: Import Grafana Dashboard

Import the official Windows Node dashboard from Grafana.com (Dashboard ID: `14694`) which includes:
- CPU usage per core
- Memory usage and available
- Disk I/O and space
- Network throughput
- Windows service states

## Step 5: Set Up Windows-Specific Alerts

```yaml
# windows-alerts.yaml
groups:
  - name: windows-nodes
    rules:
      - alert: WindowsNodeHighCPU
        expr: |
          100 - (avg by (instance) (
            rate(windows_cpu_time_total{mode="idle"}[5m])
          ) * 100) > 90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Windows node CPU is high"

      - alert: WindowsNodeLowMemory
        expr: |
          windows_memory_available_bytes
          / windows_memory_physical_total_bytes * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Windows node memory critically low"

      - alert: WindowsServiceDown
        expr: |
          windows_service_state{state="stopped"} == 1
          and on(instance, name) windows_service_start_mode{start_mode="auto"} == 1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Windows auto-start service stopped on {{ $labels.instance }}"
```

## Conclusion

Monitoring Windows nodes in Rancher requires deploying `windows_exporter` as a DaemonSet with Windows-specific node selectors. The exporter provides rich Windows performance counters through Prometheus, enabling consistent monitoring dashboards across Linux and Windows nodes in mixed clusters.
