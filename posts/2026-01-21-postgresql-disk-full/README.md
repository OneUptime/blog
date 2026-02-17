# How to Fix PostgreSQL 'Disk Full' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Disk Space, WAL, Troubleshooting, Storage Management

Description: A comprehensive guide to diagnosing and resolving PostgreSQL disk full errors, covering WAL management, cleanup procedures, and prevention strategies.

---

Disk full errors can crash PostgreSQL and prevent recovery. This guide covers emergency fixes and long-term prevention.

## Symptoms

```
PANIC: could not write to file "pg_wal/...": No space left on device
ERROR: could not extend file "base/...": No space left on device
```

## Emergency Response

### Step 1: Check Disk Usage

```bash
# Overall disk usage
df -h

# PostgreSQL data directory
du -sh /var/lib/postgresql/16/main/

# Largest directories
du -sh /var/lib/postgresql/16/main/*/ | sort -hr | head -10
```

### Step 2: Identify Space Consumers

```bash
# WAL files
du -sh /var/lib/postgresql/16/main/pg_wal/

# Tables
du -sh /var/lib/postgresql/16/main/base/*/
```

```sql
-- Largest tables
SELECT
    schemaname || '.' || relname AS table,
    pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;
```

## Quick Fixes

### Clear WAL Files (if safe)

```sql
-- Check replication slots
SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots;

-- Drop inactive slots holding WAL
SELECT pg_drop_replication_slot('slot_name');
```

### Force Checkpoint

```sql
-- Trigger checkpoint to release WAL
CHECKPOINT;
```

### Clear Temp Files

```bash
# Check temp files
du -sh /var/lib/postgresql/16/main/base/pgsql_tmp/

# PostgreSQL clears these on restart
```

### VACUUM to Reclaim Space

```sql
-- VACUUM FULL reclaims space (locks table)
VACUUM FULL large_table;

-- Regular VACUUM marks space for reuse
VACUUM VERBOSE;
```

## Prevention

### Configure WAL Retention

```conf
# postgresql.conf
max_wal_size = 4GB
min_wal_size = 1GB
wal_keep_size = 1GB  # Instead of wal_keep_segments
```

### Monitor Disk Usage

```yaml
# Prometheus alert
- alert: PostgreSQLDiskFull
  expr: node_filesystem_avail_bytes{mountpoint="/var/lib/postgresql"} / node_filesystem_size_bytes < 0.1
  for: 5m
  labels:
    severity: critical
```

### Partition Large Tables

```sql
-- Partition by date for easier management
CREATE TABLE logs (
    id SERIAL,
    message TEXT,
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);
```

## Recovery Steps

```bash
# If PostgreSQL won't start
# 1. Add temporary disk space
# 2. Or move pg_wal to larger disk

# Move pg_wal
sudo systemctl stop postgresql
sudo mv /var/lib/postgresql/16/main/pg_wal /large-disk/pg_wal
sudo ln -s /large-disk/pg_wal /var/lib/postgresql/16/main/pg_wal
sudo systemctl start postgresql
```

## Conclusion

Prevent disk full errors by monitoring disk usage, configuring appropriate WAL limits, and implementing data archival policies.
