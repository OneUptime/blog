# How to Respond to MySQL Disk Full Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Disk Full, Incident Response, InnoDB, Troubleshooting

Description: Learn how to respond to a MySQL disk full incident by immediately freeing space, identifying the largest consumers, and preventing recurrence with monitoring and cleanup jobs.

---

## Symptoms of a Disk Full Incident

When MySQL's data directory fills up, the server becomes unresponsive or returns errors:
- `ERROR 1114 (HY000): The table is full`
- `ERROR 3 (HY000): Error writing file '/tmp/...' (Errcode: 28 - No space left on device)`
- Write queries fail while reads may still work

## Step 1: Confirm Disk Space Is the Issue

```bash
df -h /var/lib/mysql
df -h /tmp
# Check all partitions
df -h
```

## Step 2: Identify What Is Using Space

```bash
# Largest files in MySQL data directory
du -sh /var/lib/mysql/* | sort -rh | head -20

# Largest individual files
find /var/lib/mysql -type f -printf '%s %p\n' | sort -rn | head -20

# Binary log files (often the biggest culprit)
ls -lh /var/log/mysql/mysql-bin.*
```

Inside MySQL:

```sql
-- Largest tables by data size
SELECT
  table_schema,
  table_name,
  ROUND((data_length + index_length) / 1024 / 1024, 1) AS size_mb
FROM information_schema.tables
ORDER BY size_mb DESC
LIMIT 20;

-- Binary logs consuming space
SHOW BINARY LOGS;
```

## Step 3: Immediate Space Recovery

### Purge old binary logs (safest quick win)

```sql
-- On primary, only after all replicas have consumed the logs
SHOW REPLICA STATUS\G  -- check Relay_Source_Log_File on each replica

-- Purge logs older than 3 days
PURGE BINARY LOGS BEFORE NOW() - INTERVAL 3 DAY;

-- Or purge to a specific file
PURGE BINARY LOGS TO 'mysql-bin.000050';
```

### Truncate large temporary or log tables

```sql
-- Clear application log tables that have grown too large
TRUNCATE TABLE application_logs;
TRUNCATE TABLE audit_events;

-- Delete old records if full truncation is unsafe
DELETE FROM audit_events WHERE created_at < NOW() - INTERVAL 90 DAY LIMIT 100000;
```

### Remove large InnoDB temporary files

```bash
# Temporary tablespace can be reset if MySQL is stopped
# Check its size first:
ls -lh /var/lib/mysql/ibtmp1
```

## Step 4: Reclaim Space from Fragmented Tables

```sql
-- Reclaim free space after large deletes
OPTIMIZE TABLE large_table;
-- Or for InnoDB (uses ALTER TABLE internally):
ALTER TABLE large_table ENGINE=InnoDB;
```

## Step 5: Add Disk Space

If immediate cleanup is insufficient:

```bash
# Add a new volume and move the data directory (requires downtime)
systemctl stop mysql
rsync -av /var/lib/mysql/ /new/volume/mysql/
# Update datadir in /etc/mysql/mysql.conf.d/mysqld.cnf
systemctl start mysql
```

## Preventing Future Incidents

Configure automatic binary log expiry:

```sql
-- In my.cnf
-- binlog_expire_logs_seconds = 604800  -- 7 days

-- Dynamically:
SET GLOBAL binlog_expire_logs_seconds = 604800;
```

Schedule regular cleanup:

```sql
CREATE EVENT cleanup_old_logs
ON SCHEDULE EVERY 1 DAY
DO
  DELETE FROM audit_events WHERE created_at < NOW() - INTERVAL 90 DAY LIMIT 50000;
```

Set up disk space monitoring to alert at 80% capacity.

## Summary

Respond to MySQL disk full incidents by immediately purging binary logs with `PURGE BINARY LOGS`, truncating or archiving large application tables, and running `OPTIMIZE TABLE` to reclaim fragmented space. Prevent recurrence by configuring `binlog_expire_logs_seconds`, scheduling regular data cleanup events, and alerting when disk usage exceeds 80%.
