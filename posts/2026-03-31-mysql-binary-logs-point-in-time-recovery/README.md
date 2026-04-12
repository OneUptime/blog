# How to Use Binary Logs for Point-in-Time Recovery in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Recovery, Backup, Point-in-Time

Description: Learn how to use MySQL binary logs alongside a full backup to perform point-in-time recovery and restore a database to any specific moment.

---

Point-in-time recovery (PITR) allows you to restore a MySQL database to any specific moment by combining a full backup with binary log replay. This is essential when you need to recover from accidental data deletion or corruption without losing all transactions since the last backup.

## How Binary Log PITR Works

The process has two stages:

1. Restore the most recent full backup (gets you to the backup time)
2. Replay binary log events from the backup time up to the desired recovery point

## Prerequisites

Binary logging must be enabled:

```text
[mysqld]
log_bin=/var/lib/mysql/mysql-bin
binlog_format=ROW
expire_logs_days=14
```

Verify binary logging is active:

```sql
SHOW VARIABLES LIKE 'log_bin';
SHOW MASTER STATUS;
```

## Creating a Backup with Binary Log Position

When taking a full backup, record the binary log position:

```bash
mysqldump -u root -p \
  --single-transaction \
  --master-data=2 \
  --all-databases \
  > /backup/full_backup_20260331_020000.sql
```

The `--master-data=2` flag adds a comment near the top of the dump:

```sql
-- CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000042', MASTER_LOG_POS=1234567;
```

## Step 1: Restore the Full Backup

```bash
mysql -u root -p < /backup/full_backup_20260331_020000.sql
```

Note the binary log filename and position from the dump file header.

## Step 2: Identify the Recovery Point

Find the exact binary log position just before the data loss occurred:

```bash
# List available binary log files
mysqlbinlog --no-defaults --verbose /var/lib/mysql/mysql-bin.000042 \
  | grep -i "drop table\|delete from\|truncate"
```

Or look for timestamps:

```bash
# Show events around the time of the incident
mysqlbinlog --no-defaults \
  --start-datetime="2026-03-31 09:00:00" \
  --stop-datetime="2026-03-31 10:00:00" \
  /var/lib/mysql/mysql-bin.000042 \
  | head -100
```

## Step 3: Replay Binary Logs Up to the Recovery Point

```bash
# Replay from backup position to just before the incident
mysqlbinlog --no-defaults \
  --start-position=1234567 \
  --stop-position=4567890 \
  /var/lib/mysql/mysql-bin.000042 \
  | mysql -u root -p
```

Or use datetime-based recovery:

```bash
mysqlbinlog --no-defaults \
  --start-datetime="2026-03-31 02:00:01" \
  --stop-datetime="2026-03-31 09:44:59" \
  /var/lib/mysql/mysql-bin.000042 \
  /var/lib/mysql/mysql-bin.000043 \
  | mysql -u root -p
```

## Replaying Multiple Binary Log Files

```bash
mysqlbinlog --no-defaults \
  --start-position=1234567 \
  /var/lib/mysql/mysql-bin.000042 \
  /var/lib/mysql/mysql-bin.000043 \
  /var/lib/mysql/mysql-bin.000044 \
  | mysql -u root -p
```

## Verifying Recovery

```sql
-- Check the data was recovered correctly
SELECT COUNT(*) FROM orders WHERE created_at < '2026-03-31 09:45:00';
SELECT * FROM orders ORDER BY id DESC LIMIT 10;
```

## Summary

Binary log PITR in MySQL requires a full backup taken with `--master-data=2` to record the starting binary log position, followed by `mysqlbinlog` replaying events up to the recovery point. Always enable binary logging in production and retain binary logs for at least as long as your recovery window requires. Test PITR procedures regularly in a non-production environment.
