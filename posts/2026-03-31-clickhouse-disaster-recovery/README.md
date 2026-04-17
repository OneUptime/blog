# How to Set Up ClickHouse Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Disaster Recovery, Replication, Backup, High Availability, Operation

Description: Design and implement ClickHouse disaster recovery using replication, clickhouse-backup, S3 snapshots, and cross-region failover strategies for production systems.

---

## Introduction

ClickHouse disaster recovery (DR) involves protecting your data and query availability against hardware failure, datacenter outages, and accidental data deletion. A robust DR strategy combines replication within a region with cross-region backups and a tested failover runbook.

## DR Strategy Overview

```mermaid
graph TD
    A[Primary Region] --> B[ClickHouse Cluster]
    B --> C[Replica Shard 1]
    B --> D[Replica Shard 2]
    B --> E[ClickHouse Keeper]
    A -->|Backup| F[S3 Backup Bucket - Primary Region]
    F -->|Replicate| G[S3 Backup Bucket - DR Region]
    G --> H[DR ClickHouse Cluster]
```

## Option 1: Native Replication (Same Region HA)

ClickHouse ReplicatedMergeTree replicates data across nodes within a cluster. This protects against node failure but not datacenter failure.

```sql
-- On all nodes, create a ReplicatedMergeTree table
CREATE TABLE events ON CLUSTER my_cluster
(
    event_id   UInt64,
    event_type String,
    event_time DateTime
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
)
PARTITION BY toYYYYMM(event_time)
ORDER BY event_time;
```

`config.xml` macros:

```xml
<macros>
  <shard>01</shard>
  <replica>clickhouse-01.example.com</replica>
</macros>
```

## Option 2: Cross-Region Backup with clickhouse-backup

Install `clickhouse-backup`:

```bash
curl -L https://github.com/Altinity/clickhouse-backup/releases/latest/download/clickhouse-backup-linux-amd64.tar.gz \
    | tar -xz -C /usr/local/bin/
```

Configure `/etc/clickhouse-backup/config.yaml`:

```yaml
general:
  remote_storage: s3
  disable_progress_bar: false

s3:
  bucket: my-clickhouse-backups
  region: us-east-1
  path: backups/
  access_key: AKIAIOSFODNN7EXAMPLE
  secret_key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  compression_format: zstd
  compression_level: 3
```

Create a backup and upload it:

```bash
# Create local backup
clickhouse-backup create my_backup_20240101

# Upload to S3
clickhouse-backup upload my_backup_20240101

# Or create and upload in one step
clickhouse-backup create-remote my_backup_$(date +%Y%m%d)
```

List backups:

```bash
clickhouse-backup list remote
```

## Option 3: S3 Cross-Region Replication

Enable S3 Cross-Region Replication so backups automatically appear in the DR region:

```bash
aws s3api put-bucket-replication \
    --bucket my-clickhouse-backups \
    --replication-configuration file://replication.json
```

`replication.json`:

```json
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [{
    "ID": "ReplicateAll",
    "Status": "Enabled",
    "Priority": 1,
    "Filter": {},
    "DeleteMarkerReplication": { "Status": "Disabled" },
    "Destination": {
      "Bucket": "arn:aws:s3:::my-clickhouse-backups-dr",
      "StorageClass": "STANDARD_IA"
    }
  }]
}
```

## Option 4: Scheduled Backup via Cron

```bash
# /etc/cron.d/clickhouse-backup
0 2 * * * clickhouse /usr/local/bin/clickhouse-backup create-remote daily_$(date +\%Y\%m\%d) >> /var/log/clickhouse-backup.log 2>&1

# Keep 7 local backups, 30 remote
0 3 * * * clickhouse /usr/local/bin/clickhouse-backup list local | awk 'NR>7{print $1}' | xargs -r -n1 /usr/local/bin/clickhouse-backup delete local
```

## Restoring from Backup

On the DR cluster:

```bash
# List available remote backups
clickhouse-backup list remote

# Download backup
clickhouse-backup download my_backup_20240101

# Restore all tables
clickhouse-backup restore my_backup_20240101

# Restore a specific database
clickhouse-backup restore --tables "mydb.*" my_backup_20240101
```

## Recovery Time Objective (RTO) and Recovery Point Objective (RPO)

| Strategy | RPO | RTO |
|---|---|---|
| ReplicatedMergeTree (same region) | Near zero | Minutes (replica promotion) |
| Cross-region backup (hourly) | Up to 1 hour | 1-4 hours (restore time) |
| Cross-region backup (daily) | Up to 24 hours | 1-4 hours |

## Monitoring Replication Health

```sql
-- Check replication queue backlog
SELECT
    database,
    table,
    count() AS pending_tasks
FROM system.replication_queue
GROUP BY database, table
ORDER BY pending_tasks DESC;

-- Check replica status
SELECT
    database,
    table,
    replica_name,
    is_leader,
    inserts_in_queue,
    merges_in_queue,
    log_pointer
FROM system.replicas
ORDER BY database, table;
```

## Failover Runbook

1. Confirm primary cluster is unreachable: `clickhouse-client -h primary-node -q "SELECT 1"`
2. Promote DR cluster by updating DNS / load balancer to point at the DR endpoint.
3. Verify DR cluster is healthy: `clickhouse-client -h dr-node -q "SELECT version()"`
4. If data is missing, run `clickhouse-backup restore` from the latest backup.
5. Update application connection strings.
6. Notify on-call team via PagerDuty / Slack.

## Summary

ClickHouse DR combines native replication for same-region HA with cross-region backups using `clickhouse-backup` and S3. Define your RTO and RPO requirements to choose the right backup frequency and replication topology. Automate backup uploads via cron, replicate S3 buckets across regions, and test the restore runbook monthly to ensure you can actually recover when needed.
