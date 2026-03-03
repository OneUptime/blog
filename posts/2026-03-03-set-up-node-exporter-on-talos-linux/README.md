# How to Set Up Node Exporter on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Node Exporter, Prometheus, Monitoring, Kubernetes, Infrastructure

Description: Learn how to deploy and configure Prometheus Node Exporter on Talos Linux for collecting host-level metrics from your Kubernetes nodes.

---

Node Exporter is a Prometheus exporter that collects hardware and operating system metrics from Linux nodes. It provides detailed information about CPU usage, memory consumption, disk I/O, network traffic, filesystem usage, and many other system-level metrics. On Talos Linux, Node Exporter is particularly important because you cannot SSH into nodes to run diagnostic commands. Node Exporter gives you the visibility into node health that you would otherwise get from command-line tools like top, free, iostat, and df.

This guide covers deploying Node Exporter on a Talos Linux cluster, configuring it for optimal metric collection, and using the data effectively.

## Why Node Exporter on Talos Linux?

Talos Linux is an immutable operating system with no shell access. Traditional monitoring approaches that rely on installing agents directly on the host do not work. Node Exporter solves this problem by running as a Kubernetes DaemonSet - one pod on every node - and exposing system metrics through an HTTP endpoint that Prometheus scrapes.

The metrics Node Exporter collects include:

- CPU utilization and frequency
- Memory usage and availability
- Disk I/O throughput and latency
- Network interface statistics
- Filesystem space and inodes
- System load averages
- OS kernel statistics
- Hardware temperature (when available)

## Prerequisites

You need:

- A Talos Linux cluster
- `kubectl` configured for the cluster
- Prometheus already deployed (or planned)
- Helm 3 installed

```bash
# Verify your cluster
kubectl get nodes
```

## Installing Node Exporter

### Via kube-prometheus-stack

If you are using the kube-prometheus-stack Helm chart, Node Exporter is included by default:

```yaml
# In kube-prometheus-stack values
nodeExporter:
  enabled: true
```

### Standalone Installation

For a standalone Node Exporter deployment:

```bash
# Add the Prometheus community Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Node Exporter
helm install node-exporter prometheus-community/prometheus-node-exporter \
  --namespace monitoring \
  --create-namespace
```

### Manual DaemonSet

For full control, deploy Node Exporter manually:

```yaml
# node-exporter-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    app: node-exporter
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9100"
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.7.0
        args:
        - '--path.procfs=/host/proc'
        - '--path.sysfs=/host/sys'
        - '--path.rootfs=/host/root'
        - '--collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/.+)($|/)'
        - '--collector.netclass.ignored-devices=^(veth.*)$'
        ports:
        - containerPort: 9100
          hostPort: 9100
          name: metrics
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 128Mi
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        - name: root
          mountPath: /host/root
          readOnly: true
          mountPropagation: HostToContainer
      tolerations:
      # Run on all nodes including control plane
      - operator: Exists
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      - name: root
        hostPath:
          path: /
---
apiVersion: v1
kind: Service
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    app: node-exporter
spec:
  type: ClusterIP
  ports:
  - port: 9100
    targetPort: 9100
    name: metrics
  selector:
    app: node-exporter
```

Apply and verify:

```bash
kubectl apply -f node-exporter-daemonset.yaml

# Check that a pod runs on every node
kubectl get pods -n monitoring -l app=node-exporter -o wide

# Verify metrics are accessible
kubectl port-forward -n monitoring svc/node-exporter 9100:9100
curl http://localhost:9100/metrics | head -50
```

## Talos-Specific Mount Configuration

Talos Linux has a different filesystem layout than standard Linux. The key paths are:

```yaml
# Talos filesystem paths
# /proc - Process information (standard)
# /sys - System information (standard)
# / - Root filesystem (read-only on Talos)
# /var - Ephemeral storage
# /system - Talos system partition
# /etc/cni - CNI configuration
```

Node Exporter needs access to host paths to collect accurate metrics. The volume mounts in the DaemonSet configuration above handle this correctly for Talos.

### Filesystem Collector Tuning

Exclude Talos-specific mount points that are not relevant:

```yaml
args:
- '--collector.filesystem.mount-points-exclude=^/(dev|proc|sys|run|var/lib/kubelet/.+|var/lib/containerd/.+|system)($|/)'
- '--collector.filesystem.fs-types-exclude=^(autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tracefs|tmpfs)$'
```

## Configuring Prometheus to Scrape Node Exporter

If you are using the Prometheus Operator, create a ServiceMonitor:

```yaml
# node-exporter-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app: node-exporter
  endpoints:
  - port: metrics
    interval: 15s
    scrapeTimeout: 10s
    metricRelabelings:
    # Drop high-cardinality metrics you don't need
    - sourceLabels: [__name__]
      regex: 'node_scrape_collector_duration_seconds'
      action: drop
```

