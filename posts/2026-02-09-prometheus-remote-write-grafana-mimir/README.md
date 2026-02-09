# How to Configure Prometheus Remote Write to Send Metrics to Grafana Mimir

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Grafana Mimir, Remote Write, Observability, Metrics Storage

Description: Learn how to configure Prometheus remote write to send metrics to Grafana Mimir for long-term storage, high availability, and multi-tenancy support.

---

Prometheus local storage has limitations for long-term retention and multi-cluster scenarios. Grafana Mimir provides scalable, durable metrics storage with multi-tenancy support. Remote write enables Prometheus to send metrics to Mimir while maintaining local storage for queries.

This guide covers configuring Prometheus remote write for Grafana Mimir integration.

## Understanding Remote Write Architecture

Remote write sends time series data from Prometheus to remote storage systems asynchronously. Prometheus continues to scrape metrics and serve queries locally while simultaneously forwarding samples to Mimir.

The flow works like this:

1. Prometheus scrapes targets and stores metrics locally
2. Samples are queued in the remote write buffer
3. Prometheus sends batches of samples to Mimir via HTTP
4. Mimir ingests samples and stores them in object storage
5. Grafana queries can use either Prometheus or Mimir as a data source

Remote write is fire-and-forget. If Mimir is unavailable, samples queue in memory until the buffer fills or connectivity restores.

## Installing Grafana Mimir

Deploy Mimir in your Kubernetes cluster. For production, use the distributed mode with separate components.

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

    distributor:
      ring:
        kvstore:
          store: memberlist

    ingester:
      ring:
        kvstore:
          store: memberlist
        replication_factor: 3

    blocks_storage:
      backend: s3
      s3:
        endpoint: minio.mimir.svc.cluster.local:9000
        bucket_name: mimir-blocks
        access_key_id: mimir
        secret_access_key: <secret-key>
        insecure: true

    limits:
      max_global_series_per_user: 1000000
      ingestion_rate: 50000
      ingestion_burst_size: 100000
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
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9095
          name: grpc
        volumeMounts:
        - name: config
          mountPath: /etc/mimir
        - name: storage
          mountPath: /data
      volumes:
      - name: config
        configMap:
          name: mimir-config
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mimir
  namespace: mimir
spec:
  selector:
    app: mimir
  ports:
  - port: 8080
    name: http
  - port: 9095
    name: grpc
  clusterIP: None
---
apiVersion: v1
kind: Service
metadata:
  name: mimir-write
  namespace: mimir
spec:
  selector:
    app: mimir
  ports:
  - port: 8080
    name: http
```

This deploys Mimir in monolithic mode (target: all). For larger deployments, run separate StatefulSets for distributors, ingesters, and queriers.

## Configuring Prometheus Remote Write

Add remote write configuration to your Prometheus instance. With Prometheus Operator, use the remoteWrite field in the Prometheus CRD.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: k8s
  namespace: monitoring
spec:
  replicas: 2
  version: v2.45.0

  serviceAccountName: prometheus
  serviceMonitorSelector: {}
  podMonitorSelector: {}

  retention: 7d

  remoteWrite:
  - url: http://mimir-write.mimir.svc.cluster.local:8080/api/v1/push
    queueConfig:
      capacity: 10000
      maxShards: 50
      minShards: 1
      maxSamplesPerSend: 5000
      batchSendDeadline: 5s
      minBackoff: 30ms
      maxBackoff: 5s
    writeRelabelConfigs:
    # Add tenant ID header for multi-tenancy
    - sourceLabels: [__tmp_tenant_id]
      targetLabel: __tenant_id__
      replacement: "cluster-east-1"
    # Drop high-cardinality metrics
    - sourceLabels: [__name__]
      regex: 'container_network_tcp_usage_total|container_tasks_state'
      action: drop
```

The queueConfig parameters control batching and retry behavior for optimal throughput and reliability.

## Configuring Multi-Tenancy

