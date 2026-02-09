# How to configure Grafana Loki with object storage backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Loki, Object Storage

Description: Learn how to configure Grafana Loki with S3-compatible object storage for cost-effective and scalable log aggregation.

---

Storing logs on local disks limits your log retention and creates scaling bottlenecks. Grafana Loki's object storage integration solves both problems by storing chunks and indexes in S3, GCS, or any S3-compatible backend. This approach dramatically reduces storage costs while enabling virtually unlimited retention periods.

## Understanding Loki's Storage Architecture

Loki separates its storage into two components: chunks and indexes. Chunks contain the actual compressed log data, while indexes map labels to chunks for efficient querying. Both can be stored in object storage, though recent index entries typically live in a database for faster access.

This separation allows Loki to keep hot data close for fast queries while pushing older data to cheaper object storage automatically.

## Configuring S3 Storage for Loki

Start with the basic S3 configuration in your Loki config file.

```yaml
# loki-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: index_
        period: 24h

storage_config:
  aws:
    s3: s3://us-east-1/loki-logs-bucket
    s3forcepathstyle: true

  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    shared_store: s3

limits_config:
  retention_period: 744h  # 31 days
```

This configuration stores both chunks and indexes in S3 using the newer TSDB index format.

## Using AWS Credentials with S3

Loki needs AWS credentials to access S3. Provide them through environment variables, IAM roles, or explicit configuration.

```yaml
# loki-config.yaml storage section with credentials
storage_config:
  aws:
    s3: s3://us-east-1/loki-logs-bucket
    access_key_id: ${AWS_ACCESS_KEY_ID}
    secret_access_key: ${AWS_SECRET_ACCESS_KEY}

    # Optional: use IAM role instead
    # sse_encryption: true
    # s3forcepathstyle: false
```

For production deployments, use IAM roles attached to your Kubernetes pods rather than embedding credentials.

```yaml
# kubernetes/loki-deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: loki
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/loki-s3-access

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki
spec:
  template:
    spec:
      serviceAccountName: loki
      containers:
        - name: loki
          image: grafana/loki:2.9.0
          # Loki automatically uses IAM role credentials
```

## Configuring MinIO for Self-Hosted S3

MinIO provides S3-compatible storage that you can run yourself, giving you object storage benefits without cloud provider dependencies.

```yaml
# docker-compose.yml
version: '3.8'

services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data

  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
    command: -config.file=/etc/loki/local-config.yaml

volumes:
  minio-data:
```

Configure Loki to use MinIO:

```yaml
# loki-config.yaml for MinIO
storage_config:
  aws:
    s3: http://minio:9000/loki
    access_key_id: minioadmin
    secret_access_key: minioadmin
    s3forcepathstyle: true
    insecure: true
```

The `s3forcepathstyle` and `insecure` flags are necessary for MinIO compatibility.

## Implementing Retention Policies

Object storage makes long-term log retention affordable, but you still need policies to manage data lifecycle.

```yaml
# loki-config.yaml
limits_config:
  # Global retention period
  retention_period: 2160h  # 90 days

# Compactor manages retention
compactor:
  working_directory: /loki/compactor
  shared_store: s3
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
```

The compactor runs as a separate Loki component that marks old chunks for deletion according to retention policies.

## Configuring Multi-Tenancy with Object Storage

When running multi-tenant Loki, each tenant's data is isolated in object storage using path prefixes.

```yaml
# loki-config.yaml
auth_enabled: true

storage_config:
  aws:
    s3: s3://us-east-1/loki-logs-bucket

  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    shared_store: s3

# Per-tenant limits
limits_config:
  per_tenant_override_config: /etc/loki/overrides.yaml
```

Create tenant-specific overrides:

```yaml
# overrides.yaml
overrides:
  tenant1:
    retention_period: 2160h  # 90 days
    max_query_length: 721h

  tenant2:
    retention_period: 720h  # 30 days
    max_query_length: 168h
```

Each tenant's logs are stored under `s3://bucket/fake/tenant-id/` allowing independent retention policies.

## Optimizing Chunk Size for Storage Efficiency

Chunk size affects both query performance and storage costs. Larger chunks reduce the number of objects in S3 but may increase memory usage.

