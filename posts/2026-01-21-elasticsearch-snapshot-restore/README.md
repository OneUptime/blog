# How to Set Up Elasticsearch Snapshot and Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Snapshot, Backup, Restore, S3, GCS, Disaster Recovery

Description: A comprehensive guide to setting up Elasticsearch snapshot and restore for backups, covering repository configuration for S3, GCS, and Azure, snapshot policies, and restore procedures.

---

Backups are critical for disaster recovery and data protection. Elasticsearch provides snapshot and restore functionality to back up indices to external storage like S3, GCS, or Azure Blob. This guide covers setting up reliable backup strategies.

## Understanding Snapshots

Snapshots are:
- Incremental (only changed data is stored)
- Point-in-time copies of indices
- Stored in snapshot repositories
- Restorable to same or different clusters

## Repository Configuration

### File System Repository (Local/NFS)

```bash
# First, configure path in elasticsearch.yml
# path.repo: ["/mount/backups", "/mount/backup2"]

# Register repository
curl -X PUT "https://localhost:9200/_snapshot/local_backup" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/mount/backups/elasticsearch",
      "compress": true,
      "max_snapshot_bytes_per_sec": "40mb",
      "max_restore_bytes_per_sec": "40mb"
    }
  }'
```

### AWS S3 Repository

Install the S3 plugin:

```bash
bin/elasticsearch-plugin install repository-s3
```

Configure AWS credentials:

```bash
# Using keystore (recommended)
bin/elasticsearch-keystore add s3.client.default.access_key
bin/elasticsearch-keystore add s3.client.default.secret_key
```

Register S3 repository:

```bash
curl -X PUT "https://localhost:9200/_snapshot/s3_backup" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "type": "s3",
    "settings": {
      "bucket": "my-elasticsearch-backups",
      "region": "us-east-1",
      "base_path": "snapshots",
      "compress": true,
      "server_side_encryption": true,
      "storage_class": "standard_ia"
    }
  }'
```

### Google Cloud Storage Repository

Install the GCS plugin:

```bash
bin/elasticsearch-plugin install repository-gcs
```

Configure GCS credentials:

```bash
# Add service account JSON to keystore
bin/elasticsearch-keystore add-file gcs.client.default.credentials_file /path/to/service-account.json
```

Register GCS repository:

```bash
curl -X PUT "https://localhost:9200/_snapshot/gcs_backup" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "type": "gcs",
    "settings": {
      "bucket": "my-elasticsearch-backups",
      "base_path": "snapshots",
      "compress": true
    }
  }'
```

### Azure Blob Storage Repository

Install the Azure plugin:

```bash
bin/elasticsearch-plugin install repository-azure
```

Configure Azure credentials:

```bash
bin/elasticsearch-keystore add azure.client.default.account
bin/elasticsearch-keystore add azure.client.default.key
```

Register Azure repository:

```bash
curl -X PUT "https://localhost:9200/_snapshot/azure_backup" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "type": "azure",
    "settings": {
      "container": "elasticsearch-snapshots",
      "base_path": "snapshots",
      "compress": true
    }
  }'
```

## Creating Snapshots

### Manual Snapshot

```bash
# Snapshot all indices
curl -X PUT "https://localhost:9200/_snapshot/s3_backup/snapshot_2024_01_15?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'
```

### Snapshot Specific Indices

```bash
curl -X PUT "https://localhost:9200/_snapshot/s3_backup/products_backup?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "products,orders,customers",
    "ignore_unavailable": true,
    "include_global_state": false,
    "metadata": {
      "taken_by": "admin",
      "reason": "Before major update"
    }
  }'
```

### Asynchronous Snapshot

```bash
# Start snapshot without waiting
curl -X PUT "https://localhost:9200/_snapshot/s3_backup/snapshot_async" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'

# Check status
curl -X GET "https://localhost:9200/_snapshot/s3_backup/snapshot_async/_status" \
  -u elastic:password
```

## Snapshot Lifecycle Management (SLM)

### Create SLM Policy

