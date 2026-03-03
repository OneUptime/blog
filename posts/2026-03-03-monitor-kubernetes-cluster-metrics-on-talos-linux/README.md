# How to Monitor Kubernetes Cluster Metrics on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Monitoring, Prometheus, Grafana, Cluster Metrics

Description: Learn how to set up comprehensive Kubernetes cluster monitoring on Talos Linux using Prometheus, Grafana, and built-in metrics endpoints.

---

Running a Kubernetes cluster on Talos Linux gives you a secure, immutable operating system that is purpose-built for containers. But without proper monitoring, you are flying blind. You need visibility into node health, pod performance, resource consumption, and cluster-wide trends. In this guide, we will walk through setting up a complete monitoring stack on Talos Linux so you can keep your cluster healthy and catch problems before they become outages.

## Why Monitoring Matters on Talos Linux

Talos Linux is different from traditional Linux distributions. There is no SSH access, no shell, and no package manager. Everything is managed through the Talos API. This means you cannot just log into a node and run `top` or `htop` to see what is happening. You need a proper monitoring pipeline that collects metrics automatically and presents them in a usable format.

The good news is that Talos Linux exposes Kubernetes and system-level metrics through standard endpoints, making it straightforward to integrate with tools like Prometheus and Grafana.

## Understanding the Metrics Landscape

Before diving into setup, let us understand what metrics are available on a Talos Linux cluster:

- **Node-level metrics**: CPU usage, memory consumption, disk I/O, network throughput
- **Kubernetes control plane metrics**: API server latency, etcd performance, scheduler queue depth
- **Pod and container metrics**: Resource requests vs actual usage, restart counts, OOM kills
- **Talos-specific metrics**: Available through the Talos API on each node

## Step 1: Deploy the Prometheus Stack

The easiest way to get started is with the kube-prometheus-stack Helm chart. This deploys Prometheus, Grafana, Alertmanager, and a set of pre-configured dashboards and recording rules.

First, add the Helm repository:

```bash
# Add the prometheus-community Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

Create a values file tailored for Talos Linux:

```yaml
# prometheus-values.yaml
prometheus:
  prometheusSpec:
    # Retain metrics for 15 days
    retention: 15d
    # Allocate storage for metrics persistence
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
    # Scrape all service monitors across namespaces
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false

grafana:
  # Enable persistent storage for dashboards
  persistence:
    enabled: true
    size: 10Gi
  # Set admin password (change this)
  adminPassword: "your-secure-password"

# Enable node exporter for host-level metrics
nodeExporter:
  enabled: true

# Enable kube-state-metrics for Kubernetes object metrics
kubeStateMetrics:
  enabled: true
```

Install the stack:

```bash
# Create a dedicated namespace for monitoring
kubectl create namespace monitoring

# Install the kube-prometheus-stack
helm install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-values.yaml
```

## Step 2: Configure Talos-Specific Metrics Collection

Talos Linux nodes expose metrics on port 10250 through the kubelet. However, Talos also provides its own metrics endpoint. To scrape Talos-specific metrics, you need to create a ServiceMonitor or configure additional scrape targets.

Create a Prometheus additional scrape configuration:

```yaml
# talos-scrape-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: additional-scrape-configs
  namespace: monitoring
stringData:
  additional-scrape-configs.yaml: |
    - job_name: 'talos-nodes'
      static_configs:
        - targets:
          - '10.0.0.10:10250'
          - '10.0.0.11:10250'
          - '10.0.0.12:10250'
      scheme: https
      tls_config:
        insecure_skip_verify: true
      # Use the service account token for authentication
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
```

Apply the secret and update your Prometheus configuration to reference it:

```bash
# Apply the additional scrape config
kubectl apply -f talos-scrape-config.yaml
```

## Step 3: Set Up Node Exporter DaemonSet

The kube-prometheus-stack includes node-exporter, but on Talos Linux you may need to adjust the configuration since the filesystem layout differs from standard Linux distributions.

```yaml
# node-exporter-overrides.yaml
nodeExporter:
  enabled: true
  hostRootFsMount:
    # Talos uses /rootfs for the host filesystem
    enabled: true
    mountPropagation: HostToContainer
  extraArgs:
    # Exclude filesystem types that are not relevant on Talos
    - --collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/.+)($|/)
    - --collector.filesystem.fs-types-exclude=^(autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tracefs)$
