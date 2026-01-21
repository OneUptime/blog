# How to Configure Loki Retention and Compaction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Retention, Compaction, Storage Management, Log Lifecycle, Operations

Description: A comprehensive guide to configuring retention and compaction in Grafana Loki, covering retention policies, compactor configuration, storage lifecycle management, and cost optimization strategies.

---

Effective retention and compaction configuration is essential for managing storage costs and maintaining Loki performance. This guide covers how to configure retention policies, set up the compactor, and implement storage lifecycle management for your Loki deployment.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki 2.4 or later deployed
- Object storage backend configured (S3, GCS, Azure Blob, or MinIO)
- Understanding of Loki's storage architecture
- Access to modify Loki configuration

## Understanding Loki Storage

Loki stores data in two forms:

- **Chunks**: Compressed log data
- **Index**: Metadata mapping labels to chunks

Both have independent retention considerations.

## Retention Configuration

### Basic Retention Setup

```yaml
limits_config:
  retention_period: 720h  # 30 days global default

compactor:
  working_directory: /loki/compactor
  shared_store: s3
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
  delete_request_store: s3
```

### Per-Tenant Retention

Configure different retention periods for different tenants:

```yaml
limits_config:
  retention_period: 720h  # 30 days default

overrides:
  production:
    retention_period: 2160h  # 90 days for production

  development:
    retention_period: 168h  # 7 days for development

  security:
    retention_period: 8760h  # 365 days for security logs
```

### Stream-Based Retention

Configure retention based on stream selectors:

```yaml
limits_config:
  retention_period: 720h
  retention_stream:
    - selector: '{namespace="production", level="error"}'
      priority: 1
      period: 2160h  # 90 days for production errors

    - selector: '{namespace="development"}'
      priority: 2
      period: 168h  # 7 days for dev logs

    - selector: '{job="audit"}'
      priority: 1
      period: 8760h  # 365 days for audit logs

    - selector: '{level="debug"}'
      priority: 3
      period: 72h  # 3 days for debug logs
```

## Compactor Configuration

### Complete Compactor Configuration

```yaml
compactor:
  # Working directory for temporary files
  working_directory: /loki/compactor

  # Storage backend for chunks
  shared_store: s3

  # How often to run compaction
  compaction_interval: 10m

  # Enable retention enforcement
  retention_enabled: true

  # Delay before actually deleting data
  retention_delete_delay: 2h

  # Number of parallel delete workers
  retention_delete_worker_count: 150

  # Storage for delete requests
  delete_request_store: s3

  # Maximum compaction parallelism
  max_compaction_parallelism: 10

  # Ring configuration for HA
  compactor_ring:
    kvstore:
      store: memberlist
    heartbeat_timeout: 1m
```

### S3-Specific Configuration

```yaml
compactor:
  working_directory: /loki/compactor
  shared_store: s3
  retention_enabled: true

storage_config:
  aws:
    s3: s3://us-east-1/loki-bucket
    s3forcepathstyle: false
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
    shared_store: s3
```

### GCS Configuration

```yaml
compactor:
  working_directory: /loki/compactor
  shared_store: gcs
  retention_enabled: true

storage_config:
  gcs:
    bucket_name: loki-bucket
```

## Delete API

Loki provides an API for on-demand deletion.

### Enable Delete API

```yaml
compactor:
  retention_enabled: true
  delete_request_store: s3

limits_config:
  allow_deletes: true
```

### Create Delete Request

```bash
# Delete logs matching selector
curl -X POST "http://loki:3100/loki/api/v1/delete" \
  -H "X-Scope-OrgID: production" \
  -H "Content-Type: application/json" \
  -d '{
    "match": {
      "selector": "{namespace=\"test\"}",
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    }
  }'
```

### List Delete Requests

```bash
curl "http://loki:3100/loki/api/v1/delete" \
  -H "X-Scope-OrgID: production"
```

### Cancel Delete Request

```bash
curl -X DELETE "http://loki:3100/loki/api/v1/delete?request_id=abc123" \
  -H "X-Scope-OrgID: production"
```

## Compaction Process

### How Compaction Works

1. **Index Compaction**: Combines small index files into larger ones
2. **Chunk Compaction**: Merges small chunks
3. **Retention Enforcement**: Deletes expired data