```bash
curl -X PUT "https://localhost:9200/_slm/policy/nightly-snapshots" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "schedule": "0 30 1 * * ?",
    "name": "<nightly-snap-{now/d}>",
    "repository": "s3_backup",
    "config": {
      "indices": ["*"],
      "ignore_unavailable": true,
      "include_global_state": false
    },
    "retention": {
      "expire_after": "30d",
      "min_count": 5,
      "max_count": 50
    }
  }'
```

### Execute SLM Policy Manually

```bash
curl -X POST "https://localhost:9200/_slm/policy/nightly-snapshots/_execute" \
  -u elastic:password
```

### View SLM Status

```bash
# Policy status
curl -X GET "https://localhost:9200/_slm/policy/nightly-snapshots" \
  -u elastic:password

# SLM statistics
curl -X GET "https://localhost:9200/_slm/stats" \
  -u elastic:password
```

### Multiple SLM Policies

```bash
# Hourly snapshots for critical indices
curl -X PUT "https://localhost:9200/_slm/policy/hourly-critical" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "schedule": "0 0 * * * ?",
    "name": "<hourly-critical-{now/H}>",
    "repository": "s3_backup",
    "config": {
      "indices": ["orders", "payments"],
      "ignore_unavailable": true,
      "include_global_state": false
    },
    "retention": {
      "expire_after": "7d",
      "min_count": 24
    }
  }'

# Weekly full snapshots
curl -X PUT "https://localhost:9200/_slm/policy/weekly-full" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "schedule": "0 0 0 ? * SUN",
    "name": "<weekly-full-{now/w}>",
    "repository": "s3_backup",
    "config": {
      "indices": ["*"],
      "ignore_unavailable": true,
      "include_global_state": true
    },
    "retention": {
      "expire_after": "90d",
      "min_count": 4
    }
  }'
```

## Listing and Viewing Snapshots

### List All Snapshots

```bash
curl -X GET "https://localhost:9200/_snapshot/s3_backup/_all" \
  -u elastic:password
```

### View Specific Snapshot

```bash
curl -X GET "https://localhost:9200/_snapshot/s3_backup/snapshot_2024_01_15" \
  -u elastic:password
```

### Snapshot Status

```bash
# Current snapshot status
curl -X GET "https://localhost:9200/_snapshot/s3_backup/_current" \
  -u elastic:password

# Specific snapshot status
curl -X GET "https://localhost:9200/_snapshot/s3_backup/snapshot_2024_01_15/_status" \
  -u elastic:password
```

## Restoring Snapshots

### Restore All Indices

```bash
curl -X POST "https://localhost:9200/_snapshot/s3_backup/snapshot_2024_01_15/_restore?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'
```

### Restore Specific Indices

```bash
curl -X POST "https://localhost:9200/_snapshot/s3_backup/snapshot_2024_01_15/_restore?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "products,orders",
    "ignore_unavailable": true,
    "include_global_state": false
  }'
```

### Restore with Rename

```bash
curl -X POST "https://localhost:9200/_snapshot/s3_backup/snapshot_2024_01_15/_restore?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "products",
    "ignore_unavailable": true,
    "include_global_state": false,
    "rename_pattern": "(.+)",
    "rename_replacement": "restored_$1"
  }'
```

### Restore with Modified Settings

```bash
curl -X POST "https://localhost:9200/_snapshot/s3_backup/snapshot_2024_01_15/_restore?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "products",
    "ignore_unavailable": true,
    "include_global_state": false,
    "index_settings": {
      "index.number_of_replicas": 0,
      "index.refresh_interval": "-1"
    },
    "ignore_index_settings": [
      "index.routing.allocation.require._tier_preference"
    ]
  }'
```

### Partial Restore

Restore only specific shards:

```bash
curl -X POST "https://localhost:9200/_snapshot/s3_backup/snapshot_2024_01_15/_restore?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "products",
    "partial": true
  }'
```

## Deleting Snapshots

### Delete Single Snapshot

```bash
curl -X DELETE "https://localhost:9200/_snapshot/s3_backup/snapshot_2024_01_15" \
  -u elastic:password
```

### Delete Multiple Snapshots

