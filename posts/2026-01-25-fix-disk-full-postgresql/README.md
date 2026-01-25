# How to Fix "disk full" Errors in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Troubleshooting, Disk Space, Storage, Maintenance, Performance

Description: Learn how to diagnose and fix disk full errors in PostgreSQL. This guide covers immediate recovery steps, space reclamation techniques, and preventive monitoring strategies.

---

A disk full error in PostgreSQL can bring your entire application to a halt. When the disk runs out of space, PostgreSQL cannot write WAL (Write-Ahead Log) files, process transactions, or even allow new connections. This guide will help you recover from disk full situations and prevent them from happening again.

---

## Understanding the Error

Disk full errors appear in various forms:

```
ERROR: could not extend file "base/16384/16385": No space left on device
HINT: Check free disk space.

PANIC: could not write to file "pg_wal/xlogtemp.12345": No space left on device

FATAL: could not open file "pg_notify/0000": No space left on device
```

These errors indicate that PostgreSQL cannot write to disk, which can cause transactions to fail, data corruption, or complete server shutdown.

---

## Immediate Recovery Steps

When your disk is full, follow these steps in order:

### Step 1: Free Up Space Immediately

```bash
# Check disk usage
df -h

# Find largest files in PostgreSQL data directory
du -sh /var/lib/postgresql/14/main/* | sort -h

# Common space hogs:
# - pg_wal/ (WAL files)
# - base/ (table data)
# - pg_log/ (log files)
```

### Step 2: Remove Old Log Files

```bash
# Remove old PostgreSQL log files
find /var/lib/postgresql/14/main/log -name "*.log" -mtime +7 -delete

# Or if logs are in /var/log/postgresql
find /var/log/postgresql -name "*.log" -mtime +7 -delete
```

### Step 3: Force Checkpoint and Remove Old WAL Files

```sql
-- If you can still connect, force a checkpoint
CHECKPOINT;

-- This tells PostgreSQL it can recycle WAL files
```

```bash
# If PostgreSQL is running but you cannot connect,
# you can manually remove old WAL files
# WARNING: Only remove files that are clearly old and NOT needed for replication

# Check which WAL file is current
ls -la /var/lib/postgresql/14/main/pg_wal/ | tail -10

# The filename format is 000000010000000000000001
# Only remove files with numbers much lower than the latest
```

### Step 4: Clear Temporary Files

```bash
# Remove temporary files
rm -f /var/lib/postgresql/14/main/pgsql_tmp/*

# Remove old backup files if any
rm -f /var/lib/postgresql/14/main/backup_label.old
```

---

## Space Reclamation Techniques

### VACUUM to Reclaim Space

```sql
-- Regular VACUUM marks space as reusable (does not return to OS)
VACUUM VERBOSE;

-- VACUUM FULL reclaims space back to OS (locks tables!)
VACUUM FULL VERBOSE;

-- VACUUM specific table
VACUUM FULL verbose my_large_table;

-- Check tables that need vacuuming
SELECT
    schemaname,
    relname,
    n_dead_tup,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;
```

### REINDEX to Reclaim Index Space

```sql
-- Indexes can become bloated
-- Check index bloat
SELECT
    schemaname,
    relname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- Rebuild bloated indexes
REINDEX INDEX idx_name;

-- Rebuild all indexes in a table
REINDEX TABLE my_table;

-- Concurrently (PostgreSQL 12+, does not lock)
REINDEX INDEX CONCURRENTLY idx_name;
```

### Truncate Unneeded Data

```sql
-- If you have tables with data you can delete
TRUNCATE TABLE old_logs;

-- Delete with confirmation
DELETE FROM events WHERE created_at < NOW() - INTERVAL '1 year';
VACUUM events;
```

### Drop Unused Tables and Indexes

```sql
-- Find unused indexes
SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Drop unused indexes
DROP INDEX IF EXISTS unused_index_name;

-- Find and drop old temp tables
SELECT
    n.nspname AS schema,
    c.relname AS table_name,
    pg_size_pretty(pg_relation_size(c.oid)) AS size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname LIKE 'temp_%'
ORDER BY pg_relation_size(c.oid) DESC;
```

---

## Identifying Space Usage

### Database Size Analysis

```sql
-- Size of all databases
SELECT
    datname,
    pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database
ORDER BY pg_database_size(datname) DESC;

-- Size of all tables in current database
SELECT
    schemaname,
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

### Table Bloat Analysis

```sql
-- Check for table bloat (dead rows waiting for VACUUM)
SELECT
    schemaname,
    relname,
    n_live_tup,
    n_dead_tup,
    round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 2) AS dead_percent,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 20;
```

### WAL Directory Analysis

```bash
# Check WAL directory size
du -sh /var/lib/postgresql/14/main/pg_wal/

# Count WAL files
ls /var/lib/postgresql/14/main/pg_wal/ | wc -l

# If many files accumulate, check for replication lag or archive issues
```

---

## Preventive Measures

### Configure WAL Settings

```ini
# postgresql.conf

