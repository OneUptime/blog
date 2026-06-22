# How to Recover from Corrupted ClickHouse Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Recovery, Troubleshooting, Corruption, Backup, Disaster Recovery, Database, Operation

Description: A comprehensive guide to recovering from data corruption in ClickHouse, covering corruption detection, part recovery, checksum verification, and strategies for restoring data from backups or replicas.

---

Data corruption in ClickHouse can occur due to disk failures, incomplete writes, or system crashes. This guide covers how to detect corruption, recover affected data, and prevent future incidents.

## Detecting Data Corruption

### Checksum Verification

```sql
-- Check for parts with checksum errors
SELECT
    database,
    table,
    name,
    active,
    marks,
    rows,
    bytes_on_disk,
    modification_time
FROM system.parts
WHERE database = 'default'
ORDER BY modification_time DESC;

-- Verify checksums manually
CHECK TABLE events
SETTINGS check_query_single_value_result = 0;
-- Returns one row per checked part with pass/fail status and messages
```

### Common Corruption Signs

```sql
-- Queries failing with checksum errors
-- "Checksum doesn't match: corrupted data."

-- Parts detached by ClickHouse because of a problem
SELECT *
FROM system.detached_parts
WHERE reason != '';

-- Errors in ClickHouse logs
-- grep -i "checksum\|corrupt\|broken" /var/log/clickhouse-server/clickhouse-server.err.log
```

### Identify Affected Parts

```sql
-- List parts for investigation
SELECT
    database,
    table,
    partition,
    name,
    active,
    rows,
    formatReadableSize(bytes_on_disk) AS size,
    modification_time,
    path
FROM system.parts
WHERE table = 'events'
ORDER BY modification_time DESC
LIMIT 50;

-- Check detached parts (including broken ones)
SELECT *
FROM system.detached_parts
WHERE table = 'events';
```

## Recovery Options

### Option 1: Recover from Replica

If you have replication, healthy replicas can restore data:

```sql
-- Check replica status
SELECT
    database,
    table,
    replica_name,
    is_leader,
    absolute_delay,
    queue_size
FROM system.replicas
WHERE table = 'events';

-- Wait for the replication queue to catch up
SYSTEM SYNC REPLICA events;

-- If replica metadata in Keeper/ZooKeeper was lost and the table is read-only
SYSTEM RESTORE REPLICA events;
```

### Option 2: Detach and Reattach

For isolated corruption:

```sql
-- Detach corrupted part
ALTER TABLE events DETACH PART 'all_1_1_0';

-- If the part file is recoverable, fix and reattach
ALTER TABLE events ATTACH PART 'all_1_1_0';

-- Or drop the corrupted part entirely
ALTER TABLE events DROP DETACHED PART 'all_1_1_0'
SETTINGS allow_drop_detached = 1;
```

### Option 3: Restore from Backup

```bash
# Using clickhouse-backup

clickhouse-backup list

# Restore specific table
clickhouse-backup restore backup_name --table events

# Restore specific partitions
clickhouse-backup restore backup_name --table events --partitions '202401'
```

```sql
-- Or restore a built-in ClickHouse backup from a configured disk
RESTORE TABLE events AS events_recovery
FROM Disk('backups', 'backup_name');
```

### Option 4: Rebuild from Source

If source data is available:

```sql
-- Drop corrupted partition
ALTER TABLE events DROP PARTITION '202401';

-- Reload from Kafka (if using Kafka engine)
-- Data will be re-consumed

-- Or reload from S3
INSERT INTO events
SELECT * FROM s3('s3://bucket/events/202401/*.parquet', 'Parquet')
WHERE toYYYYMM(event_time) = 202401;
```

## Part-Level Recovery

### Examine Part Structure

```bash
# List files in a part directory
ls -la /var/lib/clickhouse/data/default/events/all_1_1_0/

# Expected files:
# checksums.txt  - Part checksums
# columns.txt    - Column list
# count.txt      - Row count
# primary.idx    - Primary key index
# *.bin          - Column data files
# *.mrk2         - Mark files
```

### Verify Individual Parts

```sql
-- Check a specific part and show detailed status
CHECK TABLE events PART 'all_1_1_0'
SETTINGS check_query_single_value_result = 0;

-- Check a specific partition
CHECK TABLE events PARTITION ID '202401'
SETTINGS check_query_single_value_result = 0;
```

### Manual Part Recovery

```bash
# 1. Stop ClickHouse
sudo systemctl stop clickhouse-server

# 2. Move corrupted part to backup location
mv /var/lib/clickhouse/data/default/events/all_1_1_0 \
   /var/lib/clickhouse/data/default/events/all_1_1_0_corrupted

# 3. If you have a backup of the part, restore it
cp -r /backup/events/all_1_1_0 \
      /var/lib/clickhouse/data/default/events/

# 4. Fix permissions
chown -R clickhouse:clickhouse /var/lib/clickhouse/data/default/events/

# 5. Start ClickHouse
sudo systemctl start clickhouse-server
```

