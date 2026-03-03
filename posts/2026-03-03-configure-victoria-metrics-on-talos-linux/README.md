# How to Configure Victoria Metrics on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Victoria Metrics, Monitoring, Kubernetes, Prometheus, Time Series Database

Description: A hands-on guide to deploying and configuring Victoria Metrics as a high-performance metrics backend on Talos Linux Kubernetes clusters.

---

Victoria Metrics is a fast, cost-effective time series database that serves as a drop-in replacement for Prometheus storage. If you are running Kubernetes on Talos Linux and finding that Prometheus struggles with high cardinality data or consumes too much memory, Victoria Metrics is worth considering. It handles the same PromQL queries, accepts the same remote write protocol, and does it all using significantly less RAM and disk space. In this guide, we will deploy Victoria Metrics on a Talos Linux cluster and configure Prometheus to send data to it.

## Why Victoria Metrics Over Stock Prometheus

Prometheus stores data locally on disk in its TSDB format. This works well for small to medium clusters, but as your cluster grows and you add more metrics, Prometheus can become a resource hog. Victoria Metrics addresses this with:

- **Lower memory usage**: Typically 3 to 7 times less RAM than Prometheus for the same data set
- **Better compression**: Data on disk takes up less space thanks to more aggressive compression
- **Higher ingestion rates**: Can handle millions of samples per second on modest hardware
- **Long-term retention**: Designed to keep data for months or years without performance degradation
- **PromQL compatibility**: Supports PromQL queries with some extensions (MetricsQL)

## Architecture Options

Victoria Metrics comes in two flavors:

1. **Single-node**: One binary that handles ingestion, storage, and querying. Best for clusters with fewer than 10 million active time series.
2. **Cluster version**: Separate components for ingestion (vminsert), storage (vmstorage), and querying (vmselect). Scales horizontally for large deployments.

We will cover both options, starting with single-node since it is simpler and sufficient for most Talos Linux clusters.

## Option A: Single-Node Victoria Metrics

### Step 1: Deploy Victoria Metrics Single-Node

```bash
# Add the Victoria Metrics Helm repository
helm repo add vm https://victoriametrics.github.io/helm-charts/
helm repo update
```

Create a values file:

```yaml
# victoria-metrics-single-values.yaml
server:
  # Resource allocation
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2000m
      memory: 2Gi

  # Persistent storage
  persistentVolume:
    enabled: true
    size: 100Gi
    storageClass: ""  # Use default storage class

  # Retention period
  retentionPeriod: "6"  # 6 months

  # Extra flags for performance tuning
  extraArgs:
    # Memory limit for merge operations
    envflag.enable: "true"
    envflag.prefix: VM_
    # Deduplication interval (useful when multiple Prometheus instances write)
    dedup.minScrapeInterval: "15s"
    # Maximum query duration
    search.maxQueryDuration: "120s"

  # Scrape configuration - scrape Kubernetes metrics directly
  scrape:
    enabled: true
    config:
      scrape_configs:
        - job_name: "kubernetes-apiservers"
          kubernetes_sd_configs:
            - role: endpoints
          scheme: https
          tls_config:
            ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
          bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
          relabel_configs:
            - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
              action: keep
              regex: default;kubernetes;https
```

Install Victoria Metrics:

```bash
helm install victoria-metrics vm/victoria-metrics-single \
  --namespace monitoring \
  --values victoria-metrics-single-values.yaml
```

### Step 2: Configure Prometheus to Remote Write

If you are keeping Prometheus for scraping and using Victoria Metrics only for storage, configure Prometheus to forward metrics via remote write:

```yaml
# Update your kube-prometheus-stack values
prometheus:
  prometheusSpec:
    # Reduce local retention since VM handles long-term storage
    retention: 2h
    remoteWrite:
      - url: "http://victoria-metrics-server.monitoring.svc.cluster.local:8428/api/v1/write"
        # Queue configuration for reliable delivery
        queueConfig:
          maxSamplesPerSend: 10000
          capacity: 20000
          maxShards: 30
```

Upgrade your Prometheus installation:

```bash
helm upgrade prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-remote-write-values.yaml
```

### Step 3: Point Grafana to Victoria Metrics

Add Victoria Metrics as a Prometheus-compatible data source in Grafana:

