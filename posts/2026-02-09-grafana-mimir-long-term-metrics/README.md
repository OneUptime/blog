# How to Deploy Grafana Mimir for Long-Term Kubernetes Metrics Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Mimir, Kubernetes, Metrics Storage, Observability, Prometheus

Description: Learn how to deploy and configure Grafana Mimir for long-term Kubernetes metrics storage with object storage backends and multi-tenancy support.

---

Prometheus local storage limits retention to weeks or months due to disk constraints. Grafana Mimir provides scalable long-term metrics storage using object storage, enabling years of retention while supporting multi-tenancy and high availability.

This guide covers deploying Mimir in Kubernetes for production long-term metrics storage.

## Understanding Mimir Architecture

Mimir is a horizontally scalable Prometheus-compatible metrics backend. It stores recent data in memory and persistent storage while compacting older data into object storage (S3, GCS, Azure Blob).

Key components:

- **Distributors**: Receive metrics via remote write and forward to ingesters
- **Ingesters**: Store recent metrics in memory and flush to object storage
- **Queriers**: Execute PromQL queries across ingesters and object storage
- **Compactors**: Merge and downsample blocks in object storage
- **Store-gateways**: Serve queries from object storage

Mimir can run in monolithic mode (all components in one process) or distributed mode (separate deployments).

## Deploying Mimir in Monolithic Mode

For smaller deployments, monolithic mode runs all components together:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mimir
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mimir-config
  namespace: mimir
data:
  mimir.yaml: |
    target: all
    multitenancy_enabled: true

    server:
      http_listen_port: 8080
      grpc_listen_port: 9095
      log_level: info

    distributor:
      ring:
        kvstore:
          store: memberlist

    ingester:
      ring:
        kvstore:
          store: memberlist
        replication_factor: 3
        num_tokens: 512

    blocks_storage:
      backend: s3
      s3:
        endpoint: s3.amazonaws.com
        bucket_name: my-mimir-blocks
        region: us-east-1
      tsdb:
        dir: /data/tsdb
        retention_period: 24h

    compactor:
      data_dir: /data/compactor
      sharding_ring:
        kvstore:
          store: memberlist

    limits:
      max_global_series_per_user: 2000000
      ingestion_rate: 100000
      ingestion_burst_size: 200000
      max_query_lookback: 2160h  # 90 days
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mimir
  namespace: mimir
spec:
  serviceName: mimir
  replicas: 3
  selector:
    matchLabels:
      app: mimir
  template:
    metadata:
      labels:
        app: mimir
    spec:
      containers:
      - name: mimir
        image: grafana/mimir:2.10.0
        args:
          - -config.file=/etc/mimir/mimir.yaml
          - -target=all
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9095
          name: grpc
        - containerPort: 7946
          name: memberlist
        env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: mimir-s3-credentials
              key: access-key-id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: mimir-s3-credentials
              key: secret-access-key
        volumeMounts:
        - name: config
          mountPath: /etc/mimir
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: 4Gi
            cpu: 2
          limits:
            memory: 8Gi
            cpu: 4
      volumes:
      - name: config
        configMap:
          name: mimir-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mimir
  namespace: mimir
spec:
  clusterIP: None
  selector:
    app: mimir
  ports:
  - port: 8080
    name: http
  - port: 9095
    name: grpc
  - port: 7946
    name: memberlist
---
apiVersion: v1
kind: Service
metadata:
  name: mimir-query
  namespace: mimir
spec:
  selector:
    app: mimir
  ports:
  - port: 8080
    name: http
```

## Configuring Object Storage

Mimir supports multiple object storage backends. Here's how to configure each:

### AWS S3

```yaml
blocks_storage:
  backend: s3
  s3:
    endpoint: s3.amazonaws.com
    bucket_name: mimir-blocks
    region: us-east-1
    # Use IAM roles or credentials
```

Create S3 bucket and credentials:

```bash
# Create bucket
aws s3 mb s3://mimir-blocks --region us-east-1

# Create IAM user and policy
aws iam create-user --user-name mimir

# Attach policy allowing S3 access
aws iam put-user-policy --user-name mimir --policy-name MimirS3Access --policy-document file://policy.json
```

### Google Cloud Storage

```yaml
blocks_storage:
  backend: gcs
  gcs:
    bucket_name: mimir-blocks
    # Use service account JSON key
```

### Azure Blob Storage

```yaml
blocks_storage:
  backend: azure
  azure:
    storage_account_name: mimirstorage
    container_name: mimir-blocks
```

### MinIO (S3-compatible)

```yaml
blocks_storage:
  backend: s3
  s3:
    endpoint: minio.mimir.svc.cluster.local:9000
    bucket_name: mimir-blocks
    access_key_id: minio
    secret_access_key: <secret>
    insecure: true
```

## Deploying Distributed Mode

For larger scale, deploy components separately:

```yaml
# Distributors
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mimir-distributor
  namespace: mimir
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mimir
      component: distributor
  template:
    metadata:
      labels:
        app: mimir
        component: distributor
    spec:
      containers:
      - name: distributor
        image: grafana/mimir:2.10.0
        args:
          - -config.file=/etc/mimir/mimir.yaml
          - -target=distributor
        ports:
        - containerPort: 8080
        - containerPort: 9095
        volumeMounts:
        - name: config
          mountPath: /etc/mimir
      volumes:
      - name: config
        configMap:
          name: mimir-config
