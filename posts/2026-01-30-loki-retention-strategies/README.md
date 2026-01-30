# How to Implement Loki Retention Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Loki, Logging, Observability, Storage

Description: Configure Grafana Loki retention policies with compactor-based deletion, per-tenant limits, and storage tiering for cost-effective log management.

---

## Introduction

Managing log retention in Grafana Loki requires understanding how Loki stores data and which components handle deletion. Unlike traditional databases where you simply set a TTL, Loki's architecture involves chunks, indexes, and a compactor service that work together to enforce retention policies.

This guide covers the practical implementation of retention strategies in Loki, from basic configuration to advanced per-tenant overrides. We will walk through working configurations, explain the trade-offs between different approaches, and help you build a retention strategy that balances cost with operational requirements.

## Understanding Loki's Storage Model

Before diving into retention configuration, you need to understand how Loki stores logs.

### Chunks and Indexes

Loki stores log data in two types of objects:

| Component | Purpose | Storage Backend |
|-----------|---------|-----------------|
| Chunks | Compressed log data | Object storage (S3, GCS, filesystem) |
| Index | Metadata for querying chunks | BoltDB, Cassandra, or object storage (TSDB) |

Chunks contain the actual log lines, compressed and grouped by stream. The index maps labels and time ranges to specific chunks, enabling efficient queries.

### The TSDB Index (Recommended)

Starting with Loki 2.8, the TSDB index is the recommended schema. It stores indexes in object storage alongside chunks, simplifying operations and enabling better retention handling.

Here is a basic schema configuration using TSDB:

```yaml
# loki-config.yaml
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h
```

The `period: 24h` setting creates daily index tables. This matters for retention because deletion happens at the table level for older index types.

## Compactor-Based Retention

The compactor is Loki's primary mechanism for enforcing retention. It runs as a separate target (or within the single binary) and handles chunk deletion based on configured policies.

### Enabling the Compactor

First, enable the compactor and configure retention:

```yaml
# loki-config.yaml
compactor:
  # Working directory for compaction
  working_directory: /loki/compactor

  # Shared store configuration - must match your chunk storage
  shared_store: s3

  # How often the compactor runs
  compaction_interval: 10m

  # Enable retention enforcement
  retention_enabled: true

  # How often to check for chunks to delete
  retention_delete_delay: 2h

  # Number of workers for deletion
  retention_delete_worker_count: 150

  # Delete request cancel period
  delete_request_cancel_period: 24h
```

The `retention_delete_delay` parameter adds a safety buffer. Chunks marked for deletion wait this duration before actual removal. This gives you time to cancel accidental deletions.

### Global Retention Period

Set a default retention period that applies to all tenants:

```yaml
# loki-config.yaml
limits_config:
  # Global retention period - logs older than this are deleted
  retention_period: 744h  # 31 days

  # Allow custom retention through log selectors
  allow_deletes: true
```

The `retention_period` value uses Go duration format. Common values:

| Duration | Days | Use Case |
|----------|------|----------|
| 168h | 7 | Development environments |
| 720h | 30 | Standard production |
| 2160h | 90 | Compliance requirements |
| 8760h | 365 | Long-term audit logs |

### Complete Basic Configuration

Here is a complete configuration enabling compactor retention with S3 storage:

```yaml
# loki-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    s3:
      endpoint: s3.us-east-1.amazonaws.com
      bucketnames: loki-chunks
      region: us-east-1
      access_key_id: ${AWS_ACCESS_KEY_ID}
      secret_access_key: ${AWS_SECRET_ACCESS_KEY}
      s3forcepathstyle: false
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

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
  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    cache_ttl: 24h

compactor:
  working_directory: /loki/compactor
  shared_store: s3
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150

limits_config:
  retention_period: 720h  # 30 days
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
  max_streams_per_user: 10000
  max_entries_limit_per_query: 5000
```

## Per-Tenant Retention Overrides

In multi-tenant deployments, different teams often have different retention requirements. Loki supports per-tenant overrides through a runtime configuration file.

### Configuring Runtime Overrides

First, tell Loki where to find the overrides file:

```yaml
# loki-config.yaml
runtime_config:
  file: /loki/runtime-config.yaml
  period: 10s  # How often to reload
```

Then create the overrides file:

```yaml
# runtime-config.yaml
overrides:
  # Team with short retention needs
  team-development:
    retention_period: 168h  # 7 days
    ingestion_rate_mb: 5
    max_streams_per_user: 5000

  # Team requiring longer retention for compliance
  team-security:
    retention_period: 8760h  # 365 days
    ingestion_rate_mb: 20
    max_streams_per_user: 50000

  # Default tenant with standard settings
  team-platform:
    retention_period: 720h  # 30 days
```