For standard Prometheus configuration:

```yaml
# In prometheus.yml
scrape_configs:
- job_name: 'node-exporter'
  kubernetes_sd_configs:
  - role: endpoints
  relabel_configs:
  - source_labels: [__meta_kubernetes_endpoints_name]
    regex: node-exporter
    action: keep
```

## Key Metrics from Node Exporter

Here are the most important metrics for monitoring Talos Linux nodes:

### CPU Metrics

```promql
# Overall CPU usage per node
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# CPU usage by mode (user, system, iowait, etc.)
sum by (instance, mode) (rate(node_cpu_seconds_total[5m]))

# System load (1, 5, 15 minute averages)
node_load1
node_load5
node_load15
```

### Memory Metrics

```promql
# Memory usage percentage
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# Available memory in bytes
node_memory_MemAvailable_bytes

# Memory breakdown
node_memory_MemTotal_bytes
node_memory_MemFree_bytes
node_memory_Cached_bytes
node_memory_Buffers_bytes
```

### Disk Metrics

```promql
# Disk usage percentage
(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100

# Disk I/O rates
rate(node_disk_read_bytes_total[5m])
rate(node_disk_written_bytes_total[5m])

# Disk I/O latency
rate(node_disk_read_time_seconds_total[5m]) / rate(node_disk_reads_completed_total[5m])
rate(node_disk_write_time_seconds_total[5m]) / rate(node_disk_writes_completed_total[5m])
```

### Network Metrics

```promql
# Network throughput
rate(node_network_receive_bytes_total{device!="lo"}[5m])
rate(node_network_transmit_bytes_total{device!="lo"}[5m])

# Network errors
rate(node_network_receive_errs_total[5m])
rate(node_network_transmit_errs_total[5m])

# Network packet drops
rate(node_network_receive_drop_total[5m])
rate(node_network_transmit_drop_total[5m])
```

## Setting Up Alerts Based on Node Exporter Metrics

Create alerts for common node issues:

```yaml
# node-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-exporter-alerts
  namespace: monitoring
spec:
  groups:
  - name: node-exporter
    rules:
    - alert: NodeFilesystemAlmostFull
      expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.15
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Filesystem almost full on {{ $labels.instance }}"
        description: "{{ $labels.mountpoint }} has only {{ $value | humanizePercentage }} space left"

    - alert: NodeMemoryPressure
      expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) > 0.9
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Memory pressure on {{ $labels.instance }}"

    - alert: NodeHighNetworkErrors
      expr: rate(node_network_receive_errs_total[5m]) + rate(node_network_transmit_errs_total[5m]) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Network errors on {{ $labels.instance }}"

    - alert: NodeClockSkew
      expr: abs(node_timex_offset_seconds) > 0.05
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Clock skew detected on {{ $labels.instance }}"
```

## Grafana Dashboards for Node Exporter

Import the comprehensive Node Exporter dashboard in Grafana:

1. Go to Dashboards > Import
2. Enter dashboard ID **1860** (Node Exporter Full)
3. Select your Prometheus data source
4. Click Import

This dashboard provides panels for all the major metrics: CPU, memory, disk, network, and more, broken down by node.

## Enabling and Disabling Collectors

Node Exporter has many collectors. You can control which ones are active:

```yaml
args:
# Disable collectors you don't need
- '--no-collector.wifi'
- '--no-collector.nvme'
- '--no-collector.infiniband'
- '--no-collector.zfs'

# Enable specific collectors
- '--collector.systemd'
- '--collector.processes'
```

On Talos Linux, some collectors may not work because of the minimal OS. The default set works well without changes.

## Troubleshooting

```bash
# Check Node Exporter pods
kubectl get pods -n monitoring -l app=node-exporter -o wide

# Check if metrics endpoint is accessible
kubectl exec -n monitoring <NODE_EXPORTER_POD> -- wget -qO- http://localhost:9100/metrics | head -20

# Check which collectors are active
kubectl exec -n monitoring <NODE_EXPORTER_POD> -- wget -qO- http://localhost:9100/metrics | grep "^node_scrape_collector_success"

# Check for collector errors
kubectl logs -n monitoring <NODE_EXPORTER_POD> | grep "error"
```

## Conclusion

Node Exporter on Talos Linux fills a critical gap in observability by providing host-level metrics that you cannot get through other means on an immutable operating system. Running as a DaemonSet, it collects CPU, memory, disk, and network metrics from every node and exposes them for Prometheus to scrape. Combined with well-crafted alerting rules and Grafana dashboards, Node Exporter gives you the same visibility into your Talos Linux nodes that you would have from running diagnostic tools directly on the host, but in a way that is automated, persistent, and queryable.