---
# Ingesters
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mimir-ingester
  namespace: mimir
spec:
  serviceName: mimir-ingester
  replicas: 3
  selector:
    matchLabels:
      app: mimir
      component: ingester
  template:
    metadata:
      labels:
        app: mimir
        component: ingester
    spec:
      containers:
      - name: ingester
        image: grafana/mimir:2.10.0
        args:
          - -config.file=/etc/mimir/mimir.yaml
          - -target=ingester
        volumeMounts:
        - name: config
          mountPath: /etc/mimir
        - name: data
          mountPath: /data
      volumes:
      - name: config
        configMap:
          name: mimir-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
# Queriers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mimir-querier
  namespace: mimir
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mimir
      component: querier
  template:
    metadata:
      labels:
        app: mimir
        component: querier
    spec:
      containers:
      - name: querier
        image: grafana/mimir:2.10.0
        args:
          - -config.file=/etc/mimir/mimir.yaml
          - -target=querier
        volumeMounts:
        - name: config
          mountPath: /etc/mimir
      volumes:
      - name: config
        configMap:
          name: mimir-config
---
# Compactors
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mimir-compactor
  namespace: mimir
spec:
  serviceName: mimir-compactor
  replicas: 1
  selector:
    matchLabels:
      app: mimir
      component: compactor
  template:
    metadata:
      labels:
        app: mimir
        component: compactor
    spec:
      containers:
      - name: compactor
        image: grafana/mimir:2.10.0
        args:
          - -config.file=/etc/mimir/mimir.yaml
          - -target=compactor
        volumeMounts:
        - name: config
          mountPath: /etc/mimir
        - name: data
          mountPath: /data
      volumes:
      - name: config
        configMap:
          name: mimir-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

## Configuring Multi-Tenancy

Enable per-tenant limits and isolation:

```yaml
limits:
  # Global defaults
  max_global_series_per_user: 2000000
  ingestion_rate: 100000
  ingestion_burst_size: 200000

  # Per-tenant overrides
overrides:
  tenant-production:
    max_global_series_per_user: 5000000
    ingestion_rate: 200000
  tenant-development:
    max_global_series_per_user: 500000
    ingestion_rate: 50000
```

## Configuring Retention and Compaction

Set retention policies and compaction settings:

```yaml
blocks_storage:
  tsdb:
    retention_period: 24h  # Keep in ingester for 24h

compactor:
  compaction_interval: 30m
  block_ranges:
    - 2h    # First compaction at 2h
    - 12h   # Second at 12h
    - 24h   # Third at 24h
  retention_enabled: true
  retention_period: 2160h  # 90 days total retention
```

## Setting Up Downsampling

Reduce storage costs with downsampling:

```yaml
compactor:
  downsampling_enabled: true
  downsampling:
    - from: 0
      to: 720h     # 30 days at full resolution
      resolution: 1m
    - from: 720h
      to: 2160h    # 30-90 days at 5m resolution
      resolution: 5m
    - from: 2160h
      to: 0        # > 90 days at 1h resolution
      resolution: 1h
```

## Connecting Prometheus Remote Write

Configure Prometheus to send metrics to Mimir:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: k8s
spec:
  remoteWrite:
  - url: http://mimir.mimir.svc.cluster.local:8080/api/v1/push
    headers:
      X-Scope-OrgID: tenant-production
    queueConfig:
      capacity: 50000
      maxShards: 200
      minShards: 10
```

## Querying Mimir from Grafana

Add Mimir as a Grafana data source:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  mimir.yaml: |
    apiVersion: 1
    datasources:
    - name: Mimir
      type: prometheus
      access: proxy
      url: http://mimir-query.mimir.svc.cluster.local:8080/prometheus
      jsonData:
        httpHeaderName1: X-Scope-OrgID
        timeInterval: 30s
      secureJsonData:
        httpHeaderValue1: tenant-production
      isDefault: false
```

## Monitoring Mimir Health

Track Mimir performance:

```promql
# Ingestion rate
sum(rate(cortex_distributor_samples_in_total[5m]))

# Query latency
histogram_quantile(0.99,
  sum(rate(cortex_query_frontend_request_duration_seconds_bucket[5m])) by (le)
)

# Compaction lag
time() - cortex_compactor_last_successful_run_timestamp_seconds

# Object storage operations
rate(thanos_objstore_bucket_operations_total[5m])
```

## Troubleshooting Common Issues

### High Memory Usage

Reduce series per tenant or increase ingester memory:

```yaml
limits:
  max_global_series_per_user: 1000000  # Lower limit

ingester:
  resources:
    limits:
      memory: 16Gi  # More memory
```

### Slow Queries

Enable query result caching:

```yaml
query_frontend:
  results_cache:
    backend: memcached
    memcached:
      addresses: memcached.mimir.svc.cluster.local:11211
```

### Compaction Failures

Increase compactor resources:

```yaml
compactor:
  resources:
    limits:
      memory: 8Gi
      cpu: 4
```

Grafana Mimir provides cost-effective long-term metrics storage that scales from small clusters to massive multi-tenant deployments with years of retention.