# Limit WAL directory size
max_wal_size = 2GB      # Maximum WAL size before checkpoint
min_wal_size = 1GB      # Minimum to keep

# More frequent checkpoints = fewer WAL files
checkpoint_timeout = 10min

# For servers without replication, reduce WAL retention
wal_keep_size = 1GB     # PostgreSQL 13+
# wal_keep_segments = 64  # PostgreSQL 12 and earlier
```

### Configure Autovacuum

```ini
# postgresql.conf

# More aggressive autovacuum to prevent bloat
autovacuum_vacuum_scale_factor = 0.1      # VACUUM when 10% dead tuples
autovacuum_analyze_scale_factor = 0.05    # ANALYZE when 5% change

# More vacuum workers
autovacuum_max_workers = 4

# Run vacuum more frequently
autovacuum_naptime = 30s
```

### Configure Log Rotation

```ini
# postgresql.conf

# Rotate logs to prevent buildup
log_rotation_age = 1d           # New log file daily
log_rotation_size = 100MB       # Or when reaching 100MB
log_truncate_on_rotation = on   # Overwrite old logs

# Or use system logrotate
```

### Set Up Monitoring Alerts

```bash
#!/bin/bash
# disk_monitor.sh - Alert when disk usage exceeds threshold

THRESHOLD=80
CURRENT=$(df /var/lib/postgresql | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$CURRENT" -gt "$THRESHOLD" ]; then
    echo "PostgreSQL disk usage at ${CURRENT}%!" | mail -s "Disk Alert" admin@example.com

    # Optional: Run emergency cleanup
    psql -U postgres -c "VACUUM;"
fi

# Add to crontab:
# */5 * * * * /path/to/disk_monitor.sh
```

### SQL Monitoring Query

```sql
-- Create a view for disk monitoring
CREATE VIEW disk_usage_stats AS
SELECT
    -- Database sizes
    (SELECT pg_size_pretty(sum(pg_database_size(datname)))
     FROM pg_database) AS total_database_size,

    -- Largest tables
    (SELECT json_agg(t) FROM (
        SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 5
    ) t) AS largest_tables,

    -- Tables with most bloat
    (SELECT json_agg(t) FROM (
        SELECT relname, n_dead_tup
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 10000
        ORDER BY n_dead_tup DESC
        LIMIT 5
    ) t) AS bloated_tables;

-- Query the view
SELECT * FROM disk_usage_stats;
```

---

## Data Archival Strategy

### Archive Old Data

```sql
-- Create archive table
CREATE TABLE orders_archive (LIKE orders INCLUDING ALL);

-- Move old data to archive
WITH moved AS (
    DELETE FROM orders
    WHERE created_at < NOW() - INTERVAL '2 years'
    RETURNING *
)
INSERT INTO orders_archive SELECT * FROM moved;

-- Vacuum the original table
VACUUM FULL orders;
```

### Partitioning for Easy Cleanup

```sql
-- Partition table by time
CREATE TABLE events (
    id SERIAL,
    event_time TIMESTAMP NOT NULL,
    data JSONB
) PARTITION BY RANGE (event_time);

-- Create monthly partitions
CREATE TABLE events_2026_01 PARTITION OF events
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE events_2026_02 PARTITION OF events
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Easy cleanup: drop old partitions
DROP TABLE events_2025_01;  -- Instant space recovery
```

---

## Emergency Space Recovery

If PostgreSQL will not start due to no disk space:

```bash
# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Free up emergency space
# Remove old logs
sudo rm /var/log/postgresql/*.log.gz

# Remove backup files
sudo rm /var/lib/postgresql/14/main/backup_label*

# 3. If still not enough space, temporarily move pg_wal
# WARNING: Risk of data loss if not done carefully!
# Only move WAL files that are clearly old

# 4. Start PostgreSQL
sudo systemctl start postgresql

# 5. Immediately run VACUUM
psql -U postgres -c "VACUUM FULL;"

# 6. Add more disk space or implement proper cleanup
```

---

## Best Practices Summary

1. **Monitor disk usage** and alert before reaching 80%
2. **Configure autovacuum** aggressively to prevent bloat
3. **Limit WAL retention** if you do not need point-in-time recovery
4. **Rotate and compress logs** automatically
5. **Archive old data** to separate storage or tables
6. **Use partitioning** for time-series data
7. **Schedule regular maintenance** windows for VACUUM FULL
8. **Keep emergency space** available (always aim for 20% free)

---

## Conclusion

Disk full errors in PostgreSQL are serious but preventable. The key strategies are:

- **Immediate recovery**: Clear logs, force checkpoint, truncate unnecessary data
- **Space reclamation**: VACUUM, REINDEX, drop unused objects
- **Prevention**: Monitor usage, configure autovacuum, archive old data
- **Long-term**: Use partitioning, set up proper alerting

Never let disk usage exceed 80% in production. With proper monitoring and maintenance, you can avoid the panic of a full disk.

---

*Need to monitor your PostgreSQL disk usage? [OneUptime](https://oneuptime.com) provides real-time disk monitoring with predictive alerts, automatic cleanup triggers, and capacity planning tools.*
