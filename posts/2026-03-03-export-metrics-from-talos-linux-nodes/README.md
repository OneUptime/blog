# How to Export Metrics from Talos Linux Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Metrics, Prometheus, Node Exporter, Monitoring

Description: A practical guide to exporting system and Kubernetes metrics from Talos Linux nodes for monitoring and alerting.

---

Monitoring the health of your Talos Linux nodes requires exporting metrics that cover CPU, memory, disk, network, and Kubernetes-specific data points. Unlike traditional Linux distributions where you simply install Prometheus node_exporter as a system package, Talos Linux's immutable design means you need to deploy metric exporters as Kubernetes workloads. The good news is that Talos also exposes its own built-in metrics endpoint, giving you visibility into the operating system without needing to run anything extra.

This guide covers all the ways to get metrics out of your Talos Linux nodes and into your monitoring system.

## Talos Built-in Metrics

Talos Linux exposes a Prometheus-compatible metrics endpoint on each node. This endpoint provides machine-level metrics without requiring any additional software.

The metrics are available through the Talos API:

```bash
# Retrieve raw Prometheus metrics from a Talos node
talosctl -n 192.168.1.10 get metrics

# You can also access metrics through the HTTP endpoint
# The Talos metrics endpoint is typically at port 9100 on the machine
curl -k https://192.168.1.10:9100/metrics
```

These built-in metrics include basic system information like CPU usage, memory utilization, and disk I/O. They provide a baseline level of monitoring without deploying anything into the cluster.

## Deploying Node Exporter

For comprehensive node metrics, deploy the Prometheus node_exporter as a DaemonSet. Node exporter provides detailed metrics for CPU, memory, disk, network interfaces, filesystem usage, and many other subsystems.

The simplest approach is using the Helm chart from the prometheus-community repository:

```bash
# Add the Prometheus community Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create a monitoring namespace
kubectl create namespace monitoring

# Install node-exporter with Talos-compatible settings
helm install node-exporter prometheus-community/prometheus-node-exporter \
  --namespace monitoring \
  --set tolerations[0].operator=Exists \
  --set tolerations[0].effect=NoSchedule \
  --set hostNetwork=true \
  --set hostPID=true
```

For a more customized setup, use a values file:

```yaml
# node-exporter-values.yaml
# Node exporter configuration for Talos Linux
tolerations:
  - operator: Exists
    effect: NoSchedule

hostNetwork: true
hostPID: true
hostRootFsMount:
  enabled: true
  mountPropagation: HostToContainer

# Mount Talos-specific paths for filesystem metrics
extraHostVolumeMounts:
  - name: sys
    hostPath: /sys
    mountPath: /host/sys
    readOnly: true
    mountPropagation: HostToContainer
  - name: root
    hostPath: /
    mountPath: /host/root
    readOnly: true
    mountPropagation: HostToContainer

# Enable collectors relevant for Talos Linux
prometheus:
  monitor:
    enabled: true
    interval: 30s

# Disable collectors that don't work on Talos
extraArgs:
  - --collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/.+)($|/)
  - --collector.netclass.ignored-devices=^(veth.*|cali.*|flannel.*)$
  - --path.rootfs=/host/root
  - --path.sysfs=/host/sys
```

Install with the custom values:

```bash
# Install with Talos-specific configuration
helm install node-exporter prometheus-community/prometheus-node-exporter \
  --namespace monitoring \
  -f node-exporter-values.yaml
```

## Exporting kubelet Metrics

The kubelet on each node exposes its own set of metrics that cover pod lifecycle, container operations, and volume management. On Talos Linux, these are available at the standard kubelet metrics endpoint.

Configure Prometheus to scrape kubelet metrics:

```yaml
# kubelet-servicemonitor.yaml
# ServiceMonitor for scraping kubelet metrics on Talos Linux
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubelet
  namespace: monitoring
  labels:
    release: prometheus
spec:
  endpoints:
    - port: https-metrics
      scheme: https
      tlsConfig:
        insecureSkipVerify: true
      bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
      honorLabels: true
      interval: 30s
      metricRelabelings:
        # Drop high-cardinality metrics to reduce storage
        - sourceLabels: [__name__]
          regex: kubelet_runtime_operations_duration_seconds_bucket
          action: drop
    - port: https-metrics
      scheme: https
      path: /metrics/cadvisor
      tlsConfig:
        insecureSkipVerify: true
      bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
      honorLabels: true
      interval: 30s
  jobLabel: k8s-app
  namespaceSelector:
    matchNames:
      - kube-system
  selector:
    matchLabels:
      k8s-app: kubelet
```

## Exporting etcd Metrics

On control plane nodes, etcd exposes metrics that are critical for monitoring cluster health. Talos Linux configures etcd to listen for metrics on port 2381.

