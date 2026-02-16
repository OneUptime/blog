# How to Fix 'could not extend file' Errors in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Troubleshooting, Disk Space, Storage, File System

Description: Learn how to diagnose and fix 'could not extend file' errors in PostgreSQL. This guide covers disk space issues, file system limits, and storage management strategies.

---

The "could not extend file" error in PostgreSQL occurs when the database cannot grow a data file. This is typically caused by running out of disk space, hitting file system limits, or storage configuration issues. This guide will help you diagnose the root cause and implement both immediate fixes and long-term solutions.

---

## Understanding the Error

When you see this error, it usually looks like:

```
ERROR: could not extend file "base/16384/16385": No space left on device
HINT: Check free disk space.

ERROR: could not extend file "base/16384/16385.1": wrote only 4096 of 8192 bytes at block 2097151
HINT: Check free disk space.

ERROR: could not extend file "pg_tblspc/16386/PG_14_202107181/16387/16388": No space left on device
```

The error indicates:
1. PostgreSQL tried to add more data to a file
2. The operating system refused the write operation
3. Usually means disk is full or a limit was reached

---

## Immediate Diagnosis

### Check Disk Space

```bash
# Check disk usage on all mounted filesystems
df -h

# Check specific PostgreSQL directories
df -h /var/lib/postgresql

# Check inode usage (can run out even with disk space available)
df -i

# Example output:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1       100G   95G    5G  95% /
```

### Check PostgreSQL Data Directory Size

```bash
# Find data directory
sudo -u postgres psql -c "SHOW data_directory;"

# Check size of data directory
du -sh /var/lib/postgresql/14/main/

# Check size by subdirectory
du -sh /var/lib/postgresql/14/main/*/ | sort -h

# Common large directories:
# base/     - Table and index data
# pg_wal/   - Write-ahead log files
# pg_tblspc/ - Tablespace data
```

### Check for Large Tables

```sql
-- Find largest tables
SELECT
    schemaname,
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- Check database sizes
SELECT
    datname,
    pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database
ORDER BY pg_database_size(datname) DESC;
```

---

## Common Causes and Solutions

### Cause 1: Disk Full

**Immediate Fix:**

```bash
# Free up space quickly
# 1. Remove old log files
sudo find /var/log -name "*.log.*" -mtime +7 -delete

# 2. Clean up old PostgreSQL logs
sudo find /var/lib/postgresql/*/main/log -name "*.log" -mtime +7 -delete

# 3. Remove temporary files
sudo rm -rf /tmp/*

# 4. Clean package cache (Ubuntu/Debian)
sudo apt-get clean
```

**Database-Level Cleanup:**

```sql
-- Find and remove bloated tables
VACUUM FULL verbose large_table;

-- Delete old data
DELETE FROM logs WHERE created_at < NOW() - INTERVAL '90 days';
VACUUM logs;

-- Drop unused indexes
DROP INDEX IF EXISTS unused_index_name;

-- Truncate temp tables
TRUNCATE TABLE temp_processing;
```

### Cause 2: WAL Directory Full

```bash
# Check WAL directory size
du -sh /var/lib/postgresql/14/main/pg_wal/

# Count WAL files
ls /var/lib/postgresql/14/main/pg_wal/ | wc -l
```

**Fix WAL Buildup:**

```sql
-- Force a checkpoint to allow WAL recycling
CHECKPOINT;

-- Check for replication slots holding WAL
SELECT
    slot_name,
    slot_type,
    active,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;

-- Drop unused replication slots
SELECT pg_drop_replication_slot('unused_slot_name');
```

**Adjust WAL Settings:**

```ini
# postgresql.conf

# Reduce WAL retention
max_wal_size = 2GB
min_wal_size = 1GB

# If not using replication
wal_keep_size = 0  # PostgreSQL 13+
```

### Cause 3: File System Limits

```bash
# Check file system type and limits
mount | grep $(df /var/lib/postgresql --output=source | tail -1)

# Check max file size for ext4
# ext4 supports files up to 16TB with 4K blocks

# Check current file sizes
ls -lh /var/lib/postgresql/14/main/base/*/
```

**For Large Tables (> 1GB files):**

PostgreSQL automatically segments large tables into 1GB files. If you are hitting limits, check for unusual configurations.

### Cause 4: Tablespace on Full Volume

```sql
-- Check tablespace locations
SELECT
    spcname,
    pg_tablespace_location(oid) AS location
FROM pg_tablespace;

-- Move table to different tablespace
ALTER TABLE large_table SET TABLESPACE pg_default;

-- Or create new tablespace on volume with space
CREATE TABLESPACE new_space LOCATION '/mnt/larger_disk/pg_data';
ALTER TABLE large_table SET TABLESPACE new_space;
```

---

## Preventing Future Issues

### Monitor Disk Usage

