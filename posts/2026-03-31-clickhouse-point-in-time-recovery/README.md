# How to Perform a Point-in-Time Recovery in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Recovery, Disaster Recovery, Administration, Point-in-Time

Description: Learn how to recover ClickHouse data to a specific point in time using incremental backup chains, partition-level restore, and the freeze-based snapshot approach.

---

Point-in-time recovery (PITR) in ClickHouse means restoring data to the state it was in at a specific moment in the past, such as just before an accidental `DELETE` or a bad migration. ClickHouse does not have a write-ahead log like PostgreSQL, so PITR is achieved through a combination of incremental backups, partition-level restores, and replica lag exploitation.

## Understanding the PITR Options in ClickHouse

ClickHouse provides four PITR mechanisms:

| Method | Granularity | Recovery time | Complexity |
|---|---|---|---|
| Incremental backup chain | Daily | Hours | Low |
| Partition-level restore | Partition boundary | Minutes | Medium |
| Frozen part copy | Part-level | Minutes | High |
| Replication lag exploitation | Real-time | Minutes | Medium |

## Method 1: Restore from Incremental Backup Chain

This is the standard approach. Find the backup taken just before the incident:

```bash
# List available backups
aws s3 ls s3://your-backup-bucket/clickhouse/backups/ | sort

# Example output:
# 2026-03-24-full/
# 2026-03-25-incr/
# 2026-03-26-incr/
# 2026-03-27-incr/     <-- incident happened at 14:32 on 2026-03-27
# 2026-03-28-incr/     <-- this backup was already corrupted
```

Restore to the state just before the incident (end of 2026-03-26):

```bash
# Create a recovery database
clickhouse-client --query "CREATE DATABASE recovery_20260327"

# Restore the full base backup first
clickhouse-client --query "
RESTORE DATABASE my_database AS recovery_20260327
FROM S3('https://s3.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-24-full/my_database/');
"

# Apply each incremental backup through 2026-03-26
for INCR_DATE in 2026-03-25 2026-03-26; do
    echo "Applying incremental: ${INCR_DATE}"
    clickhouse-client --query "
    RESTORE DATABASE my_database AS recovery_20260327
    FROM S3('https://s3.amazonaws.com/your-backup-bucket/clickhouse/backups/${INCR_DATE}-incr/my_database/')
    SETTINGS allow_non_empty_tables = true;
    "
done

echo "Recovery database ready"
```

Verify the recovery point:

```sql
-- Check data range in the recovery database
SELECT min(event_time), max(event_time), count()
FROM recovery_20260327.events;

-- Compare with production
SELECT min(event_time), max(event_time), count()
FROM my_database.events;
```

## Method 2: Partition-Level Restore

If you only need to recover specific partitions (e.g., data for a specific month), you can restore individual partitions without affecting other data:

```sql
-- Find the affected partitions
SELECT
    partition,
    min_date,
    max_date,
    count() AS parts,
    sum(rows) AS rows
FROM system.parts
WHERE database = 'my_database' AND table = 'events' AND active = 1
ORDER BY partition;
```

```bash
# Restore only the affected partition from backup
clickhouse-client --query "
-- First, restore the backup into a temporary table
RESTORE TABLE my_database.events AS my_database.events_recovery
FROM S3('https://s3.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-26-incr/my_database/');
"
```

```sql
-- Drop the corrupted partition from production
ALTER TABLE my_database.events DROP PARTITION '202603';

-- Move the recovered partition from the recovery table to production
ALTER TABLE my_database.events_recovery MOVE PARTITION '202603' TO TABLE my_database.events;

-- Drop the recovery table
DROP TABLE my_database.events_recovery;

-- Verify the restored partition
SELECT min(event_time), max(event_time), count()
FROM my_database.events
WHERE event_date >= '2026-03-01' AND event_date < '2026-04-01';
```

## Method 3: Using FREEZE for Instant Snapshots

`ALTER TABLE ... FREEZE` creates a hard-link snapshot of all data parts at the current moment. This is useful for creating a quick pre-maintenance snapshot:

```bash
# Before running a risky migration, freeze all relevant tables
clickhouse-client --query "ALTER TABLE my_database.events FREEZE WITH NAME 'pre-migration-2026-03-31';"

# The frozen parts are stored at:
ls /var/lib/clickhouse/shadow/pre-migration-2026-03-31/
```

