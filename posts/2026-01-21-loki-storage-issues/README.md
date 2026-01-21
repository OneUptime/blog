# How to Fix Loki Storage Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Storage, Troubleshooting, Index, Chunks, S3, Filesystem

Description: A comprehensive guide to diagnosing and resolving Loki storage issues including chunk corruption, index problems, disk space issues, and object storage configuration for reliable log storage.

---

Storage issues in Grafana Loki can manifest as missing logs, query failures, ingestion errors, or disk space exhaustion. Understanding Loki's storage architecture and common failure modes helps you quickly diagnose and resolve these problems. This guide covers troubleshooting for both local filesystem and object storage backends.

## Understanding Loki Storage

### Storage Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Loki Storage Architecture                     │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Ingester   │────▶│    Chunks    │────▶│   Storage    │    │
│  │   (Memory)   │     │  (Compressed │     │  (S3/GCS/    │    │
│  │              │     │   Log Data)  │     │   Filesystem)│    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                                          │            │
│         │                                          │            │
│         ▼                                          │            │
│  ┌──────────────┐                                 │            │
│  │    Index     │─────────────────────────────────┘            │
│  │  (TSDB/BoltDB)│                                              │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Common Storage Issues

1. **Disk space exhaustion**: Full disk prevents ingestion
2. **Chunk corruption**: Data integrity issues
3. **Index corruption**: Query failures
4. **Compaction failures**: Storage not reclaimed
5. **S3/GCS access errors**: Connectivity or permission issues
6. **WAL issues**: Write-ahead log problems

## Diagnostic Steps

### Check Storage Metrics

```bash
# Storage metrics
curl -s http://loki:3100/metrics | grep -E "loki_ingester_memory|loki_chunk|loki_store"

# Disk usage
curl -s http://loki:3100/metrics | grep "loki_ingester_wal"

# Compactor metrics
curl -s http://loki:3100/metrics | grep "loki_compactor"
```

### Check Loki Logs

```bash
# Find storage errors
docker logs loki 2>&1 | grep -i "storage\|chunk\|index\|disk\|s3\|gcs"

# Check for I/O errors
docker logs loki 2>&1 | grep -i "i/o\|read\|write\|corrupt"
```

### Check Disk Space

```bash
# Check Loki data directory
df -h /loki

# Check directory sizes
du -sh /loki/*

# Check inode usage
df -i /loki
```

## Filesystem Storage Issues

### Disk Full Errors

**Error message:**
```
no space left on device
write /loki/chunks/...: no space left on device
```

**Solution:**

```bash
# Check what is using space
du -sh /loki/*

# Check for old/uncompacted data
ls -lah /loki/chunks/

# Enable retention and compaction
```

```yaml
# loki-config.yaml
compactor:
  working_directory: /loki/compactor
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150

limits_config:
  retention_period: 720h  # 30 days
```

### Index Corruption

**Error message:**
```
error opening tsdb index
index file corrupted
```

**Solution:**

```bash
# Stop Loki
docker stop loki

# Check index files
ls -la /loki/tsdb-index/

# Remove corrupted index (will rebuild from chunks)
rm -rf /loki/tsdb-index/*

# Start Loki
docker start loki
```

### Chunk Corruption

**Error message:**
```
chunk checksum mismatch
error reading chunk
```

**Solution:**

```bash
# Identify corrupted chunks
docker logs loki 2>&1 | grep "corrupt\|checksum" | grep -oE '/loki/chunks/[^ ]+'

# Remove corrupted chunks (data loss)
rm /loki/chunks/corrupted_chunk_file

# Or move to quarantine for analysis
mv /loki/chunks/corrupted_chunk_file /loki/quarantine/
```

### WAL Issues

**Error message:**
```
wal replay failed
error opening wal
```

**Solution:**

```bash
# Check WAL directory
ls -la /loki/wal/

# Check WAL size
du -sh /loki/wal/

# Clear WAL (potential data loss for unflushed logs)
rm -rf /loki/wal/*
```

```yaml
# Configure WAL properly
ingester:
  wal:
    enabled: true
    dir: /loki/wal
    checkpoint_duration: 5m
    flush_on_shutdown: true
    replay_memory_ceiling: 4GB
```

## Object Storage Issues

### S3 Connection Errors

**Error message:**
```
error connecting to s3
NoCredentialProviders
AccessDenied
```

**Solution:**

```yaml
# loki-config.yaml - Verify S3 configuration
storage_config:
  aws:
    s3: s3://bucket-name
    region: us-east-1
    access_key_id: ${AWS_ACCESS_KEY_ID}
    secret_access_key: ${AWS_SECRET_ACCESS_KEY}
    # Or use IAM role
    # s3: s3://region/bucket-name
    sse_encryption: true
    insecure: false
```

```bash
# Test S3 access
aws s3 ls s3://bucket-name/

# Check IAM permissions
aws sts get-caller-identity
```

**Required S3 IAM permissions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-loki-bucket",
        "arn:aws:s3:::your-loki-bucket/*"
      ]
    }
  ]
}
```

### GCS Connection Errors

**Error message:**
```
error connecting to gcs
failed to create GCS client
```

**Solution:**

```yaml
# loki-config.yaml - Verify GCS configuration
storage_config:
  gcs:
    bucket_name: your-loki-bucket
    # Use service account key file
    service_account: /etc/loki/gcp-key.json