Mimir supports multi-tenancy through the X-Scope-OrgID header. Configure different tenant IDs for different clusters or environments.

```yaml
remoteWrite:
- url: http://mimir-write.mimir.svc.cluster.local:8080/api/v1/push
  headers:
    X-Scope-OrgID: production-cluster
  queueConfig:
    capacity: 10000

# Separate remote write for staging with different tenant
- url: http://mimir-write.mimir.svc.cluster.local:8080/api/v1/push
  headers:
    X-Scope-OrgID: staging-cluster
  queueConfig:
    capacity: 5000
```

Each tenant's data is isolated in Mimir storage. Query by specifying the tenant ID.

## Optimizing Write Performance

Tune remote write parameters for your workload. High-volume environments need larger queues and more shards.

```yaml
remoteWrite:
- url: http://mimir-write.mimir.svc.cluster.local:8080/api/v1/push
  queueConfig:
    # Buffer capacity - higher for burst traffic
    capacity: 50000

    # Shard count - more shards = higher throughput
    maxShards: 200
    minShards: 10

    # Samples per request - larger batches reduce overhead
    maxSamplesPerSend: 10000

    # Send deadline - how long to wait before sending partial batch
    batchSendDeadline: 5s

    # Retry backoff - balance between retry speed and load
    minBackoff: 100ms
    maxBackoff: 10s

    # Retry attempts before dropping samples
    maxRetries: 10
```

Monitor remote write metrics to tune these values:

```promql
# Samples pending in queue
prometheus_remote_storage_samples_pending

# Failed samples
rate(prometheus_remote_storage_samples_failed_total[5m])

# Current shard count
prometheus_remote_storage_shards

# Samples sent per second
rate(prometheus_remote_storage_samples_total[5m])
```

## Filtering Metrics with Write Relabeling

Use writeRelabelConfigs to filter or modify metrics before sending to Mimir. This reduces storage costs and network bandwidth.

```yaml
remoteWrite:
- url: http://mimir-write.mimir.svc.cluster.local:8080/api/v1/push
  writeRelabelConfigs:
  # Drop high-cardinality debug metrics
  - sourceLabels: [__name__]
    regex: 'go_gc_.*|process_.*'
    action: drop

  # Drop metrics from test namespaces
  - sourceLabels: [namespace]
    regex: 'test-.*|dev-.*'
    action: drop

  # Keep only critical metrics for certain jobs
  - sourceLabels: [job, __name__]
    regex: 'kubernetes-pods;(container_cpu_usage_seconds_total|container_memory_working_set_bytes)'
    action: keep

  # Add cluster label to all metrics
  - targetLabel: cluster
    replacement: east-1

  # Reduce label cardinality by dropping pod ID
  - regex: 'pod_uid'
    action: labeldrop
```

These relabel rules apply only to remote write, not local Prometheus storage.

## Implementing Selective Remote Write

Send different metrics to different Mimir tenants or endpoints based on label patterns.

```yaml
remoteWrite:
# High-priority production metrics
- url: http://mimir-write.mimir.svc.cluster.local:8080/api/v1/push
  headers:
    X-Scope-OrgID: production-high-priority
  writeRelabelConfigs:
  - sourceLabels: [namespace]
    regex: 'prod-.*'
    action: keep
  - sourceLabels: [__name__]
    regex: 'up|container_cpu_.*|container_memory_.*'
    action: keep

# All metrics for analysis
- url: http://mimir-write.mimir.svc.cluster.local:8080/api/v1/push
  headers:
    X-Scope-OrgID: production-all-metrics
  queueConfig:
    capacity: 100000
```

This separates critical real-time metrics from bulk historical data.

## Configuring Authentication

Secure remote write with authentication. Mimir supports basic auth, bearer tokens, and OAuth.

### Basic Auth