### Stream-Based Retention

You can apply different retention periods based on log stream selectors. This enables fine-grained control within a single tenant.

```yaml
# runtime-config.yaml
overrides:
  production:
    retention_period: 720h  # Default: 30 days
    retention_stream:
      # Keep error logs longer
      - selector: '{level="error"}'
        priority: 1
        period: 2160h  # 90 days

      # Keep audit logs for compliance
      - selector: '{log_type="audit"}'
        priority: 2
        period: 8760h  # 365 days

      # Delete debug logs quickly
      - selector: '{level="debug"}'
        priority: 3
        period: 72h  # 3 days

      # Short retention for high-volume health checks
      - selector: '{endpoint="/health"}'
        priority: 4
        period: 24h  # 1 day
```

The `priority` field determines which rule wins when multiple selectors match. Higher priority values take precedence.

### Dynamic Override Reloading

The compactor automatically reloads runtime configuration at the interval specified by `period`. To verify overrides are applied, check the compactor logs:

```bash
# View compactor logs for retention activity
kubectl logs -l app=loki-compactor | grep -i retention
```

You should see entries like:

```
level=info ts=2026-01-30T10:00:00.000Z caller=compactor.go:450 msg="applying retention" tenant=team-security retention=8760h0m0s
```

## Table Manager vs Compactor Retention

Loki historically used the Table Manager for retention with BoltDB indexes. Understanding the differences helps when migrating or maintaining older deployments.

### Comparison

| Feature | Table Manager | Compactor |
|---------|---------------|-----------|
| Index Support | BoltDB-shipper | TSDB, BoltDB |
| Deletion Granularity | Table-level | Chunk-level |
| Per-Tenant Overrides | Limited | Full support |
| Stream Selectors | No | Yes |
| Status | Deprecated | Recommended |

### Table Manager Configuration (Legacy)

If you are still running BoltDB indexes, here is how Table Manager retention works:

```yaml
# loki-config.yaml (legacy configuration)
table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days

  # Table creation settings
  index_tables_provisioning:
    inactive_read_throughput: 1
    inactive_write_throughput: 1
    provisioned_read_throughput: 100
    provisioned_write_throughput: 100

  chunk_tables_provisioning:
    inactive_read_throughput: 1
    inactive_write_throughput: 1
    provisioned_read_throughput: 100
    provisioned_write_throughput: 100
```

### Migration Path

To migrate from Table Manager to Compactor retention:

1. Deploy the new schema alongside the old one
2. Enable compactor retention for new data
3. Let Table Manager handle old data until it ages out
4. Remove Table Manager configuration after full migration

```yaml
# Schema configuration for migration
schema_config:
  configs:
    # Old schema - Table Manager handles retention
    - from: 2023-01-01
      store: boltdb-shipper
      object_store: s3
      schema: v12
      index:
        prefix: loki_index_
        period: 24h

    # New schema - Compactor handles retention
    - from: 2024-06-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_tsdb_
        period: 24h
```

## Deletion Markers and the Deletion API

Beyond automatic retention, Loki supports manual deletion through its API. This is useful for removing sensitive data or clearing specific log streams.

### Enabling the Deletion API

```yaml
# loki-config.yaml
compactor:
  retention_enabled: true
  delete_request_cancel_period: 24h

limits_config:
  allow_deletes: true
```

### Creating Delete Requests

Use the deletion API to mark logs for removal:

```bash
# Delete all logs matching a selector within a time range
curl -X POST \
  "http://loki:3100/loki/api/v1/delete" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "query={app=\"legacy-service\"}" \
  -d "start=1704067200000000000" \
  -d "end=1706745600000000000"
```

The timestamps are in nanoseconds. Convert from Unix timestamps:

```bash
# Convert Unix timestamp to nanoseconds
START_NS=$(($(date -d "2024-01-01" +%s) * 1000000000))
END_NS=$(($(date -d "2024-02-01" +%s) * 1000000000))

curl -X POST \
  "http://loki:3100/loki/api/v1/delete" \
  -d "query={app=\"legacy-service\"}" \
  -d "start=${START_NS}" \
  -d "end=${END_NS}"
```

### Listing and Canceling Delete Requests

View pending deletions:

```bash
# List all delete requests
curl "http://loki:3100/loki/api/v1/delete"
```

Response:

