# How to Monitor Windows Container Workloads Deployed by Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Windows Containers, Monitoring, Prometheus, Grafana, GitOps

Description: Set up monitoring for Windows container workloads deployed by Flux CD, covering Windows-specific metrics, log collection, and alerting.

---

## Introduction

Monitoring Windows containers in Kubernetes requires adapting the standard Linux-focused observability stack to account for Windows-specific metrics, event sources, and monitoring agents. Many popular monitoring tools - including the kube-prometheus-stack - have added Windows support, but require specific configuration to work correctly with Windows nodes.

Flux CD manages the monitoring stack itself through GitOps, ensuring that monitoring components are consistently deployed alongside the workloads they observe. This guide covers deploying Windows-compatible monitoring agents via Flux, configuring Prometheus to scrape Windows metrics, collecting Windows Event Log entries with Fluent Bit, and building Grafana dashboards that accurately represent Windows workload health.

## Prerequisites

- Kubernetes cluster with Windows nodes and Linux monitoring nodes
- Flux CD managing the cluster
- Prometheus and Grafana deployed on Linux nodes
- `kubectl` and `flux` CLI tools

## Step 1: Deploy Windows Exporter for Node Metrics

The `windows_exporter` (formerly `wmi_exporter`) is the Prometheus exporter for Windows node metrics.

```yaml
# infrastructure/monitoring/windows-exporter/daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: windows-exporter
  namespace: monitoring
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
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9182"
        prometheus.io/path: "/metrics"
    spec:
      nodeSelector:
        kubernetes.io/os: windows

      tolerations:
        - key: os
          value: windows
          operator: Equal
          effect: NoSchedule

      containers:
        - name: windows-exporter
          image: ghcr.io/prometheus-community/windows-exporter:latest
          imagePullPolicy: IfNotPresent
          args:
            - --collectors.enabled
            # Enable relevant collectors for Kubernetes workloads
            - "cpu,cs,logical_disk,memory,net,os,process,service,system,container"
          ports:
            - containerPort: 9182
              name: metrics
              protocol: TCP
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
          securityContext:
            windowsOptions:
              runAsUserName: "ContainerAdministrator"
```

## Step 2: Configure Prometheus to Scrape Windows Nodes

```yaml
# infrastructure/monitoring/prometheus/windows-scrape-config.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: windows-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: windows-exporter
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
      # Windows metrics may take longer to collect
      scrapeTimeout: 25s
      # Relabel to add windows OS label
      relabelings:
        - targetLabel: os
          replacement: windows
        - sourceLabels: [__meta_kubernetes_node_name]
          targetLabel: node
```

## Step 3: Collect Windows Container Logs with Fluent Bit

```yaml
# infrastructure/monitoring/fluent-bit/windows-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit-windows
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: fluent-bit-windows
  template:
    metadata:
      labels:
        app: fluent-bit-windows
    spec:
      nodeSelector:
        kubernetes.io/os: windows

      tolerations:
        - key: os
          value: windows
          operator: Equal
          effect: NoSchedule

      containers:
        - name: fluent-bit
          # Use the Windows-specific Fluent Bit image
          image: cr.fluentbit.io/fluent/fluent-bit:windows-amd64-latest
          imagePullPolicy: IfNotPresent
          volumeMounts:
            - name: fluent-bit-config
              mountPath: C:\fluent-bit\conf
            - name: varlog
              mountPath: C:\var\log
              readOnly: true
            # Windows container log path
            - name: containerlog
              mountPath: C:\ProgramData\Docker\containers
              readOnly: true

          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi

      volumes:
        - name: fluent-bit-config
          configMap:
            name: fluent-bit-windows-config
        - name: varlog
          hostPath:
            path: C:\var\log
        - name: containerlog
          hostPath:
            path: C:\ProgramData\Docker\containers
```

```yaml
# Fluent Bit Windows configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-windows-config
  namespace: monitoring
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info

    [INPUT]
        Name              tail
        Path              C:\var\log\containers\*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     5MB

    [INPUT]
        # Collect Windows Event Logs
        Name          winlog
        Channels      Application,System,Security
        Interval_Sec  1

    [OUTPUT]
        Name            loki
        Match           *
        Host            loki.monitoring.svc.cluster.local
        Port            3100
        Labels          job=fluent-bit,os=windows,node=${NODE_NAME}
```