```

```bash
# Test GCS access
gsutil ls gs://your-loki-bucket/

# Check service account permissions
gcloud auth list
```

### Azure Blob Storage Issues

```yaml
# loki-config.yaml
storage_config:
  azure:
    account_name: ${AZURE_STORAGE_ACCOUNT}
    account_key: ${AZURE_STORAGE_KEY}
    container_name: loki
    # Or use MSI
    use_managed_identity: true
```

### Object Storage Timeouts

**Error message:**
```
context deadline exceeded
timeout waiting for s3 response
```

**Solution:**

```yaml
# Increase timeouts
storage_config:
  aws:
    s3: s3://bucket-name
    region: us-east-1
    http_config:
      idle_conn_timeout: 90s
      response_header_timeout: 120s
      insecure_skip_verify: false
```

## Compaction Issues

### Compaction Not Running

```bash
# Check compactor status
curl -s http://loki:3100/compactor/ring | jq

# Check compactor metrics
curl -s http://loki:3100/metrics | grep loki_compactor
```

```yaml
# Enable compaction
compactor:
  working_directory: /loki/compactor
  shared_store: s3
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
  delete_request_store: s3
```

### Compaction Failures

**Error message:**
```
compaction failed
error during compaction cycle
```

**Solution:**

```bash
# Check compactor logs
docker logs loki 2>&1 | grep -i "compactor\|compaction"

# Check compactor working directory
ls -la /loki/compactor/

# Clear compactor state if corrupted
rm -rf /loki/compactor/*
```

## Retention Issues

### Old Data Not Being Deleted

```yaml
# Ensure retention is configured correctly
limits_config:
  retention_period: 720h  # 30 days

compactor:
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
  # Must match storage backend
  delete_request_store: filesystem  # or s3, gcs
```

### Check Retention Status

```bash
# Check deletion status
curl -s http://loki:3100/compactor/delete_requests | jq

# View retention metrics
curl -s http://loki:3100/metrics | grep "loki_compactor_delete"
```

## Storage Migration

### Migrating from Filesystem to S3

```yaml
# Step 1: Configure new S3 storage
storage_config:
  aws:
    s3: s3://new-bucket
    region: us-east-1

# Step 2: Add new schema period
schema_config:
  configs:
    # Old filesystem period
    - from: 2023-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v12
      index:
        prefix: index_
        period: 24h
    # New S3 period
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: index_
        period: 24h
```

## Monitoring Storage Health

### Prometheus Alerts

```yaml
groups:
  - name: loki-storage
    rules:
      - alert: LokiStorageHighDiskUsage
        expr: |
          (node_filesystem_size_bytes{mountpoint="/loki"} - node_filesystem_free_bytes{mountpoint="/loki"})
          / node_filesystem_size_bytes{mountpoint="/loki"} > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Loki storage disk usage above 85%"

      - alert: LokiChunkStoreFailed
        expr: |
          rate(loki_chunk_store_index_entries_per_chunk_count{status="error"}[5m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Loki chunk store failures"

      - alert: LokiCompactionFailed
        expr: |
          rate(loki_compactor_running_compactions{status="error"}[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Loki compaction failures"
```

### Storage Dashboard

```json
{
  "dashboard": {
    "title": "Loki Storage Health",
    "panels": [
      {
        "title": "Disk Usage",
        "type": "gauge",
        "targets": [
          {
            "expr": "(node_filesystem_size_bytes{mountpoint=\"/loki\"} - node_filesystem_free_bytes{mountpoint=\"/loki\"}) / node_filesystem_size_bytes{mountpoint=\"/loki\"} * 100"
          }
        ]
      },
      {
        "title": "Chunk Store Operations",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(loki_chunk_store_chunks_fetched_total[5m])",
            "legendFormat": "Fetched"
          },
          {
            "expr": "rate(loki_chunk_store_chunks_stored_total[5m])",
            "legendFormat": "Stored"
          }
        ]
      },
      {
        "title": "Compaction Progress",
        "type": "timeseries",
        "targets": [
          {
            "expr": "loki_compactor_running_compactions"
          }
        ]
      }
    ]
  }
}
```

## Best Practices

1. **Monitor Disk Space**: Alert before reaching capacity
2. **Enable Retention**: Configure appropriate retention periods
3. **Regular Compaction**: Ensure compactor is running
4. **Backup Strategy**: Backup index and chunks regularly
5. **Use Object Storage**: For production, use S3/GCS/Azure
6. **Test Recovery**: Regularly test backup restoration
7. **Schema Versioning**: Plan schema migrations carefully

## Quick Reference

### Storage Health Check Commands

```bash
# Check disk space
df -h /loki

# Check storage metrics
curl -s http://loki:3100/metrics | grep -E "chunk|index|storage"

# Check compactor
curl -s http://loki:3100/compactor/ring

# Check ingester WAL
ls -la /loki/wal/
```

## Conclusion

Storage issues in Loki require understanding the relationship between chunks, indexes, and the underlying storage backend. By properly configuring retention, monitoring disk usage, and ensuring compaction runs successfully, you can maintain a healthy and efficient Loki storage system.

Key takeaways:
- Monitor disk usage and set up alerts
- Enable and configure retention properly
- Ensure compaction is running successfully
- Use object storage for production workloads
- Backup indexes and critical data
- Test recovery procedures regularly
- Plan schema migrations carefully