```bash
curl -X DELETE "https://localhost:9200/_snapshot/s3_backup/snapshot_2024_01_01,snapshot_2024_01_02" \
  -u elastic:password
```

## Monitoring Snapshots

### Check Repository

```bash
# Verify repository
curl -X POST "https://localhost:9200/_snapshot/s3_backup/_verify" \
  -u elastic:password

# Repository stats
curl -X GET "https://localhost:9200/_snapshot/s3_backup" \
  -u elastic:password
```

### Monitor Snapshot Progress

```bash
# Watch snapshot progress
watch -n 5 'curl -s -X GET "https://localhost:9200/_snapshot/s3_backup/_current" -u elastic:password | jq'
```

## Cross-Cluster Restore

### Register Repository on Target Cluster

```bash
# Same repository configuration on target cluster
curl -X PUT "https://target-cluster:9200/_snapshot/s3_backup" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "type": "s3",
    "settings": {
      "bucket": "my-elasticsearch-backups",
      "region": "us-east-1",
      "base_path": "snapshots",
      "readonly": true
    }
  }'
```

### Restore on Target Cluster

```bash
curl -X POST "https://target-cluster:9200/_snapshot/s3_backup/snapshot_2024_01_15/_restore" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "*",
    "ignore_unavailable": true
  }'
```

## Complete Backup Strategy

```bash
#!/bin/bash
# backup-strategy.sh

ES_HOST="https://localhost:9200"
ES_USER="elastic"
ES_PASS="password"
REPO="s3_backup"

# 1. Create repository if not exists
curl -X PUT "$ES_HOST/_snapshot/$REPO" \
  -H "Content-Type: application/json" \
  -u $ES_USER:$ES_PASS \
  -d '{
    "type": "s3",
    "settings": {
      "bucket": "elasticsearch-backups",
      "region": "us-east-1",
      "compress": true
    }
  }'

# 2. Set up SLM policies
# Daily snapshots
curl -X PUT "$ES_HOST/_slm/policy/daily" \
  -H "Content-Type: application/json" \
  -u $ES_USER:$ES_PASS \
  -d '{
    "schedule": "0 0 2 * * ?",
    "name": "<daily-{now/d}>",
    "repository": "'$REPO'",
    "config": {
      "indices": ["*"],
      "ignore_unavailable": true,
      "include_global_state": false
    },
    "retention": {
      "expire_after": "30d",
      "min_count": 7
    }
  }'

# 3. Verify repository
curl -X POST "$ES_HOST/_snapshot/$REPO/_verify" \
  -u $ES_USER:$ES_PASS

# 4. Execute initial snapshot
curl -X POST "$ES_HOST/_slm/policy/daily/_execute" \
  -u $ES_USER:$ES_PASS

echo "Backup strategy configured!"
```

## Best Practices

### 1. Use Incremental Snapshots

Snapshots are automatically incremental - no extra configuration needed.

### 2. Test Restores Regularly

```bash
# Restore to test index
curl -X POST "https://localhost:9200/_snapshot/s3_backup/latest/_restore" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "products",
    "rename_pattern": "(.+)",
    "rename_replacement": "test_restore_$1"
  }'

# Verify data
curl -X GET "https://localhost:9200/test_restore_products/_count" \
  -u elastic:password

# Clean up
curl -X DELETE "https://localhost:9200/test_restore_products" \
  -u elastic:password
```

### 3. Monitor SLM

```bash
# Check SLM status
curl -X GET "https://localhost:9200/_slm/status" \
  -u elastic:password

# Get SLM statistics
curl -X GET "https://localhost:9200/_slm/stats" \
  -u elastic:password
```

### 4. Use Separate Repositories

- Production backups
- Test/development backups
- Long-term archival

### 5. Encrypt Backups

Use server-side encryption:

```json
{
  "settings": {
    "server_side_encryption": true
  }
}
```

## Conclusion

Elasticsearch snapshot and restore provides:

1. **Incremental backups** for efficiency
2. **Multiple storage backends** (S3, GCS, Azure)
3. **SLM policies** for automation
4. **Flexible restore** options
5. **Cross-cluster** restore capability

Regular backups and tested restore procedures are essential for disaster recovery and data protection.
