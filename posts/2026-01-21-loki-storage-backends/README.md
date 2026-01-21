# How to Configure Loki Storage Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Storage, S3, GCS, Azure Blob, Object Storage, Log Management

Description: A comprehensive guide to configuring Grafana Loki storage backends including filesystem, AWS S3, Google Cloud Storage, Azure Blob Storage, and MinIO for production log storage.

---

Grafana Loki's storage architecture separates index and chunk storage, allowing flexible configuration of backends based on your requirements. Choosing the right storage backend is crucial for performance, cost, and reliability. This guide covers all supported storage backends with production-ready configurations.

## Understanding Loki Storage Architecture

Loki stores data in two distinct forms:

- **Chunks**: Compressed log data organized by streams
- **Index**: Metadata that maps labels to chunk locations

Both can use the same backend or different backends depending on your needs.

## Storage Backend Options

| Backend | Best For | Durability | Cost | Performance |
|---------|----------|------------|------|-------------|
| Filesystem | Development, small deployments | Low | Lowest | High |
| AWS S3 | Production AWS workloads | Very High | Medium | Medium |
| Google Cloud Storage | Production GCP workloads | Very High | Medium | Medium |
| Azure Blob Storage | Production Azure workloads | Very High | Medium | Medium |
| MinIO | Self-hosted object storage | High | Variable | Medium-High |

## Filesystem Storage

The filesystem backend stores chunks and indexes on local disk. Suitable for development or single-node deployments.

### Basic Configuration

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

storage_config:
  filesystem:
    directory: /loki/chunks

  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    cache_ttl: 24h

compactor:
  working_directory: /loki/compactor
  shared_store: filesystem
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
```

### Docker Volume Mount

```yaml
services:
  loki:
    image: grafana/loki:2.9.4
    volumes:
      - loki-data:/loki
    command: -config.file=/etc/loki/config.yaml

volumes:
  loki-data:
    driver: local
```

### Kubernetes PersistentVolume

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: loki-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 100Gi
```

## AWS S3 Storage

Amazon S3 is the most common production storage backend for Loki.

### Basic S3 Configuration

```yaml
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h

storage_config:
  aws:
    s3: s3://us-east-1/my-loki-bucket
    bucketnames: my-loki-bucket
    region: us-east-1
    access_key_id: ${AWS_ACCESS_KEY_ID}
    secret_access_key: ${AWS_SECRET_ACCESS_KEY}
    s3forcepathstyle: false
    insecure: false
    sse_encryption: true
    http_config:
      idle_conn_timeout: 90s
      response_header_timeout: 0s
      insecure_skip_verify: false

  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    cache_ttl: 24h
    shared_store: s3

compactor:
  working_directory: /loki/compactor
  shared_store: s3
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  delete_request_store: s3
```

### S3 with IAM Roles (EKS)

For EKS with IRSA (IAM Roles for Service Accounts):

```yaml
# IAM Policy for Loki
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-loki-bucket",
        "arn:aws:s3:::my-loki-bucket/*"
      ]
    }
  ]
}
```

Kubernetes Service Account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: loki
  namespace: loki
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/loki-s3-role
```

Loki Configuration (no credentials needed):

```yaml
storage_config:
  aws:
    s3: s3://us-east-1/my-loki-bucket
    region: us-east-1
    s3forcepathstyle: false
```

### S3 with Server-Side Encryption

```yaml
storage_config:
  aws:
    s3: s3://us-east-1/my-loki-bucket
    region: us-east-1
    sse:
      type: SSE-S3  # or SSE-KMS
      # For SSE-KMS:
      # kms_key_id: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
```

### S3 Lifecycle Rules

Configure S3 lifecycle rules for cost optimization:

```json
{
  "Rules": [
    {
      "ID": "loki-transition-to-glacier",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "chunks/"
      },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER_IR"
        }
      ]
    },
    {
      "ID": "loki-delete-old-chunks",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "chunks/"
      },
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

## Google Cloud Storage

### Basic GCS Configuration

