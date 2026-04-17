# ClickHouse Backup and Recovery Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Recovery, Disaster Recovery, Checklist

Description: A backup and recovery checklist for ClickHouse covering BACKUP TO S3, incremental backups, restore testing, and recovery time objectives.

---

Data loss in ClickHouse is permanent - there is no recycle bin and mutations are irreversible without a backup. This checklist ensures you have a reliable backup strategy with tested restore procedures before data loss occurs.

## Backup Methods

ClickHouse supports several backup approaches:

```text
[ ] BACKUP TO S3 (built-in, recommended for most deployments)
[ ] clickhouse-backup tool (open source, supports more storage backends)
[ ] Disk snapshots (fast but no granularity below the volume level)
[ ] ReplicatedMergeTree replicas (protection against node failure, not against data corruption)
```

## Setting Up BACKUP TO S3

```sql
-- Full backup to S3
BACKUP DATABASE default TO S3(
    'https://s3.amazonaws.com/my-backup-bucket/clickhouse/2024-01-15/',
    'ACCESS_KEY',
    'SECRET_KEY'
);

-- Incremental backup based on a previous backup
BACKUP DATABASE default TO S3(
    'https://s3.amazonaws.com/my-backup-bucket/clickhouse/2024-01-16/',
    'ACCESS_KEY',
    'SECRET_KEY'
)
SETTINGS base_backup = S3(
    'https://s3.amazonaws.com/my-backup-bucket/clickhouse/2024-01-15/',
    'ACCESS_KEY',
    'SECRET_KEY'
);
```

## Checking Backup Status

```sql
SELECT
    id,
    status,
    error,
    start_time,
    end_time,
    uncompressed_size,
    compressed_size
FROM system.backups
ORDER BY start_time DESC
LIMIT 10;
```

## Restore Procedure

```sql
-- Restore full database
RESTORE DATABASE default FROM S3(
    'https://s3.amazonaws.com/my-backup-bucket/clickhouse/2024-01-15/',
    'ACCESS_KEY',
    'SECRET_KEY'
);

-- Restore a specific table only
RESTORE TABLE default.events FROM S3(
    'https://s3.amazonaws.com/my-backup-bucket/clickhouse/2024-01-15/',
    'ACCESS_KEY',
    'SECRET_KEY'
);
```

## Backup Schedule Checklist

```text
[ ] Daily full backup scheduled (or incremental with weekly full)
[ ] Backup runs verified to complete successfully
[ ] Backup completion alerting configured (alert on failure)
[ ] Backup retention: keep 30 days of daily backups
[ ] Cross-region backup copy for disaster recovery
[ ] Backup storage bucket is versioned (S3 versioning enabled)
```

## Recovery Testing Checklist

```text
[ ] Monthly restore drill to a staging environment
[ ] Recovery Time Objective (RTO) measured and documented
[ ] Recovery Point Objective (RPO) verified (max data loss measured)
[ ] Restore procedure documented in runbook
[ ] On-call team trained on restore procedure
[ ] Partial table restore tested separately from full restore
```

## clickhouse-backup Tool

For more flexible backup options:

```bash
# Install clickhouse-backup
wget https://github.com/Altinity/clickhouse-backup/releases/latest/download/clickhouse-backup-linux-amd64.tar.gz
tar -xzf clickhouse-backup-linux-amd64.tar.gz

# Create a backup
clickhouse-backup create my_backup_2024_01_15

# Upload to S3
clickhouse-backup upload my_backup_2024_01_15

# List backups
clickhouse-backup list remote

# Restore
clickhouse-backup download my_backup_2024_01_15
clickhouse-backup restore my_backup_2024_01_15
```

## Summary

A ClickHouse backup strategy is only as good as its most recently tested restore. Schedule daily backups to S3 using the built-in `BACKUP` command or `clickhouse-backup`, verify completions with alerts, and run monthly restore drills to a staging environment to confirm your RTO and RPO objectives are actually achievable.