## Partition Recovery

### Drop and Reload Partition

```sql
-- Check partition data exists elsewhere
SELECT count()
FROM events
WHERE toYYYYMM(event_time) = 202401;

-- Drop corrupted partition
ALTER TABLE events DROP PARTITION '202401';

-- Reload from backup table
INSERT INTO events
SELECT * FROM events_backup
WHERE toYYYYMM(event_time) = 202401;
```

### Fetch from Replica

```sql
-- Fetch partition from another replica
ALTER TABLE events FETCH PARTITION '202401'
FROM '/clickhouse/tables/01/events';

-- Attach the fetched partition
ALTER TABLE events ATTACH PARTITION '202401';
```

## Full Table Recovery

### From Backup

```sql
-- Create recovery table
CREATE TABLE events_recovery AS events;

-- Restore from backup
-- Using clickhouse-backup restore

-- Verify data
SELECT count() FROM events_recovery;

-- Swap tables
EXCHANGE TABLES events AND events_recovery;

-- Clean up
DROP TABLE events_recovery;
```

### From Replica

```bash
# 1. Stop ClickHouse on corrupted node
sudo systemctl stop clickhouse-server

# 2. Remove all data for the table
rm -rf /var/lib/clickhouse/data/default/events/*

# 3. Allow ClickHouse to restore data from replicas even if many parts differ
sudo -u clickhouse touch /var/lib/clickhouse/flags/force_restore_data

# 4. Start ClickHouse
sudo systemctl start clickhouse-server

# Data should sync from healthy replicas
```

```sql
-- Verify sync progress
SELECT
    table,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE table = 'events';
```

## Prevention Strategies

### Run Checksum Checks

```sql
-- Run during maintenance windows; CHECK TABLE can read all table data
CHECK TABLE events
SETTINGS check_query_single_value_result = 0;
```

### Regular Backup Schedule

```bash
#!/bin/bash
# backup.sh - Run daily

# Full backup weekly
if [ $(date +%u) -eq 1 ]; then
    clickhouse-backup create --tables 'default.*'
fi

# Upload latest local backup to remote
clickhouse-backup upload "$(clickhouse-backup list | awk 'NR==1 {print $1}')"

# Clean old backups
clickhouse-backup list | awk 'NR>7 {print $1}' | xargs -r -n1 clickhouse-backup delete local
```

### Disk Health Monitoring

```sql
-- Monitor disk errors
SELECT
    name,
    path,
    formatReadableSize(free_space) AS free,
    formatReadableSize(total_space) AS total
FROM system.disks;

-- Check for I/O errors in system
-- dmesg | grep -i "error\|fail"
```

### Replication for HA

```sql
-- Ensure all tables are replicated
SELECT
    database,
    name,
    engine
FROM system.tables
WHERE engine LIKE 'Replicated%';

-- Check replica health
SELECT
    database,
    table,
    is_readonly,
    is_session_expired,
    future_parts,
    parts_to_check,
    queue_size
FROM system.replicas;
```

## Recovery Checklist

```markdown
When corruption is detected:

1. **Assess Impact**
   - [ ] Identify affected tables and partitions
   - [ ] Check if data exists in replicas
   - [ ] Check if backups are available
   - [ ] Estimate data loss if recovery fails

2. **Isolate Problem**
   - [ ] Detach corrupted parts
   - [ ] Prevent queries on affected data
   - [ ] Stop ingestion to affected tables

3. **Choose Recovery Method**
   - [ ] Replica sync (fastest if available)
   - [ ] Backup restore
   - [ ] Source data reload
   - [ ] Accept data loss (last resort)

4. **Execute Recovery**
   - [ ] Perform chosen recovery method
   - [ ] Verify data integrity
   - [ ] Verify row counts match expectations

5. **Post-Recovery**
   - [ ] Investigate root cause
   - [ ] Check disk health
   - [ ] Verify backup systems
   - [ ] Update monitoring
```

## Monitoring for Early Detection

```sql
-- Alert on detached parts
SELECT count() AS detached_parts
FROM system.detached_parts
WHERE reason != '';

-- Monitor parts detached due to problems
SELECT
    database,
    table,
    count() AS broken_parts
FROM system.detached_parts
WHERE reason != ''
GROUP BY database, table;

-- Check for CHECK TABLE failures
-- Run periodically
CHECK TABLE events;
```

---

Data corruption in ClickHouse is rare but recoverable in most cases. Replication is your best defense - replicas automatically restore corrupted parts from healthy nodes. For non-replicated tables, maintain regular backups and monitor disk health. When corruption occurs, detach affected parts first, then restore from replicas, backups, or source data.