```sql
-- Create monitoring view
CREATE VIEW disk_usage_monitor AS
SELECT
    current_setting('data_directory') AS data_directory,
    pg_size_pretty(sum(pg_database_size(datname))) AS total_database_size,
    (SELECT pg_size_pretty(sum(size))
     FROM pg_ls_waldir()) AS wal_size;

-- Set up alert query
SELECT
    CASE
        WHEN pg_database_size(current_database()) >
             0.8 * (SELECT setting::bigint * 1024 FROM pg_settings WHERE name = 'data_directory')
        THEN 'WARNING'
        ELSE 'OK'
    END AS status;
```

### Implement Data Retention

```sql
-- Create partitioned table for automatic cleanup
CREATE TABLE events (
    id BIGSERIAL,
    event_time TIMESTAMP NOT NULL,
    data JSONB
) PARTITION BY RANGE (event_time);

-- Create monthly partitions
CREATE TABLE events_2026_01 PARTITION OF events
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Easy cleanup: drop old partitions
DROP TABLE events_2025_01;  -- Instant space recovery
```

### Configure Autovacuum Aggressively

```ini
# postgresql.conf

# More aggressive vacuum
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.02
autovacuum_vacuum_cost_delay = 2ms

# More workers
autovacuum_max_workers = 4
```

### Set Up Monitoring Alerts

```bash
#!/bin/bash
# disk_alert.sh

THRESHOLD=80
PG_DATA="/var/lib/postgresql/14/main"

usage=$(df "$PG_DATA" --output=pcent | tail -1 | tr -d ' %')

if [ "$usage" -gt "$THRESHOLD" ]; then
    echo "ALERT: PostgreSQL disk usage at ${usage}%"

    # Get top space consumers
    psql -U postgres -c "
        SELECT schemaname, relname,
               pg_size_pretty(pg_total_relation_size(relid)) as size
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 10;
    "

    # Send alert
    # mail -s "PostgreSQL Disk Alert" admin@example.com
fi
```

---

## Recovery Steps When Disk is Full

### Step 1: Emergency Space Recovery

```bash
# If PostgreSQL won't start due to no space:

# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Remove archived WAL files (if archiving is enabled)
# Be careful - only remove if you have valid backups!
sudo rm /var/lib/postgresql/14/main/pg_wal/archive_status/*.done

# 3. Remove old log files
sudo rm /var/lib/postgresql/14/main/log/*.log

# 4. Clear backup label if present
sudo rm /var/lib/postgresql/14/main/backup_label.old

# 5. Try to start PostgreSQL
sudo systemctl start postgresql
```

### Step 2: Once PostgreSQL is Running

```sql
-- Immediately free space
CHECKPOINT;

-- Identify and vacuum bloated tables
SELECT
    schemaname,
    relname,
    n_dead_tup,
    pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;

-- Vacuum large bloated tables
VACUUM FULL verbose bloated_table;
```

### Step 3: Add More Storage

```bash
# Option 1: Resize disk (cloud provider)
# Depends on your cloud provider

# Option 2: Add tablespace on new disk
sudo mkdir -p /mnt/new_disk/pg_data
sudo chown postgres:postgres /mnt/new_disk/pg_data
```

```sql
-- Create tablespace on new disk
CREATE TABLESPACE extended_storage LOCATION '/mnt/new_disk/pg_data';

-- Move large tables to new tablespace
ALTER TABLE large_table SET TABLESPACE extended_storage;
```

---

## File System Recommendations

### For Production PostgreSQL

```bash
# Use XFS or ext4
# Recommended mount options:
# noatime - Don't update access times
# nodiratime - Don't update directory access times
# nobarrier - If using battery-backed RAID (careful!)

# Example /etc/fstab entry:
/dev/sdb1 /var/lib/postgresql xfs defaults,noatime 0 2
```

### Size Planning

```
Minimum recommended space:
- Base installation: 100MB
- Per database: 2x expected data size (for vacuum overhead)
- WAL: 3x max_wal_size
- Temporary files: Equal to largest expected sort/join operation
- Headroom: 20% of total

Example for 100GB database:
- Data: 100GB
- Vacuum overhead: 100GB
- WAL (2GB max): 6GB
- Temp files: 10GB
- Headroom: 50GB
- Total: ~270GB recommended
```

---

## Best Practices

1. **Monitor disk usage** - Alert at 70-80% capacity
2. **Implement data retention** - Archive or delete old data
3. **Use partitioning** - Easy cleanup of old partitions
4. **Size disks appropriately** - Plan for 2-3x data growth
5. **Separate WAL and data** - Different disks prevents WAL from filling data disk
6. **Regular VACUUM** - Prevents bloat from consuming disk
7. **Clean up replication slots** - Unused slots retain WAL indefinitely

---

## Conclusion

The "could not extend file" error usually means disk full, but can also indicate file system limits or tablespace issues. The key points are:

1. **Check disk space** first with `df -h`
2. **Free space immediately** by removing logs and vacuuming
3. **Prevent recurrence** with monitoring and data retention
4. **Plan capacity** for 2-3x expected data size

Regular monitoring and proactive space management will prevent this error from causing outages.

---

*Need to monitor your PostgreSQL disk usage? [OneUptime](https://oneuptime.com) provides real-time storage monitoring with predictive alerts, capacity planning, and automatic cleanup recommendations.*