```yaml
# loki-config.yaml
chunk_store_config:
  chunk_cache_config:
    enable_fifocache: true
    fifocache:
      max_size_bytes: 1GB
      ttl: 1h

ingester:
  chunk_idle_period: 1h       # Flush chunks after 1 hour idle
  chunk_block_size: 262144    # 256KB blocks
  chunk_target_size: 1572864  # Target 1.5MB chunks
  chunk_retain_period: 30s
  max_chunk_age: 2h           # Force flush after 2 hours
```

These settings balance between creating too many small chunks (expensive S3 operations) and too few large chunks (high memory usage).

## Implementing Caching for Object Storage

Queries against object storage can be slow. Add caching layers to improve performance.

```yaml
# loki-config.yaml
query_range:
  cache_results: true
  results_cache:
    cache:
      enable_fifocache: true
      fifocache:
        max_size_bytes: 500MB
        ttl: 24h

chunk_store_config:
  chunk_cache_config:
    enable_fifocache: true
    fifocache:
      max_size_bytes: 1GB
      ttl: 1h

storage_config:
  index_cache_validity: 5m
```

This configuration caches query results, chunk data, and index lookups, dramatically reducing object storage requests for repeated queries.

## Using GCS as Storage Backend

Google Cloud Storage works similarly to S3 but with different authentication.

```yaml
# loki-config.yaml
storage_config:
  gcs:
    bucket_name: loki-logs

  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    shared_store: gcs

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: gcs
      schema: v13
      index:
        prefix: index_
        period: 24h
```

Authenticate using a service account key:

```yaml
# kubernetes/loki-deployment.yaml
env:
  - name: GOOGLE_APPLICATION_CREDENTIALS
    value: /secrets/gcs-key.json
volumeMounts:
  - name: gcs-key
    mountPath: /secrets
    readOnly: true
volumes:
  - name: gcs-key
    secret:
      secretName: loki-gcs-credentials
```

## Monitoring Object Storage Usage

Track object storage metrics to understand costs and performance.

```promql
# Number of chunks uploaded to object storage
rate(loki_ingester_chunks_flushed_total[5m])

# Size of data uploaded
rate(loki_ingester_chunk_stored_bytes_total[5m])

# Cache hit rates
sum(rate(loki_chunk_store_index_lookups_total{type="cache-hit"}[5m]))
/
sum(rate(loki_chunk_store_index_lookups_total[5m]))

# Object storage request errors
rate(loki_boltdb_shipper_request_duration_seconds_count{status_code!~"2.."}[5m])
```

High cache hit rates indicate efficient caching configuration, while upload rates help predict storage costs.

## Handling Object Storage Failures

Configure Loki to handle temporary object storage outages gracefully.

```yaml
# loki-config.yaml
storage_config:
  aws:
    s3: s3://us-east-1/loki-logs-bucket
    http_config:
      idle_conn_timeout: 90s
      response_header_timeout: 30s
      insecure_skip_verify: false

    # Retry configuration
    backoff_config:
      min_period: 100ms
      max_period: 10s
      max_retries: 10

# Keep more data locally during outages
ingester:
  max_chunk_age: 4h  # Increased from 2h
  chunk_retain_period: 2m
```

These settings ensure Loki retries failed uploads and buffers data locally during outages.

## Migrating from Filesystem to Object Storage

Migrate existing Loki deployments to object storage with a phased approach.

```yaml
# loki-config.yaml - dual storage during migration
schema_config:
  configs:
    # Old data on filesystem
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

    # New data on S3
    - from: 2026-02-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: index_
        period: 24h
```

This configuration reads old logs from filesystem while writing new logs to S3, allowing gradual migration.

## Best Practices for Object Storage

Enable compression to reduce storage costs. Loki compresses chunks by default using Snappy or LZ4.

Use lifecycle policies on your S3 bucket to transition older logs to cheaper storage tiers like Glacier.

Monitor your S3 costs using AWS Cost Explorer and set budgets to prevent unexpected charges.

Configure appropriate chunk sizes based on your log volume. High-volume systems benefit from larger chunks.

Use caching aggressively. Queries against object storage are slower than local disk, so cache everything you can.

Implement proper retention policies. Object storage is cheap but not free, so delete logs you don't need.

Object storage transforms Loki from a limited local log store into a scalable, cost-effective log aggregation platform. With proper configuration, you can retain logs for months or years while keeping costs reasonable and queries fast.
