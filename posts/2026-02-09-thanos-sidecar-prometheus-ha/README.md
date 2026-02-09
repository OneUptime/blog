# How to Configure Thanos Sidecar for Prometheus High Availability in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Thanos, Prometheus, High Availability, Kubernetes, Observability

Description: Learn how to deploy Thanos sidecar with Prometheus for high availability, long-term storage, and global query view across multiple Kubernetes clusters.

---

Running multiple Prometheus instances for high availability creates data fragmentation and query complexity. Thanos sidecar uploads Prometheus data to object storage while providing a unified query interface with automatic de-duplication.

This guide covers configuring Thanos sidecar for production Prometheus HA deployments.

## Understanding Thanos Architecture

Thanos extends Prometheus with several components:

- **Sidecar**: Runs alongside Prometheus, uploads blocks to object storage
- **Store Gateway**: Serves historical data from object storage
- **Querier**: Provides global query view across Prometheus instances
- **Compactor**: Downsamples and compacts historical blocks
- **Ruler**: Executes recording and alerting rules on historical data

The sidecar enables HA by making each Prometheus instance's data queryable while storing it durably in object storage.

## Deploying Prometheus with Thanos Sidecar

Configure Prometheus StatefulSet with Thanos sidecar container:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prometheus
  namespace: monitoring
spec:
  serviceName: prometheus
  replicas: 2  # HA with 2 replicas
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
        thanos-store-api: "true"
    spec:
      serviceAccountName: prometheus
      containers:
      # Prometheus container
      - name: prometheus
        image: prom/prometheus:v2.45.0
        args:
          - --config.file=/etc/prometheus/prometheus.yml
          - --storage.tsdb.path=/prometheus
          - --storage.tsdb.retention.time=6h  # Short retention, Thanos handles long-term
          - --storage.tsdb.min-block-duration=2h
          - --storage.tsdb.max-block-duration=2h
          - --web.enable-lifecycle
          - --web.enable-admin-api
        ports:
        - containerPort: 9090
          name: http
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: data
          mountPath: /prometheus

      # Thanos sidecar container
      - name: thanos-sidecar
        image: quay.io/thanos/thanos:v0.32.0
        args:
          - sidecar
          - --prometheus.url=http://localhost:9090
          - --tsdb.path=/prometheus
          - --grpc-address=0.0.0.0:10901
          - --http-address=0.0.0.0:10902
          - --objstore.config-file=/etc/thanos/objstore.yml
          - --reloader.config-file=/etc/prometheus/prometheus.yml
          - --reloader.config-envsubst-file=/etc/prometheus-shared/prometheus.yml
        ports:
        - containerPort: 10901
          name: grpc
        - containerPort: 10902
          name: http
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: data
          mountPath: /prometheus
        - name: config
          mountPath: /etc/prometheus
        - name: thanos-objstore
          mountPath: /etc/thanos

      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: thanos-objstore
        secret:
          secretName: thanos-objstore-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

The sidecar runs alongside Prometheus and uploads 2-hour blocks to object storage.

## Configuring Object Storage

Create object storage configuration for AWS S3:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: thanos-objstore-config
  namespace: monitoring
type: Opaque
stringData:
  objstore.yml: |
    type: S3
    config:
      bucket: "thanos-metrics"
      endpoint: "s3.amazonaws.com"
      region: "us-east-1"
      access_key: "<access-key>"
      secret_key: "<secret-key>"
```

For Google Cloud Storage:

```yaml
stringData:
  objstore.yml: |
    type: GCS
    config:
      bucket: "thanos-metrics"
      service_account: |-
        {
          "type": "service_account",
          "project_id": "my-project",
          "private_key": "...",
          "client_email": "..."
        }
```

For Azure Blob Storage:

```yaml
stringData:
  objstore.yml: |
    type: AZURE
    config:
      storage_account: "thanosmetrics"
      storage_account_key: "<key>"
      container: "thanos"
```

## Creating Headless Service for Sidecar

Create a headless service for sidecar discovery:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: prometheus-thanos-sidecar
  namespace: monitoring
  labels:
    thanos-store-api: "true"
spec:
  clusterIP: None
  selector:
    app: prometheus
  ports:
  - port: 10901
    name: grpc
```

The Thanos Querier uses this service to discover all sidecar instances.

## Deploying Thanos Querier

Deploy Querier to provide unified query interface:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-querier
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: thanos-querier
  template:
    metadata:
      labels:
        app: thanos-querier
    spec:
      containers:
      - name: thanos-querier
        image: quay.io/thanos/thanos:v0.32.0
        args:
          - query
          - --http-address=0.0.0.0:10902
          - --grpc-address=0.0.0.0:10901
          - --query.replica-label=prometheus_replica
          - --query.replica-label=replica
          - --store=dnssrv+_grpc._tcp.prometheus-thanos-sidecar.monitoring.svc.cluster.local
          - --store=dnssrv+_grpc._tcp.thanos-store-gateway.monitoring.svc.cluster.local
        ports:
        - containerPort: 10902
          name: http
        - containerPort: 10901
          name: grpc
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 10902
          initialDelaySeconds: 10
        readinessProbe:
          httpGet:
            path: /-/ready
            port: 10902
          initialDelaySeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: thanos-querier
  namespace: monitoring