```json
[
  {
    "request_id": "abc123",
    "start_time": 1704067200000000000,
    "end_time": 1706745600000000000,
    "query": "{app=\"legacy-service\"}",
    "status": "received",
    "created_at": 1706800000000000000
  }
]
```

Cancel a pending deletion (within the cancel period):

```bash
curl -X DELETE \
  "http://loki:3100/loki/api/v1/delete?request_id=abc123"
```

### Delete Request States

| State | Description |
|-------|-------------|
| received | Request received, waiting for cancel period |
| building | Cancel period passed, building deletion plan |
| deleting | Actively deleting chunks |
| processed | Deletion complete |

## Storage Considerations

Retention configuration directly impacts storage costs and performance. Here are key considerations for production deployments.

### Object Storage Lifecycle Policies

Combine Loki retention with cloud provider lifecycle policies for defense in depth:

```json
{
  "Rules": [
    {
      "ID": "loki-chunks-cleanup",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "loki/chunks/"
      },
      "Expiration": {
        "Days": 45
      }
    },
    {
      "ID": "loki-index-cleanup",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "loki/index/"
      },
      "Expiration": {
        "Days": 45
      }
    }
  ]
}
```

Set the lifecycle policy expiration slightly longer than your Loki retention to catch any orphaned objects.

### Storage Tiering for Cost Optimization

Move older logs to cheaper storage tiers before deletion:

```json
{
  "Rules": [
    {
      "ID": "loki-tiering",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "loki/"
      },
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 30,
          "StorageClass": "GLACIER_IR"
        }
      ],
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

### Chunk Size and Compression

Optimize chunk configuration to reduce storage:

```yaml
# loki-config.yaml
ingester:
  chunk_encoding: snappy  # Options: gzip, lz4, snappy, zstd
  chunk_target_size: 1572864  # 1.5MB target
  chunk_idle_period: 30m
  chunk_block_size: 262144  # 256KB

  # Flush chunks before they get too old
  max_chunk_age: 2h

  # Number of chunks to keep in memory
  chunk_retain_period: 30s
```

Compression comparison:

| Algorithm | Compression Ratio | CPU Usage | Best For |
|-----------|-------------------|-----------|----------|
| snappy | Good | Low | General use |
| lz4 | Good | Low | High throughput |
| gzip | Better | Medium | Storage constrained |
| zstd | Best | Medium-High | Cold storage |

## Monitoring Retention

Track retention effectiveness with these metrics.

### Key Compactor Metrics

```yaml
# Prometheus recording rules for retention monitoring
groups:
  - name: loki-retention
    rules:
      # Compactor deletion rate
      - record: loki:compactor:deletions_per_hour
        expr: |
          sum(rate(loki_compactor_deleted_bytes_total[1h])) * 3600

      # Pending deletion requests
      - record: loki:compactor:pending_deletions
        expr: |
          sum(loki_compactor_pending_delete_requests_count)

      # Compaction lag
      - record: loki:compactor:lag_seconds
        expr: |
          time() - max(loki_compactor_last_successful_run_timestamp_seconds)
```

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: loki-retention-alerts
    rules:
      # Alert if compactor is not running
      - alert: LokiCompactorNotRunning
        expr: |
          time() - max(loki_compactor_last_successful_run_timestamp_seconds) > 3600
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Loki compactor has not run in over an hour"
          description: "Retention policies are not being enforced"

      # Alert on high deletion backlog
      - alert: LokiDeletionBacklog
        expr: |
          loki_compactor_pending_delete_requests_count > 100
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "High number of pending deletion requests"

      # Alert on storage growth despite retention
      - alert: LokiStorageGrowth
        expr: |
          predict_linear(loki_chunk_store_stored_bytes[7d], 86400 * 30) >
          loki_chunk_store_stored_bytes * 1.5
        for: 6h
        labels:
          severity: info
        annotations:
          summary: "Loki storage growing faster than retention is removing"
```

### Grafana Dashboard Queries

Create a retention monitoring dashboard:

```sql
-- Deleted bytes over time
sum(rate(loki_compactor_deleted_bytes_total[$__rate_interval])) by (tenant)

-- Current storage by tenant
sum(loki_chunk_store_stored_bytes) by (tenant)

-- Retention efficiency (deleted vs ingested)
sum(rate(loki_compactor_deleted_bytes_total[24h]))
/
sum(rate(loki_distributor_bytes_received_total[24h]))

-- Time until storage exhaustion
(storage_limit_bytes - sum(loki_chunk_store_stored_bytes))
/
(sum(rate(loki_distributor_bytes_received_total[7d]))
  - sum(rate(loki_compactor_deleted_bytes_total[7d])))
```