```yaml
remoteWrite:
- url: http://mimir-write.mimir.svc.cluster.local:8080/api/v1/push
  basicAuth:
    username:
      name: mimir-credentials
      key: username
    password:
      name: mimir-credentials
      key: password
---
apiVersion: v1
kind: Secret
metadata:
  name: mimir-credentials
  namespace: monitoring
type: Opaque
stringData:
  username: prometheus
  password: <strong-password>
```

### Bearer Token

```yaml
remoteWrite:
- url: http://mimir-write.mimir.svc.cluster.local:8080/api/v1/push
  authorization:
    type: Bearer
    credentials:
      name: mimir-token
      key: token
---
apiVersion: v1
kind: Secret
metadata:
  name: mimir-token
  namespace: monitoring
type: Opaque
stringData:
  token: <jwt-token>
```

## Enabling TLS

Encrypt remote write traffic with TLS:

```yaml
remoteWrite:
- url: https://mimir-write.example.com/api/v1/push
  tlsConfig:
    ca:
      configMap:
        name: mimir-ca
        key: ca.crt
    cert:
      secret:
        name: prometheus-client-cert
        key: tls.crt
    keySecret:
      name: prometheus-client-cert
      key: tls.key
    serverName: mimir-write.example.com
    insecureSkipVerify: false
```

## Monitoring Remote Write Health

Create alerts for remote write issues:

```yaml
groups:
- name: remote_write
  rules:
  - alert: RemoteWriteBehind
    expr: |
      (
        prometheus_remote_storage_highest_timestamp_in_seconds -
        ignoring(remote_name, url) group_right
        prometheus_remote_storage_queue_highest_sent_timestamp_seconds
      ) > 300
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Remote write falling behind"
      description: "Remote write is {{ $value }} seconds behind"

  - alert: RemoteWriteFailures
    expr: |
      rate(prometheus_remote_storage_samples_failed_total[5m]) > 100
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Remote write samples failing"
      description: "{{ $value }} samples/sec failing to write"

  - alert: RemoteWriteQueueFull
    expr: |
      (
        prometheus_remote_storage_samples_pending /
        prometheus_remote_storage_queue_capacity
      ) > 0.9
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Remote write queue nearly full"
```

## Querying Mimir Data

Configure Grafana to query Mimir for long-term metrics:

```yaml
apiVersion: 1
datasources:
- name: Mimir
  type: prometheus
  access: proxy
  url: http://mimir.mimir.svc.cluster.local:8080/prometheus
  jsonData:
    httpHeaderName1: X-Scope-OrgID
  secureJsonData:
    httpHeaderValue1: production-cluster
  isDefault: false
```

Use Prometheus for short-term queries (last 7 days) and Mimir for historical analysis.

## Handling Backfill

If you enable remote write on an existing Prometheus instance, historical data is not automatically sent. Use promtool to backfill:

```bash
# Export data from Prometheus
kubectl exec -n monitoring prometheus-0 -- promtool tsdb dump /prometheus \
  --match='{job="kubernetes-pods"}' \
  --min-time=1706832000000 \
  --max-time=1707436800000 > metrics.txt

# Import to Mimir using remote write
cat metrics.txt | promtool push metrics \
  --url=http://mimir-write.mimir.svc.cluster.local:8080/api/v1/push \
  --header='X-Scope-OrgID: production-cluster'
```

## Testing Remote Write Configuration

Verify remote write is working:

```bash
# Check remote write metrics in Prometheus
kubectl port-forward -n monitoring prometheus-0 9090:9090

curl -s 'http://localhost:9090/api/v1/query?query=prometheus_remote_storage_samples_total' | jq

# Query Mimir to verify data arrival
kubectl port-forward -n mimir mimir-0 8080:8080

curl -s 'http://localhost:8080/prometheus/api/v1/query?query=up' \
  -H 'X-Scope-OrgID: production-cluster' | jq
```

Remote write to Grafana Mimir provides durable, scalable metrics storage that extends Prometheus capabilities while maintaining local query performance.