```yaml
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: gcs
      schema: v13
      index:
        prefix: loki_index_
        period: 24h

storage_config:
  gcs:
    bucket_name: my-loki-bucket
    chunk_buffer_size: 0
    request_timeout: 0s
    enable_http2: true

  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    cache_ttl: 24h
    shared_store: gcs

compactor:
  working_directory: /loki/compactor
  shared_store: gcs
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  delete_request_store: gcs
```

### GCS with Workload Identity (GKE)

Configure Workload Identity for secure access:

```bash
# Create GCS bucket
gsutil mb -l us-central1 gs://my-loki-bucket

# Create service account
gcloud iam service-accounts create loki-gcs \
  --display-name="Loki GCS Service Account"

# Grant permissions
gsutil iam ch \
  serviceAccount:loki-gcs@my-project.iam.gserviceaccount.com:objectAdmin \
  gs://my-loki-bucket

# Bind Workload Identity
gcloud iam service-accounts add-iam-policy-binding \
  loki-gcs@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[loki/loki]"
```

Kubernetes Service Account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: loki
  namespace: loki
  annotations:
    iam.gke.io/gcp-service-account: loki-gcs@my-project.iam.gserviceaccount.com
```

### GCS with Service Account Key

If not using Workload Identity:

```yaml
storage_config:
  gcs:
    bucket_name: my-loki-bucket
    service_account: |
      {
        "type": "service_account",
        "project_id": "my-project",
        "private_key_id": "...",
        "private_key": "...",
        "client_email": "loki@my-project.iam.gserviceaccount.com",
        ...
      }
```

Or mount as a file:

```yaml
# In deployment
env:
  - name: GOOGLE_APPLICATION_CREDENTIALS
    value: /secrets/gcs-key.json
volumeMounts:
  - name: gcs-key
    mountPath: /secrets
volumes:
  - name: gcs-key
    secret:
      secretName: loki-gcs-key
```

## Azure Blob Storage

### Basic Azure Configuration

```yaml
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: azure
      schema: v13
      index:
        prefix: loki_index_
        period: 24h

storage_config:
  azure:
    account_name: mystorageaccount
    account_key: ${AZURE_STORAGE_KEY}
    container_name: loki
    use_managed_identity: false
    request_timeout: 0s
    max_retries: 4
    min_retry_delay: 10ms
    max_retry_delay: 500ms

  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    cache_ttl: 24h
    shared_store: azure

compactor:
  working_directory: /loki/compactor
  shared_store: azure
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  delete_request_store: azure
```

### Azure with Managed Identity (AKS)

Enable AAD Pod Identity or Workload Identity:

```yaml
storage_config:
  azure:
    account_name: mystorageaccount
    container_name: loki
    use_managed_identity: true
    user_assigned_id: /subscriptions/xxx/resourcegroups/xxx/providers/Microsoft.ManagedIdentity/userAssignedIdentities/loki-identity
```

Assign Storage Blob Data Contributor role:

```bash
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee-object-id <managed-identity-object-id> \
  --scope /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<account>
```

### Azure with SAS Token

```yaml
storage_config:
  azure:
    account_name: mystorageaccount
    container_name: loki
    use_service_principal: false
    # Use environment variable for SAS token
    # Set AZURE_STORAGE_SAS_TOKEN in your deployment
```

## MinIO (Self-Hosted S3)

MinIO provides S3-compatible storage for on-premises or self-hosted deployments.

### MinIO Deployment

```yaml
version: "3.8"

services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=loki
      - MINIO_ROOT_PASSWORD=supersecret
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  minio-data:
```

### Loki Configuration for MinIO

```yaml
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h

storage_config:
  aws:
    s3: http://loki:supersecret@minio:9000/loki-data
    s3forcepathstyle: true
    bucketnames: loki-data
    region: us-east-1
    insecure: true
    access_key_id: loki
    secret_access_key: supersecret

  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    cache_ttl: 24h
    shared_store: s3

