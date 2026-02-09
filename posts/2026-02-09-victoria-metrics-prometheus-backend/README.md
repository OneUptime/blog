# How to Deploy Victoria Metrics as a Prometheus-Compatible Backend for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VictoriaMetrics, Prometheus, Kubernetes, Metrics, Observability

Description: Learn how to deploy VictoriaMetrics as a drop-in replacement for Prometheus with better resource efficiency, long-term storage, and PromQL compatibility.

---

VictoriaMetrics offers a Prometheus-compatible metrics backend that uses significantly less memory and storage than Prometheus while supporting the same PromQL query language. It provides long-term storage without complex federation setups.

This guide covers deploying VictoriaMetrics in Kubernetes as a Prometheus replacement or companion.

## Understanding VictoriaMetrics Architecture

VictoriaMetrics comes in two deployment modes:

**Single-node**: All-in-one binary for smaller deployments (up to millions of active series)
**Cluster**: Distributed components for massive scale (billions of series)

Key advantages:

- 7-10x less RAM than Prometheus
- 7x less storage due to better compression
- Native long-term storage (years of retention)
- Full PromQL compatibility
- Prometheus remote_write support
- Built-in de-duplication and downsampling

## Deploying Single-Node VictoriaMetrics

For most Kubernetes clusters, single-node mode provides excellent performance:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: victoriametrics
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: victoriametrics
  namespace: victoriametrics
spec:
  serviceName: victoriametrics
  replicas: 1
  selector:
    matchLabels:
      app: victoriametrics
  template:
    metadata:
      labels:
        app: victoriametrics
    spec:
      containers:
      - name: victoriametrics
        image: victoriametrics/victoria-metrics:v1.96.0
        args:
          - -storageDataPath=/storage
          - -retentionPeriod=12  # 12 months
          - -memory.allowedPercent=80
          - -search.maxQueryDuration=60s
          - -search.maxConcurrentRequests=8
          - -httpListenAddr=:8428
        ports:
        - containerPort: 8428
          name: http
        volumeMounts:
        - name: storage
          mountPath: /storage
        resources:
          requests:
            memory: 2Gi
            cpu: 1
          limits:
            memory: 4Gi
            cpu: 2
        livenessProbe:
          httpGet:
            path: /health
            port: 8428
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8428
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 200Gi
---
apiVersion: v1
kind: Service
metadata:
  name: victoriametrics
  namespace: victoriametrics
spec:
  selector:
    app: victoriametrics
  ports:
  - port: 8428
    name: http
```

The -retentionPeriod flag sets storage retention in months. VictoriaMetrics can easily store years of data.

## Configuring Prometheus Remote Write

Configure Prometheus to send metrics to VictoriaMetrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: k8s
  namespace: monitoring
spec:
  replicas: 2
  retention: 7d  # Keep local data for 7 days

  remoteWrite:
  - url: http://victoriametrics.victoriametrics.svc.cluster.local:8428/api/v1/write
    queueConfig:
      capacity: 100000
      maxShards: 200
      minShards: 10
      maxSamplesPerSend: 10000
      batchSendDeadline: 5s
```

VictoriaMetrics receives data via the /api/v1/write endpoint and stores it efficiently.

## Replacing Prometheus with VictoriaMetrics

VictoriaMetrics can scrape targets directly, fully replacing Prometheus:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vm-agent-config
  namespace: victoriametrics
data:
  prometheus.yml: |
    global:
      scrape_interval: 30s
      external_labels:
        cluster: main

    scrape_configs:
    # Scrape Kubernetes nodes
    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - source_labels: [__address__]
        regex: '(.*):10250'
        replacement: '${1}:9100'
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

    # Scrape Kubernetes pods
    - job_name: 'kubernetes-pods'
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
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vmagent
  namespace: victoriametrics
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vmagent
  template:
    metadata:
      labels:
        app: vmagent
    spec:
      serviceAccountName: vmagent
      containers:
      - name: vmagent
        image: victoriametrics/vmagent:v1.96.0
        args:
          - -promscrape.config=/config/prometheus.yml
          - -remoteWrite.url=http://victoriametrics:8428/api/v1/write
          - -memory.allowedPercent=80
        ports:
        - containerPort: 8429
          name: http
        volumeMounts:
        - name: config
          mountPath: /config
      volumes:
      - name: config
        configMap:
          name: vm-agent-config
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vmagent
  namespace: victoriametrics
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: vmagent
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/metrics
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: vmagent
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: vmagent
subjects:
- kind: ServiceAccount
  name: vmagent
  namespace: victoriametrics
```

vmagent scrapes targets and forwards to VictoriaMetrics, replacing Prometheus entirely.

## Setting Up Grafana with VictoriaMetrics

Configure Grafana to query VictoriaMetrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  victoriametrics.yaml: |
    apiVersion: 1
    datasources:
    - name: VictoriaMetrics
      type: prometheus
      access: proxy
      url: http://victoriametrics.victoriametrics.svc.cluster.local:8428
      isDefault: true
      jsonData:
        timeInterval: 30s
        queryTimeout: 60s
```