```bash
# List frozen snapshots by checking the shadow directory
ls /var/lib/clickhouse/shadow/
```

If the migration goes wrong, restore from the freeze:

```bash
# Stop writes to the table
clickhouse-client --query "SYSTEM STOP MERGES my_database.events"

# Drop the damaged table (schema can be retrieved from system.tables: create_table_query column)
clickhouse-client --query "DROP TABLE my_database.events"

# Re-create the table (get the DDL from backup or log)
clickhouse-client --query "CREATE TABLE my_database.events (...) ENGINE = ReplicatedMergeTree(...) ORDER BY (...);"

# Copy frozen parts back to the detached directory
sudo cp -r /var/lib/clickhouse/shadow/pre-migration-2026-03-31/data/my_database/events/* \
           /var/lib/clickhouse/data/my_database/events/detached/

# Fix ownership so ClickHouse can read the files
sudo chown -R clickhouse:clickhouse /var/lib/clickhouse/data/my_database/events/detached/

# Attach each part individually (there is no single command to attach all parts)
for part in $(ls /var/lib/clickhouse/data/my_database/events/detached/); do
    clickhouse-client --query "ALTER TABLE my_database.events ATTACH PART '${part}';"
done

# Resume merges
clickhouse-client --query "SYSTEM START MERGES my_database.events"
```

Clean up freeze when no longer needed:

```sql
ALTER TABLE my_database.events UNFREEZE WITH NAME 'pre-migration-2026-03-31';
```

## Method 4: Exploiting Replication Lag for PITR

In a replicated setup, if one replica is lagging behind, you can stop replication on that replica and query it for data that has already been deleted from the leader:

```sql
-- On the lagging replica: check replication state
SELECT table, absolute_delay, log_pointer, log_max_index
FROM system.replicas
WHERE database = 'my_database';

-- Stop replication to preserve the current state
SYSTEM STOP REPLICATION QUEUES;

-- Query the replica for data before the incident
SELECT count(), max(event_time)
FROM my_database.events
WHERE event_time < '2026-03-27 14:32:00';
```

```bash
# Export the needed data
clickhouse-client --query "
SELECT *
FROM my_database.events
WHERE event_time < '2026-03-27 14:32:00' AND event_date = '2026-03-26'
" > /tmp/recovered_events.tsv
```

```sql
-- Resume replication when done
SYSTEM START REPLICATION QUEUES;
```

## Recovery Runbook Template

Document a standard runbook for PITR incidents:

```text
ClickHouse Point-in-Time Recovery Runbook

1. Identify the incident time and affected tables
   - Check query_log: SELECT event_time, query FROM system.query_log WHERE ...
   - Identify the last known good timestamp

2. Choose recovery method
   - Full table corruption -> Method 1 (backup chain restore)
   - Single partition -> Method 2 (partition restore)
   - Very recent (< 1 hour) -> Method 4 (replication lag)

3. Estimate data loss window
   - Most recent backup before incident: YYYY-MM-DD HH:MM
   - Approximate data loss: X hours of writes

4. Create recovery database or table
   - Never overwrite production directly
   - Restore to recovery_YYYYMMDD first

5. Verify recovery
   - Row count comparison
   - Date range verification
   - Sample spot-check queries

6. Cutover
   - Rename tables (EXCHANGE TABLES)
   - Or copy recovered partition back

7. Post-incident
   - Update backup schedule if gap was too large
   - Add incremental frequency if needed
```

## Swapping the Recovered Table into Production

Once verification passes, use `EXCHANGE TABLES` for a zero-downtime swap:

```sql
-- Atomic swap - no reads fail during the switch
EXCHANGE TABLES my_database.events AND recovery_20260327.events;

-- The old (corrupted) data is now in recovery_20260327.events
-- The recovered data is in my_database.events

-- Clean up after verification
DROP TABLE recovery_20260327.events;
DROP DATABASE recovery_20260327;
```

## Summary

ClickHouse point-in-time recovery relies on four techniques: restoring a full backup and replaying incremental backups up to the recovery point, restoring individual partitions from backup and inserting them back into the production table, using `ALTER TABLE FREEZE` for instant pre-mutation snapshots, and exploiting replication lag to query data that exists on a lagging replica but has been deleted from the leader. Document a PITR runbook before you need it, test it quarterly, and always restore to a recovery database rather than directly overwriting production.