```yaml
# etcd-servicemonitor.yaml
# Monitor etcd metrics on Talos Linux control plane nodes
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: etcd
  namespace: monitoring
spec:
  endpoints:
    - port: metrics
      scheme: http
      interval: 30s
  selector:
    matchLabels:
      component: etcd
```

Alternatively, scrape etcd directly through Prometheus static configuration:

```yaml
# prometheus-etcd-scrape.yaml
# Static scrape config for etcd on Talos nodes
scrape_configs:
  - job_name: 'etcd'
    scheme: http
    static_configs:
      - targets:
          - '192.168.1.10:2381'
          - '192.168.1.11:2381'
          - '192.168.1.12:2381'
    metric_relabel_configs:
      # Keep only the most important etcd metrics
      - source_labels: [__name__]
        regex: 'etcd_(server|disk|network|debugging)_.*'
        action: keep
```

## Exporting kube-state-metrics

While node exporter and kubelet metrics cover the infrastructure layer, kube-state-metrics provides Kubernetes object-level metrics such as deployment replica counts, pod statuses, and resource requests.

```bash
# Install kube-state-metrics
helm install kube-state-metrics prometheus-community/kube-state-metrics \
  --namespace monitoring
```

This deployment does not need special Talos-specific configuration since it reads from the Kubernetes API rather than from node-level resources.

## Creating a Custom Metrics Exporter

If you need to export custom metrics from your Talos cluster, you can build a simple exporter:

```python
# custom_exporter.py
# Simple Prometheus exporter for custom Talos cluster metrics
from prometheus_client import start_http_server, Gauge, Counter
import subprocess
import json
import time

# Define custom metrics
talos_node_health = Gauge(
    'talos_node_health_status',
    'Health status of the Talos node (1=healthy, 0=unhealthy)',
    ['node']
)

talos_service_status = Gauge(
    'talos_service_running',
    'Whether a Talos service is running (1=running, 0=stopped)',
    ['node', 'service']
)

def collect_metrics():
    """Collect metrics from Talos nodes using talosctl."""
    nodes = ['192.168.1.10', '192.168.1.20', '192.168.1.21']

    for node in nodes:
        try:
            # Check node health
            result = subprocess.run(
                ['talosctl', '-n', node, 'health', '--run-timeout', '10s'],
                capture_output=True, text=True, timeout=15
            )
            talos_node_health.labels(node=node).set(
                1 if result.returncode == 0 else 0
            )
        except Exception:
            talos_node_health.labels(node=node).set(0)

if __name__ == '__main__':
    # Start the metrics server on port 9200
    start_http_server(9200)
    print("Custom Talos exporter started on port 9200")

    while True:
        collect_metrics()
        time.sleep(30)
```

## Configuring Prometheus to Scrape All Exporters

Bring everything together with a Prometheus configuration that scrapes all your metric sources:

```yaml
# prometheus-scrape-config.yaml
# Comprehensive scrape configuration for Talos Linux cluster
scrape_configs:
  - job_name: 'node-exporter'
    kubernetes_sd_configs:
      - role: endpoints
    relabel_configs:
      - source_labels: [__meta_kubernetes_endpoints_name]
        regex: node-exporter-prometheus-node-exporter
        action: keep

  - job_name: 'kubelet'
    scheme: https
    tls_config:
      insecure_skip_verify: true
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

  - job_name: 'kube-state-metrics'
    kubernetes_sd_configs:
      - role: endpoints
    relabel_configs:
      - source_labels: [__meta_kubernetes_endpoints_name]
        regex: kube-state-metrics
        action: keep
```

## Verifying Metric Export

After deploying your exporters, verify that metrics are being collected:

```bash
# Check node-exporter pods are running on all nodes
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus-node-exporter -o wide

# Port-forward to test node-exporter metrics
kubectl port-forward -n monitoring svc/node-exporter-prometheus-node-exporter 9100:9100
# Visit http://localhost:9100/metrics

# Check that Prometheus is scraping successfully
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets to see all scrape targets
```

## Key Metrics to Monitor

Once metrics are flowing, here are the most important ones to track for Talos Linux nodes:

```text
# CPU usage by node
node_cpu_seconds_total

# Memory usage
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes

# Disk usage
node_filesystem_avail_bytes / node_filesystem_size_bytes

# Network traffic
node_network_receive_bytes_total
node_network_transmit_bytes_total

# etcd health
etcd_server_has_leader
etcd_disk_wal_fsync_duration_seconds

# Kubelet pod operations
kubelet_running_pods
kubelet_pod_start_duration_seconds
```

Exporting metrics from Talos Linux nodes follows standard Kubernetes patterns with a few adjustments for the immutable host environment. The combination of Talos built-in metrics, node exporter, kubelet metrics, etcd metrics, and kube-state-metrics gives you complete visibility into both the infrastructure and the workloads running on top of it.
