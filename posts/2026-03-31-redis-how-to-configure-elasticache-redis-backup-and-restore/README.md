# How to Configure ElastiCache Redis Backup and Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, Backup, Restore, Disaster Recovery, AWS

Description: Learn how to configure automatic and manual backups for Amazon ElastiCache Redis and restore from snapshots to recover data or migrate clusters.

---

## ElastiCache Backup Types

ElastiCache Redis offers two snapshot mechanisms:

- **Automatic snapshots**: Daily backups retained for 1-35 days, triggered during a configured backup window
- **Manual snapshots**: On-demand snapshots that persist until you delete them

Both create RDB (Redis Database) files stored in S3. Snapshots capture the data at a point in time for the primary node.

## Enabling Automatic Backups

### Via AWS CLI

```bash
aws elasticache modify-replication-group \
  --replication-group-id my-cluster \
  --snapshot-retention-limit 7 \
  --snapshot-window "02:00-03:00" \
  --apply-immediately
```

- `--snapshot-retention-limit`: Days to retain snapshots (1-35, 0 = disabled)
- `--snapshot-window`: UTC time window for snapshot creation (format: hh:mm-hh:mm)

### Via Terraform

```hcl
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "my-cluster"
  description                = "Redis with automated backups"
  node_type                  = "cache.r7g.large"
  num_cache_clusters         = 2
  automatic_failover_enabled = true

  # Backup configuration
  snapshot_retention_limit = 7      # Keep 7 days of daily snapshots
  snapshot_window          = "02:00-03:00"  # UTC, must not overlap maintenance window

  # Maintenance window (where node replacements happen)
  maintenance_window = "sun:04:00-sun:05:00"

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
}
```

## Creating Manual Snapshots

```bash
# Create a manual snapshot before a risky deployment
aws elasticache create-snapshot \
  --replication-group-id my-cluster \
  --snapshot-name pre-deployment-backup-20240115

# List all snapshots for a cluster
aws elasticache describe-snapshots \
  --replication-group-id my-cluster \
  --query 'Snapshots[*].{Name:SnapshotName,Status:SnapshotStatus,Created:NodeSnapshots[0].SnapshotCreateTime}' \
  --output table

# Check snapshot status
aws elasticache describe-snapshots \
  --snapshot-name pre-deployment-backup-20240115 \
  --query 'Snapshots[0].SnapshotStatus'
```

Snapshot status values: `creating` -> `available` -> (if deleted) `deleting`

## Restoring from a Snapshot

Restoring creates a NEW cluster from the snapshot data. You cannot restore in-place.

```bash
# Restore snapshot to a new cluster
aws elasticache create-replication-group \
  --replication-group-id my-cluster-restored \
  --replication-group-description "Restored from backup" \
  --snapshot-name pre-deployment-backup-20240115 \
  --cache-node-type cache.r7g.large \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token "YourToken123!" \
  --snapshot-retention-limit 7 \
  --snapshot-window "02:00-03:00"
```

The restored cluster starts with the data from the snapshot. The time to create depends on the snapshot size.

## Terraform: Restore from Snapshot

```hcl
resource "aws_elasticache_replication_group" "restored" {
  replication_group_id       = "my-cluster-restored"
  description                = "Restored from snapshot"
  node_type                  = "cache.r7g.large"
  num_cache_clusters         = 2
  automatic_failover_enabled = true

  # Restore from snapshot
  snapshot_name = "pre-deployment-backup-20240115"

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
}
```

## Copying Snapshots Across Regions

For cross-region disaster recovery, copy snapshots to another region.

```bash
# Copy snapshot to eu-west-1 (use source snapshot ARN for cross-region)
aws elasticache copy-snapshot \
  --source-snapshot-name arn:aws:elasticache:us-east-1:123456789012:snapshot:my-snapshot \
  --target-snapshot-name my-snapshot-eu-copy \
  --region eu-west-1

# Or use the cross-region copy with KMS re-encryption
aws elasticache copy-snapshot \
  --source-snapshot-name arn:aws:elasticache:us-east-1:123456789012:snapshot:my-snapshot \
  --target-snapshot-name my-snapshot-eu-copy-encrypted \
  --kms-key-id arn:aws:kms:eu-west-1:123456789012:key/eu-kms-key \
  --region eu-west-1
```

## Exporting Snapshots to S3

You can export ElastiCache snapshots to S3 for long-term archival or migration.

```bash
# Export snapshot to S3
aws elasticache copy-snapshot \
  --source-snapshot-name my-snapshot \
  --target-snapshot-name my-snapshot-exported \
  --target-bucket my-redis-backup-bucket

# The exported S3 files are RDB format
aws s3 ls s3://my-redis-backup-bucket/elasticache/redis/
```

## Importing External RDB Files

Restore data from an RDB file uploaded to S3.

```bash
# Upload an RDB file
aws s3 cp dump.rdb s3://my-redis-backup-bucket/import/dump.rdb

# Create cluster from S3 RDB
aws elasticache create-replication-group \
  --replication-group-id imported-cluster \
  --replication-group-description "Imported from RDB" \
  --cache-node-type cache.r7g.large \
  --num-cache-clusters 1 \
  --snapshot-arns arn:aws:s3:::my-redis-backup-bucket/import/dump.rdb
```

## Automated Backup Verification

```python
import boto3
from datetime import datetime

def verify_recent_backup(replication_group_id, max_age_hours=26):
    """Verify that a recent automatic backup exists"""
    client = boto3.client('elasticache', region_name='us-east-1')

    response = client.describe_snapshots(
        ReplicationGroupId=replication_group_id,
        SnapshotSource='automated'
    )

    snapshots = response['Snapshots']
    if not snapshots:
        print(f"WARNING: No automated snapshots found for {replication_group_id}")
        return False

    # Sort by creation time
    available = [s for s in snapshots if s['SnapshotStatus'] == 'available']
    if not available:
        print("WARNING: No available snapshots found")
        return False

    # Get the most recent snapshot creation time
    most_recent = max(
        available,
        key=lambda s: s['NodeSnapshots'][0]['SnapshotCreateTime']
    )

    created_at = most_recent['NodeSnapshots'][0]['SnapshotCreateTime']
    age_hours = (datetime.now(created_at.tzinfo) - created_at).total_seconds() / 3600

    if age_hours > max_age_hours:
        print(f"WARNING: Most recent snapshot is {age_hours:.1f} hours old")
        return False

    print(f"OK: Most recent snapshot '{most_recent['SnapshotName']}' is {age_hours:.1f} hours old")
    return True

# Run as part of daily health check
verify_recent_backup('my-cluster')
```

## Backup Retention and Cost

```text
Snapshot storage pricing (us-east-1):
- First snapshot is free (size of dataset)
- Additional snapshots: ~$0.095 per GB-month

Example: 10 GB dataset with 7-day retention
- ~7 snapshots x 10 GB = 70 GB stored
- First 10 GB free
- 60 GB x $0.095 = ~$5.70/month for backup storage

Best practices:
- 7 days retention for most production workloads
- 30 days for compliance requirements
- Archive important manual snapshots to S3 for long-term retention
```

## Summary

ElastiCache Redis backups use RDB snapshots stored in S3, with automatic daily backups configurable for up to 35 days of retention. Create manual snapshots before risky operations like deployments or schema changes. Restoring from a snapshot always creates a new cluster - plan for the DNS cutover in your recovery procedures. For multi-region disaster recovery, copy snapshots to secondary regions using `copy-snapshot` with cross-region parameters.
