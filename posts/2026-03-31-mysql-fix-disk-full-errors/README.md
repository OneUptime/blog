# How to Fix Disk Full Errors in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Disk, Error, InnoDB, Maintenance

Description: Fix MySQL disk full errors by purging binary logs, freeing InnoDB space, moving data to larger volumes, and preventing recurrence with disk monitoring.

---

When MySQL runs out of disk space, writes fail with errors like `ERROR 1114 (HY000): The table is full` or `ERROR 28: No space left on device`. The server may also crash or refuse to start. Quick action is needed to restore write capability.

## Identify Disk Usage

```bash
# Check disk usage on the data directory
df -h /var/lib/mysql

# Find the largest files
du -sh /var/lib/mysql/* | sort -rh | head -20

# Check which InnoDB tablespace files consume the most space
find /var/lib/mysql -name "*.ibd" -exec du -sh {} + 2>/dev/null | sort -rh | head -10
```

## Emergency: Free Space Immediately

The fastest way to free space is to purge binary logs:

```sql
-- Check current binary logs
SHOW BINARY LOGS;

-- Purge logs older than 3 days
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 3 DAY);

-- Or purge up to a specific log file
PURGE BINARY LOGS TO 'mysql-bin.000050';
```

Also check for large general or slow query logs:

```bash
# Check log file sizes
ls -lh /var/log/mysql/
ls -lh /var/lib/mysql/*.log

# Rotate or truncate the general log (when MySQL is running)
```

```sql
SET GLOBAL general_log = OFF;
-- Truncate the file from the OS
```

```bash
sudo truncate -s 0 /var/lib/mysql/general.log
```

## Free Space from Deleted Rows

InnoDB does not release disk space to the OS after deletes. Run `OPTIMIZE TABLE` to reclaim space:

```sql
-- Check table sizes
SELECT TABLE_NAME, DATA_LENGTH/1024/1024 AS data_MB,
       DATA_FREE/1024/1024 AS free_MB
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb'
ORDER BY DATA_FREE DESC;

-- Reclaim space
OPTIMIZE TABLE large_log_table;
```

## Configure Binary Log Retention

Prevent binary logs from filling the disk:

```text
[mysqld]
expire_logs_days = 7
# MySQL 8.0+
binlog_expire_logs_seconds = 604800
max_binlog_size = 100M
```

## Move the Data Directory to Larger Storage

If the current volume is too small, move MySQL data:

```bash
sudo systemctl stop mysql

# Copy data to new location
sudo rsync -avz /var/lib/mysql/ /mnt/large-volume/mysql/

# Update my.cnf
```

```text
[mysqld]
datadir = /mnt/large-volume/mysql
```

```bash
sudo systemctl start mysql
```

## Limit InnoDB Undo Log Growth

On write-heavy systems, the undo tablespace can grow large during long transactions:

```sql
SHOW VARIABLES LIKE 'innodb_max_undo_log_size';

-- Truncate undo logs (MySQL 8.0+)
SET GLOBAL innodb_undo_log_truncate = ON;
```

## Set Up Disk Space Alerting

Prevent future disk full situations with proactive monitoring. With OneUptime:

```bash
# Monitor disk usage via a custom metric
curl -X POST https://your-oneuptime-instance/api/monitor \
  -H "Content-Type: application/json" \
  -d '{"name": "mysql-disk", "type": "server", "threshold": 80}'
```

## Summary

Fix MySQL disk full errors by immediately purging binary logs, then identify and reclaim the largest disk consumers. Configure `expire_logs_days` or `binlog_expire_logs_seconds` to automatically manage binary log retention. For long-term capacity, use `OPTIMIZE TABLE` to reclaim fragmented space, and add disk space alerting to catch low disk situations before they cause failures.