compactor:
  working_directory: /loki/compactor
  shared_store: s3
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  delete_request_store: s3
```

### MinIO with TLS

```yaml
storage_config:
  aws:
    s3: https://minio.example.com/loki-data
    s3forcepathstyle: true
    bucketnames: loki-data
    access_key_id: ${MINIO_ACCESS_KEY}
    secret_access_key: ${MINIO_SECRET_KEY}
    insecure: false
    http_config:
      tls_config:
        ca_file: /certs/ca.crt
```

### MinIO Distributed Mode

For high availability, deploy MinIO in distributed mode:

```yaml
version: "3.8"

services:
  minio1:
    image: minio/minio:latest
    command: server http://minio{1...4}/data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=loki
      - MINIO_ROOT_PASSWORD=supersecret
    volumes:
      - minio1-data:/data
    # ... additional configuration

  minio2:
    # Similar configuration
  minio3:
    # Similar configuration
  minio4:
    # Similar configuration
```

## Storage Configuration Best Practices

### Separate Buckets for Components

```yaml
storage_config:
  aws:
    bucketnames: loki-chunks
    region: us-east-1

ruler:
  storage:
    type: s3
    s3:
      bucketnames: loki-ruler

compactor:
  delete_request_store: s3
```

### Caching Configuration

Enable caching for better read performance:

```yaml
storage_config:
  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    cache_ttl: 24h

chunk_store_config:
  chunk_cache_config:
    embedded_cache:
      enabled: true
      max_size_mb: 500
      ttl: 1h

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 500
        ttl: 1h
```

### Retention Configuration

Configure retention to manage storage costs:

```yaml
limits_config:
  retention_period: 720h  # 30 days

compactor:
  working_directory: /loki/compactor
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
  delete_request_store: s3
```

## Verifying Storage Configuration

### Check Storage Health

```bash
# Port-forward to Loki
kubectl port-forward -n loki svc/loki 3100:3100

# Check ready endpoint
curl http://localhost:3100/ready

# Check metrics
curl http://localhost:3100/metrics | grep loki_boltdb_shipper
```

### Test Write and Read

```bash
# Push a test log
curl -X POST "http://localhost:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [{
      "stream": {"job": "storage-test"},
      "values": [["'"$(date +%s)"'000000000", "storage test message"]]
    }]
  }'

# Query the log
curl -G "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="storage-test"}' \
  --data-urlencode 'limit=10'
```

### Monitor Storage Metrics

Key metrics to monitor:

```promql
# Chunk store operations
rate(loki_chunk_store_chunks_stored_total[5m])

# Storage errors
rate(loki_boltdb_shipper_request_duration_seconds_count{status_code!="200"}[5m])

# Compactor progress
loki_compactor_running
```

## Troubleshooting

### S3 Permission Issues

```bash
# Check bucket access
aws s3 ls s3://my-loki-bucket/

# Verify IAM permissions
aws sts get-caller-identity
```

### GCS Authentication Failures

```bash
# Verify service account
gcloud auth list

# Test bucket access
gsutil ls gs://my-loki-bucket/
```

### Storage Timeouts

Increase timeouts in configuration:

```yaml
storage_config:
  aws:
    http_config:
      idle_conn_timeout: 120s
      response_header_timeout: 60s
```

## Conclusion

Choosing the right storage backend for Loki depends on your infrastructure, scale, and requirements:

- Use **Filesystem** for development and testing
- Use **AWS S3** for production AWS deployments with IRSA
- Use **GCS** for production GCP deployments with Workload Identity
- Use **Azure Blob** for production Azure deployments with Managed Identity
- Use **MinIO** for self-hosted S3-compatible storage

Key recommendations:

- Always enable caching for better read performance
- Configure appropriate retention policies to manage costs
- Use IAM roles or managed identities instead of static credentials
- Monitor storage metrics for early detection of issues
- Consider data lifecycle policies for long-term cost optimization

With proper storage configuration, Loki can efficiently handle petabytes of log data while maintaining query performance.