```yaml
# grafana-vm-datasource.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-vm-datasource
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  vm-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: VictoriaMetrics
        type: prometheus
        access: proxy
        url: http://victoria-metrics-server.monitoring.svc.cluster.local:8428
        isDefault: true
```

```bash
kubectl apply -f grafana-vm-datasource.yaml
```

## Option B: Victoria Metrics Cluster

For larger Talos Linux deployments, the cluster version provides horizontal scalability.

### Deploy the Cluster Version

```yaml
# victoria-metrics-cluster-values.yaml
vminsert:
  replicaCount: 2
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  extraArgs:
    # Replication factor
    replicationFactor: "2"

vmselect:
  replicaCount: 2
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  # Cache directory for faster queries
  cacheMountPath: /cache
  persistentVolume:
    enabled: true
    size: 10Gi

vmstorage:
  replicaCount: 3
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2000m
      memory: 2Gi
  persistentVolume:
    enabled: true
    size: 100Gi
  # Retention period
  retentionPeriod: "12"  # 12 months
```

Install the cluster:

```bash
helm install victoria-metrics-cluster vm/victoria-metrics-cluster \
  --namespace monitoring \
  --values victoria-metrics-cluster-values.yaml
```

For the cluster version, update the remote write and Grafana URLs:

```yaml
# Remote write URL for the cluster version
remoteWrite:
  - url: "http://victoria-metrics-cluster-vminsert.monitoring.svc.cluster.local:8480/insert/0/prometheus/api/v1/write"

# Grafana data source URL for the cluster version
# http://victoria-metrics-cluster-vmselect.monitoring.svc.cluster.local:8481/select/0/prometheus
```

## Using VMAgent as a Drop-In Prometheus Replacement

Victoria Metrics also provides vmagent, a lightweight metrics scraper that can replace Prometheus entirely for scraping:

```yaml
# vmagent-values.yaml
remoteWriteUrls:
  - "http://victoria-metrics-server.monitoring.svc.cluster.local:8428/api/v1/write"

# Resource-efficient scraping configuration
config:
  global:
    scrape_interval: 30s

  scrape_configs:
    - job_name: "kubernetes-nodes"
      kubernetes_sd_configs:
        - role: node
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
        - action: labelmap
          regex: __meta_kubernetes_node_label_(.+)

    - job_name: "kubernetes-pods"
      kubernetes_sd_configs:
        - role: pod
      relabel_configs:
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
          action: keep
          regex: true
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
          action: replace
          target_label: __metrics_path__
          regex: (.+)
```

```bash
helm install vmagent vm/victoria-metrics-agent \
  --namespace monitoring \
  --values vmagent-values.yaml
```

## Monitoring Victoria Metrics Itself

Victoria Metrics exposes its own metrics at the `/metrics` endpoint. Key metrics to watch:

```promql
# Ingestion rate (samples per second)
rate(vm_rows_inserted_total[5m])

# Query duration
histogram_quantile(0.99, rate(vm_request_duration_seconds_bucket[5m]))

# Memory usage
process_resident_memory_bytes{job="victoria-metrics"}

# Disk usage
vm_data_size_bytes
```

## Performance Comparison on Talos Linux

In a typical Talos Linux cluster with 50 nodes and 500 pods, you can expect these rough comparisons:

| Metric | Prometheus | Victoria Metrics |
|--------|-----------|-----------------|
| RAM usage | 8-12 GB | 2-3 GB |
| Disk usage (30 days) | 60 GB | 15-20 GB |
| Query latency (p99) | 2-5s | 0.5-1.5s |
| Ingestion rate | 500K samples/s | 2M samples/s |

These numbers vary based on workload, but the general trend holds. Victoria Metrics is significantly more resource-efficient.

## Conclusion

Victoria Metrics is an excellent choice for Talos Linux clusters that need efficient, long-term metrics storage. Whether you go with the single-node version for simplicity or the cluster version for scale, the setup integrates smoothly with your existing Prometheus and Grafana stack. The lower resource consumption is particularly valuable on Talos Linux where every byte counts on the immutable OS. Start with the single-node deployment and the Prometheus remote write setup - that gives you the best of both worlds with minimal disruption to your existing monitoring pipeline.