VictoriaMetrics supports the Prometheus API, so Grafana's Prometheus data source works without modification.

## Deploying Cluster Mode for High Scale

For massive deployments, use VictoriaMetrics cluster mode:

```yaml
# vmstorage - stores data
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: vmstorage
  namespace: victoriametrics
spec:
  serviceName: vmstorage
  replicas: 3
  selector:
    matchLabels:
      app: vmstorage
  template:
    metadata:
      labels:
        app: vmstorage
    spec:
      containers:
      - name: vmstorage
        image: victoriametrics/vmstorage:v1.96.0-cluster
        args:
          - -storageDataPath=/storage
          - -retentionPeriod=12
          - -httpListenAddr=:8482
          - -vminsertAddr=:8400
          - -vmselectAddr=:8401
        ports:
        - containerPort: 8482
          name: http
        - containerPort: 8400
          name: vminsert
        - containerPort: 8401
          name: vmselect
        volumeMounts:
        - name: storage
          mountPath: /storage
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 200Gi
---
# vminsert - receives data
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vminsert
  namespace: victoriametrics
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vminsert
  template:
    metadata:
      labels:
        app: vminsert
    spec:
      containers:
      - name: vminsert
        image: victoriametrics/vminsert:v1.96.0-cluster
        args:
          - -storageNode=vmstorage-0.vmstorage:8400,vmstorage-1.vmstorage:8400,vmstorage-2.vmstorage:8400
          - -httpListenAddr=:8480
          - -replicationFactor=2
        ports:
        - containerPort: 8480
          name: http
---
# vmselect - queries data
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vmselect
  namespace: victoriametrics
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vmselect
  template:
    metadata:
      labels:
        app: vmselect
    spec:
      containers:
      - name: vmselect
        image: victoriametrics/vmselect:v1.96.0-cluster
        args:
          - -storageNode=vmstorage-0.vmstorage:8401,vmstorage-1.vmstorage:8401,vmstorage-2.vmstorage:8401
          - -httpListenAddr=:8481
          - -search.maxQueryDuration=60s
        ports:
        - containerPort: 8481
          name: http
---
apiVersion: v1
kind: Service
metadata:
  name: vmstorage
  namespace: victoriametrics
spec:
  clusterIP: None
  selector:
    app: vmstorage
  ports:
  - port: 8400
    name: vminsert
  - port: 8401
    name: vmselect
---
apiVersion: v1
kind: Service
metadata:
  name: vminsert
  namespace: victoriametrics
spec:
  selector:
    app: vminsert
  ports:
  - port: 8480
    name: http
---
apiVersion: v1
kind: Service
metadata:
  name: vmselect
  namespace: victoriametrics
spec:
  selector:
    app: vmselect
  ports:
  - port: 8481
    name: http
```

In cluster mode, use vminsert URL for writing and vmselect URL for querying.

## Enabling Downsampling

VictoriaMetrics automatically downsamples old data to save storage:

```yaml
args:
  - -storageDataPath=/storage
  - -retentionPeriod=12
  - -downsampling.period=30d:5m,90d:1h
```

This keeps full resolution for 30 days, 5-minute resolution for 30-90 days, and 1-hour resolution beyond 90 days.

## Configuring De-duplication

VictoriaMetrics automatically de-duplicates data from multiple Prometheus instances:

```yaml
args:
  - -dedup.minScrapeInterval=30s
```

This removes duplicate samples within the scrape interval window.

## Monitoring VictoriaMetrics

Track VictoriaMetrics performance:

```promql
# Ingestion rate
rate(vm_rows_inserted_total[5m])

# Active series
vm_cache_entries{type="storage/tsid"}

# Storage size
vm_data_size_bytes{type="indexdb"} + vm_data_size_bytes{type="storage"}

# Query latency
histogram_quantile(0.99, rate(vm_http_request_duration_seconds_bucket{path="/api/v1/query"}[5m]))

# Memory usage
process_resident_memory_bytes
```

## Migrating from Prometheus

To migrate existing Prometheus data:

1. Export data from Prometheus:

```bash
kubectl exec -n monitoring prometheus-0 -- promtool tsdb dump /prometheus > prometheus-data.txt
```

2. Import to VictoriaMetrics:

```bash
vmctl prometheus --prom-snapshot=/path/to/prometheus-data.txt \
  --vm-addr=http://victoriametrics:8428
```

## Backfilling Historical Data

VictoriaMetrics supports efficient backfill:

```bash
# Import from OpenMetrics format
curl -X POST http://victoriametrics:8428/api/v1/import \
  -T metrics.txt
```

VictoriaMetrics provides a production-ready, resource-efficient alternative to Prometheus with better compression, lower resource usage, and simpler operations at scale.
