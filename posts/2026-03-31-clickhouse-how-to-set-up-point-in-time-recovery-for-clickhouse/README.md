# How to Set Up Point-in-Time Recovery for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Point-in-Time Recovery, Backup, Disaster Recovery, MergeTree

Description: Learn how to implement point-in-time recovery for ClickHouse using incremental backups, part-level snapshots, and replication to restore data to a specific moment.

---

## What Is Point-in-Time Recovery in ClickHouse

ClickHouse does not have native point-in-time recovery (PITR) like PostgreSQL's WAL-based approach. However, you can approximate PITR by combining:

- Regular full backups
- Incremental backups or part snapshots
- Frozen table parts
- Replication log replay

## Strategy 1 - Frequent Incremental Backups with clickhouse-backup

The most practical PITR approach is frequent incremental backups so the recovery point is close to the desired time.

Configure `/etc/clickhouse-backup/config.yml`:

```yaml
general:
  remote_storage: s3
  backups_to_keep_local: 2
  backups_to_keep_remote: 48  # Keep 48 hourly backups = 2 days of PITR

s3:
  bucket: my-ch-backups
  region: us-east-1
  access_key: YOUR_KEY
  secret_key: YOUR_SECRET
```

Schedule hourly incremental backups:

```bash
# Crontab entry for hourly incremental backups
0 * * * * /usr/local/bin/clickhouse-backup create_remote \
    --diff-from-remote $(clickhouse-backup list remote | tail -1 | awk '{print $1}') \
    hourly_$(date +\%Y\%m\%d_\%H\%M) >> /var/log/ch-backup.log 2>&1
```

## Strategy 2 - Freezing Parts for Snapshots

ClickHouse's `ALTER TABLE FREEZE` creates hardlinks to current parts without blocking reads or writes:

```sql
-- Freeze a table (creates snapshot in /var/lib/clickhouse/shadow/)
ALTER TABLE events FREEZE WITH NAME 'snapshot_20260331_1200';

-- Freeze a specific partition
ALTER TABLE events FREEZE PARTITION '202603' WITH NAME 'snapshot_202603';
```

The frozen parts appear in:

```bash
ls /var/lib/clickhouse/shadow/snapshot_20260331_1200/
```

Copy them to remote storage:

```bash
aws s3 sync /var/lib/clickhouse/shadow/snapshot_20260331_1200/ \
    s3://my-ch-backups/shadow/snapshot_20260331_1200/
```

## Strategy 3 - Using Part-Level Timestamps

After restoring a backup, remove parts inserted after a specific time:

```sql
-- Find parts inserted after the target recovery time
SELECT
    name,
    min_time,
    max_time,
    rows
FROM system.parts
WHERE database = 'default'
  AND table = 'events'
  AND active = 1
  AND modification_time > '2026-03-31 12:00:00'
ORDER BY modification_time;

-- Drop a specific part (dangerous - verify first)
ALTER TABLE events DROP PART 'part_name_here';
```

## Restore Procedure for PITR

Step 1: Identify the target time and find the closest backup:

```bash
clickhouse-backup list remote | grep "2026-03-31"
```

Step 2: Restore the backup taken before the target time:

```bash
clickhouse-backup download hourly_20260331_1100
clickhouse-backup restore hourly_20260331_1100
```

Step 3: Re-apply incremental changes up to (but not past) the target time by restoring subsequent backups selectively.

## Protecting a Replica as a Recovery Point

Delay replica application for time-based recovery:

```sql
-- On the delayed replica, check replication queue
SELECT
    database,
    table,
    type,
    create_time,
    new_part_name
FROM system.replication_queue
WHERE type = 'GET_PART'
ORDER BY create_time DESC
LIMIT 10;
```

## Verifying After Recovery

```sql
-- Check row counts after recovery
SELECT
    database,
    table,
    sum(rows) AS total_rows,
    max(modification_time) AS last_modified
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY last_modified DESC;
```

## Cleaning Up Frozen Parts

```sql
-- Remove a freeze snapshot
ALTER TABLE events UNFREEZE WITH NAME 'snapshot_20260331_1200';
```

Or remove from the shadow directory directly:

```bash
rm -rf /var/lib/clickhouse/shadow/snapshot_20260331_1200/
```

## Recovery Point Objective Targets

| Backup Frequency | Max Data Loss (RPO) | Recovery Complexity |
|---|---|---|
| Hourly incremental | ~1 hour | Low |
| 15-minute incremental | ~15 minutes | Medium |
| Continuous freeze | Minutes | High |

## Summary

Point-in-time recovery in ClickHouse is achieved through frequent incremental backups using `clickhouse-backup` with `--diff-from-remote`, combined with `ALTER TABLE FREEZE` for part-level snapshots. The recovery procedure involves restoring the closest backup before the target time and selectively re-applying later backups. For sub-hour RPO requirements, schedule 15-minute incremental backups and test the full restore procedure regularly.