```

## Step 4: Deploy kube-state-metrics

kube-state-metrics generates metrics about the state of Kubernetes objects. It tells you how many pods are running, pending, or failed, how many deployments have their desired replica count, and much more.

The kube-prometheus-stack includes this by default, but here is how to verify it is working:

```bash
# Check that kube-state-metrics is running
kubectl get pods -n monitoring -l app.kubernetes.io/name=kube-state-metrics

# Verify metrics are being collected
kubectl port-forward -n monitoring svc/prometheus-stack-kube-state-metrics 8080:8080
# Then visit http://localhost:8080/metrics in your browser
```

## Step 5: Set Up Grafana Dashboards

Grafana comes pre-loaded with dashboards when you install the kube-prometheus-stack. But you will want to add some Talos-specific views. Here are the key dashboards to configure:

```yaml
# grafana-dashboards-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: talos-dashboards
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  talos-overview.json: |
    {
      "dashboard": {
        "title": "Talos Linux Cluster Overview",
        "panels": [
          {
            "title": "Node CPU Usage",
            "type": "timeseries",
            "targets": [
              {
                "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
              }
            ]
          },
          {
            "title": "Node Memory Usage",
            "type": "timeseries",
            "targets": [
              {
                "expr": "(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100"
              }
            ]
          },
          {
            "title": "Pod Count by Node",
            "type": "stat",
            "targets": [
              {
                "expr": "count by (node) (kube_pod_info)"
              }
            ]
          }
        ]
      }
    }
```

Apply the dashboard:

```bash
kubectl apply -f grafana-dashboards-configmap.yaml
```

## Step 6: Verify Your Monitoring Stack

Once everything is deployed, run through these checks to make sure metrics are flowing:

```bash
# Check all monitoring pods are running
kubectl get pods -n monitoring

# Port-forward to Grafana
kubectl port-forward -n monitoring svc/prometheus-stack-grafana 3000:80

# Port-forward to Prometheus UI
kubectl port-forward -n monitoring svc/prometheus-stack-kube-prometheus-prometheus 9090:9090
```

Open Grafana at http://localhost:3000 and check the pre-built dashboards. You should see data flowing for:

- Kubernetes cluster overview
- Node resource usage
- Pod CPU and memory consumption
- API server request rates and latencies

## Key Metrics to Watch

Here are the most important metrics to track on a Talos Linux cluster:

1. **Node readiness**: `kube_node_status_condition{condition="Ready",status="true"}` should equal the number of nodes in your cluster.
2. **CPU saturation**: `node_load15 / count(node_cpu_seconds_total{mode="idle"}) by (instance)` should stay below 1.0.
3. **Memory pressure**: `(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100` should stay below 85%.
4. **Disk usage**: `(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100` should stay below 80%.
5. **Pod restart count**: `increase(kube_pod_container_status_restarts_total[1h])` spikes indicate application issues.

## Using talosctl for Quick Checks

While Prometheus gives you historical data and dashboards, you can also use `talosctl` for real-time spot checks:

```bash
# Check node resource usage
talosctl stats --nodes 10.0.0.10

# View system processes
talosctl processes --nodes 10.0.0.10

# Check disk usage
talosctl usage --nodes 10.0.0.10 /
```

## Conclusion

Monitoring a Kubernetes cluster on Talos Linux follows the same patterns as any Kubernetes cluster, with a few tweaks for the immutable OS. The kube-prometheus-stack gives you a solid foundation with Prometheus, Grafana, and pre-built dashboards. Add Talos-specific scrape targets and dashboards, and you will have full visibility into your cluster's health. The key is to set this up early, before you need it, so when something goes wrong you have the data to diagnose it quickly.