## Production Deployment Patterns

### Single Binary with Retention

For smaller deployments, run everything in one process:

```yaml
# docker-compose.yml
version: "3.8"
services:
  loki:
    image: grafana/loki:2.9.3
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml
      - ./runtime-config.yaml:/etc/loki/runtime.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/config.yaml -target=all

volumes:
  loki-data:
```

### Dedicated Compactor in Microservices Mode

For larger deployments, run the compactor as a dedicated service:

```yaml
# kubernetes/compactor-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-compactor
spec:
  replicas: 1  # Only one compactor instance
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
          image: grafana/loki:2.9.3
          args:
            - -config.file=/etc/loki/config.yaml
            - -target=compactor
          ports:
            - containerPort: 3100
              name: http
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
        - name: data
          persistentVolumeClaim:
            claimName: loki-compactor-data
```

The compactor must run as a singleton. Running multiple instances causes data corruption.

### Helm Chart Configuration

Using the official Loki Helm chart:

```yaml
# values.yaml
loki:
  auth_enabled: false

  commonConfig:
    replication_factor: 1

  storage:
    type: s3
    s3:
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      bucketNames:
        chunks: loki-chunks
        ruler: loki-ruler
        admin: loki-admin

  schemaConfig:
    configs:
      - from: 2024-01-01
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: loki_index_
          period: 24h

  limits_config:
    retention_period: 720h
    allow_deletes: true

  compactor:
    retention_enabled: true
    retention_delete_delay: 2h
    retention_delete_worker_count: 150

compactor:
  enabled: true
  replicas: 1
  persistence:
    enabled: true
    size: 10Gi

# Runtime configuration for per-tenant overrides
runtimeConfig:
  overrides:
    team-a:
      retention_period: 168h
    team-b:
      retention_period: 2160h
```

## Troubleshooting Retention Issues

### Logs Not Being Deleted

Check the compactor is running and retention is enabled:

```bash
# Check compactor status
curl http://loki:3100/compactor/ring

# Check if retention is enabled in config
curl http://loki:3100/config | grep -A 10 "compactor"
```

Common causes:
- `retention_enabled: false` in config
- Compactor not reaching the chunks (network or permission issues)
- Delete delay has not passed yet

### Debugging Retention Boundaries

Verify what the compactor sees as retention boundaries:

```bash
# Check compactor logs for retention decisions
kubectl logs deployment/loki-compactor | grep "retention boundary"
```

### Storage Not Decreasing

If storage does not decrease after retention runs:

1. Check if lifecycle policies are conflicting
2. Verify the compactor has write access to delete objects
3. Look for orphaned chunks from failed compactions

```bash
# List objects that should have been deleted
aws s3 ls s3://loki-chunks/chunks/ --recursive | \
  awk '$1 < "2024-01-01" {print $4}'
```

### Per-Tenant Overrides Not Applied

Verify runtime config is loaded:

```bash
# Check runtime config hash
curl http://loki:3100/runtime_config?mode=diff
```

Ensure the tenant ID matches exactly (case-sensitive).

## Best Practices Summary

1. **Start with compactor retention** - Table Manager is deprecated and has limited functionality.

2. **Set conservative defaults** - Start with longer retention and reduce based on observed usage patterns.

3. **Use stream selectors wisely** - Apply longer retention only to high-value logs like errors and audit trails.

4. **Monitor compaction lag** - A backlog indicates the compactor cannot keep up with ingestion.

5. **Combine with lifecycle policies** - Use cloud provider policies as a safety net, not the primary mechanism.

6. **Test deletion in staging** - Verify retention policies work correctly before applying to production.

7. **Document retention policies** - Teams need to know how long their logs persist for debugging and compliance.

8. **Plan for growth** - Ingestion typically grows faster than deletion, so build in headroom.

## Conclusion

Implementing effective retention in Loki requires configuring the compactor correctly and understanding how chunks and indexes interact. Start with the compactor-based approach using TSDB indexes for new deployments. Use per-tenant overrides to give teams flexibility while maintaining cost control. Monitor retention effectiveness with dedicated dashboards and alerts to catch issues before storage costs spiral.

The configurations in this guide provide a solid foundation. Adjust retention periods based on your compliance requirements, debugging needs, and budget constraints. Remember that retention is a balance - too short and you lose valuable debugging context, too long and storage costs become unsustainable.