spec:
  selector:
    app: thanos-querier
  ports:
  - port: 10902
    name: http
```

The Querier automatically discovers sidecars via DNS and de-duplicates data from HA Prometheus replicas.

## Configuring Prometheus External Labels

Add external labels to identify each Prometheus replica:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      external_labels:
        cluster: main
        prometheus_replica: $(POD_NAME)  # Envsubst by sidecar reloader

    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
```

The sidecar reloader substitutes $(POD_NAME) with the actual pod name, enabling de-duplication.

## Deploying Thanos Store Gateway

Store Gateway serves historical data from object storage:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: thanos-store-gateway
  namespace: monitoring
spec:
  serviceName: thanos-store-gateway
  replicas: 2
  selector:
    matchLabels:
      app: thanos-store-gateway
  template:
    metadata:
      labels:
        app: thanos-store-gateway
        thanos-store-api: "true"
    spec:
      containers:
      - name: thanos-store-gateway
        image: quay.io/thanos/thanos:v0.32.0
        args:
          - store
          - --data-dir=/data
          - --grpc-address=0.0.0.0:10901
          - --http-address=0.0.0.0:10902
          - --objstore.config-file=/etc/thanos/objstore.yml
          - --index-cache-size=2GB
          - --chunk-pool-size=2GB
        ports:
        - containerPort: 10901
          name: grpc
        - containerPort: 10902
          name: http
        volumeMounts:
        - name: data
          mountPath: /data
        - name: objstore-config
          mountPath: /etc/thanos
        resources:
          requests:
            memory: 4Gi
            cpu: 1
          limits:
            memory: 8Gi
            cpu: 2
      volumes:
      - name: objstore-config
        secret:
          secretName: thanos-objstore-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: thanos-store-gateway
  namespace: monitoring
spec:
  clusterIP: None
  selector:
    app: thanos-store-gateway
  ports:
  - port: 10901
    name: grpc
```

## Deploying Thanos Compactor

Compactor downsamples and compacts historical blocks:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: thanos-compactor
  namespace: monitoring
spec:
  serviceName: thanos-compactor
  replicas: 1  # Only 1 compactor per cluster
  selector:
    matchLabels:
      app: thanos-compactor
  template:
    metadata:
      labels:
        app: thanos-compactor
    spec:
      containers:
      - name: thanos-compactor
        image: quay.io/thanos/thanos:v0.32.0
        args:
          - compact
          - --data-dir=/data
          - --http-address=0.0.0.0:10902
          - --objstore.config-file=/etc/thanos/objstore.yml
          - --retention.resolution-raw=30d
          - --retention.resolution-5m=90d
          - --retention.resolution-1h=365d
          - --wait
          - --downsample.concurrency=1
        ports:
        - containerPort: 10902
          name: http
        volumeMounts:
        - name: data
          mountPath: /data
        - name: objstore-config
          mountPath: /etc/thanos
        resources:
          requests:
            memory: 2Gi
            cpu: 1
      volumes:
      - name: objstore-config
        secret:
          secretName: thanos-objstore-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

Compactor automatically creates downsampled 5m and 1h resolution data for faster historical queries.

## Configuring Grafana to Query Thanos

Add Thanos Querier as Grafana datasource:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  thanos.yaml: |
    apiVersion: 1
    datasources:
    - name: Thanos
      type: prometheus
      access: proxy
      url: http://thanos-querier.monitoring.svc.cluster.local:10902
      isDefault: true
      jsonData:
        timeInterval: 30s
```

Grafana queries Thanos, which automatically queries both Prometheus sidecars and historical data from object storage.

## Monitoring Thanos Components

Track Thanos health:

```promql
# Sidecar upload success rate
rate(thanos_objstore_bucket_operations_total{operation="upload",component="sidecar"}[5m])

# Querier query latency
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket{handler="query"}[5m])
)

# Store Gateway cache hit rate
thanos_store_index_cache_hits_total / thanos_store_index_cache_requests_total

# Compactor block compaction time
thanos_compact_duration_seconds
```

## Setting Up Alerts

Create alerts for Thanos issues:

```yaml
groups:
- name: thanos
  rules:
  - alert: ThanosSidecarUploadFailing
    expr: |
      rate(thanos_objstore_bucket_operation_failures_total{component="sidecar"}[5m]) > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Thanos sidecar failing to upload blocks"

  - alert: ThanosCompactorNotRunning
    expr: |
      time() - thanos_compact_last_run_timestamp_seconds > 3600
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "Thanos compactor hasn't run in over an hour"
```

Thanos sidecar provides Prometheus HA with global query views, long-term storage, and automatic de-duplication across replicas.