## Step 4: Create Windows-Specific Grafana Dashboards

```yaml
# infrastructure/monitoring/grafana/dashboards/windows-workloads.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: windows-workloads-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  windows-workloads.json: |
    {
      "title": "Windows Container Workloads",
      "panels": [
        {
          "title": "Windows Pod CPU Usage",
          "type": "timeseries",
          "targets": [
            {
              "expr": "sum(rate(container_cpu_usage_seconds_total{node=~'windows.*'}[5m])) by (pod, namespace)",
              "legendFormat": "{{namespace}}/{{pod}}"
            }
          ]
        },
        {
          "title": "Windows Node Memory Available",
          "type": "timeseries",
          "targets": [
            {
              "expr": "windows_memory_available_bytes{job='windows-exporter'}",
              "legendFormat": "{{node}}"
            }
          ]
        },
        {
          "title": "Windows Service Status",
          "type": "table",
          "targets": [
            {
              "expr": "windows_service_state{state='running',job='windows-exporter'} == 1",
              "legendFormat": "{{node}} - {{name}}"
            }
          ]
        },
        {
          "title": "IIS Requests per Second",
          "type": "timeseries",
          "targets": [
            {
              "expr": "rate(windows_iis_requests_total{job='windows-exporter'}[1m])",
              "legendFormat": "{{node}} - {{site}}"
            }
          ]
        }
      ]
    }
```

## Step 5: Configure Windows-Specific Alerts

```yaml
# infrastructure/monitoring/prometheus/windows-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: windows-container-alerts
  namespace: monitoring
spec:
  groups:
    - name: windows.containers
      rules:
        - alert: WindowsPodHighMemory
          expr: |
            container_memory_working_set_bytes{node=~"windows-.*"}
            / container_spec_memory_limit_bytes{node=~"windows-.*"} > 0.85
          for: 5m
          labels:
            severity: warning
            os: windows
          annotations:
            summary: "Windows pod {{ $labels.pod }} memory usage above 85%"

        - alert: WindowsNodeDiskFull
          expr: |
            (windows_logical_disk_free_bytes{volume="C:"} /
            windows_logical_disk_size_bytes{volume="C:"}) < 0.10
          for: 5m
          labels:
            severity: critical
            os: windows
          annotations:
            summary: "Windows node {{ $labels.node }} C: drive less than 10% free"

        - alert: WindowsPodNotReady
          expr: |
            kube_pod_status_ready{condition="false",namespace=~"windows-.*"} == 1
          for: 10m
          labels:
            severity: warning
            os: windows
          annotations:
            summary: "Windows pod {{ $labels.pod }} not ready for 10+ minutes"

        - alert: IISApplicationPoolDown
          expr: |
            windows_iis_current_application_pool_state{state!="Running"} == 1
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "IIS application pool {{ $labels.app }} is not running"
```

## Step 6: Deploy Monitoring Stack via Flux

```yaml
# clusters/production/monitoring-windows.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring-windows
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/monitoring/windows-components
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: monitoring-base    # Prometheus must exist first
    - name: windows-workloads  # Monitor after workloads are deployed
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: windows-exporter
      namespace: monitoring
    - apiVersion: apps/v1
      kind: DaemonSet
      name: fluent-bit-windows
      namespace: monitoring
```

## Best Practices

- Deploy `windows-exporter` as a DaemonSet targeting Windows nodes to get per-node metrics.
- Use the Windows-specific Fluent Bit image - the Linux image will not run on Windows nodes.
- Configure IIS-specific metrics collection (requests per second, application pool state) for web workloads.
- Set `scrapeTimeout` generously in ServiceMonitors - Windows metrics collection can be slower than Linux.
- Build separate Grafana dashboards for Windows workloads with Windows-specific metrics panels.
- Monitor Windows Event Log for application crashes and service failures alongside container stdout/stderr.

## Conclusion

Monitoring Windows container workloads with Flux CD requires deploying Windows-specific monitoring agents - `windows-exporter` and Windows Fluent Bit - alongside the workloads they observe. By managing the monitoring stack through the same GitOps workflow as the applications, Flux ensures monitoring is consistently deployed and configured. Windows-specific Prometheus metrics, event log collection, and targeted alerting rules give you comprehensive visibility into the health of your Windows workload portfolio.