### Monitoring Compaction

```promql
# Compactor running status
loki_compactor_running

# Compaction duration
histogram_quantile(0.99, sum(rate(loki_compactor_compact_tables_operation_duration_seconds_bucket[5m])) by (le))

# Delete requests processed
loki_compactor_delete_requests_processed_total

# Retention bytes deleted
loki_compactor_retention_bytes_deleted_total
```

### Compaction Troubleshooting

```bash
# Check compactor logs
kubectl logs -n loki -l app=loki-compactor --tail=100

# Verify compactor is running
curl http://loki-compactor:3100/metrics | grep loki_compactor_running
```

## Table Manager (Legacy)

For older Loki versions using the table manager:

```yaml
table_manager:
  retention_deletes_enabled: true
  retention_period: 720h

  # Index table configuration
  index_tables_provisioning:
    enable_ondemand_throughput_mode: true
    enable_inactive_throughput_on_demand_mode: true

  # Chunk table configuration
  chunk_tables_provisioning:
    enable_ondemand_throughput_mode: true
    enable_inactive_throughput_on_demand_mode: true
```

## Storage Tiering

### Hot/Warm/Cold Storage

Configure different storage backends for different data ages:

```yaml
schema_config:
  configs:
    # Recent data (hot)
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h

storage_config:
  aws:
    s3: s3://us-east-1/loki-hot

  # S3 Lifecycle rules handle tiering
  # Configure in S3/GCS console or terraform
```

### S3 Lifecycle Rules for Tiering

```json
{
  "Rules": [
    {
      "ID": "loki-to-infrequent-access",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "chunks/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        }
      ]
    },
    {
      "ID": "loki-to-glacier",
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
    }
  ]
}
```

## Best Practices

### Retention Strategy

1. **Define Clear Policies**
   - Production logs: 30-90 days
   - Debug logs: 3-7 days
   - Audit/compliance: 1-7 years

2. **Use Stream-Based Retention**
   - Different retention for different log types
   - Shorter retention for high-volume, low-value logs

3. **Consider Compliance Requirements**
   - GDPR right to erasure
   - Industry-specific requirements
   - Legal hold capabilities

### Compaction Optimization

```yaml
compactor:
  # Tune based on data volume
  compaction_interval: 5m  # More frequent for high volume
  retention_delete_worker_count: 200  # More workers for faster deletion
  max_compaction_parallelism: 20  # Higher parallelism for large datasets
```

### Monitoring Recommendations

Set up alerts for:

```yaml
groups:
  - name: loki-compaction-alerts
    rules:
      - alert: LokiCompactorNotRunning
        expr: loki_compactor_running == 0
        for: 30m
        labels:
          severity: critical
        annotations:
          summary: "Loki compactor not running"

      - alert: LokiRetentionBacklog
        expr: loki_compactor_retention_bytes_to_delete > 1e12
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Large retention backlog"

      - alert: LokiCompactionSlow
        expr: |
          histogram_quantile(0.99,
            sum(rate(loki_compactor_compact_tables_operation_duration_seconds_bucket[5m])) by (le)
          ) > 600
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Compaction taking too long"
```

## Kubernetes Deployment

### Compactor StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki-compactor
  namespace: loki
spec:
  serviceName: loki-compactor
  replicas: 1  # Only one compactor should run
  selector:
    matchLabels:
      app: loki-compactor
  template:
    metadata:
      labels:
        app: loki-compactor
    spec:
      containers:
        - name: compactor
          image: grafana/loki:2.9.4
          args:
            - -config.file=/etc/loki/config.yaml
            - -target=compactor
          volumeMounts:
            - name: config
              mountPath: /etc/loki
            - name: data
              mountPath: /loki
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 4Gi
      volumes:
        - name: config
          configMap:
            name: loki-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

## Conclusion

Proper retention and compaction configuration is essential for Loki operations. Key takeaways:

- Configure retention at global, tenant, and stream levels
- Enable the compactor for retention enforcement
- Use stream-based retention for different log categories
- Monitor compaction metrics for health
- Consider storage tiering for cost optimization
- Plan for compliance requirements

With proper retention and compaction configuration, you can balance storage costs with data availability requirements.
