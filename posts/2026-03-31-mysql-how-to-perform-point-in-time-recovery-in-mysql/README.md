# How to Perform Point-in-Time Recovery in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Recovery, Binary Log, Point-in-Time Recovery, Administration

Description: Learn how to perform point-in-time recovery in MySQL using a full backup and binary logs to restore a database to a specific moment in time.

---

## What Is Point-in-Time Recovery?

Point-in-time recovery (PITR) allows you to restore a MySQL database to a specific moment - for example, to the state it was in just before an accidental `DROP TABLE` or erroneous `DELETE` statement. It requires:

1. A full backup (mysqldump or physical backup)
2. Binary logs from the time of the backup to the target recovery time

## Prerequisites

Binary logging must be enabled before you need recovery:

```text
[mysqld]
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW
server_id = 1
```

Verify binary logging is on:

```sql
SHOW VARIABLES LIKE 'log_bin';
-- Should return: ON
```

## Step 1 - Identify the Recovery Point

Determine the exact time or binary log position to recover to. List available binary logs:

```sql
SHOW BINARY LOGS;
```

```text
+------------------+-----------+
| Log_name         | File_size |
+------------------+-----------+
| mysql-bin.000001 | 524288000 |
| mysql-bin.000002 | 237894    |
+------------------+-----------+
```

Scan for the event just before the incident:

```bash
mysqlbinlog --start-datetime="2024-05-10 14:00:00" \
            --stop-datetime="2024-05-10 14:35:00" \
            /var/log/mysql/mysql-bin.000002 | grep -A 5 "DROP TABLE"
```

Note the position or timestamp just before the damaging event.

## Step 2 - Restore the Full Backup

```bash
mysql -u root -p your_database < /backups/backup_20240510.sql
```

If using a physical backup method like XtraBackup, stop MySQL first, restore the data files, then start MySQL again.

## Step 3 - Apply Binary Logs Up to the Recovery Point

Use `mysqlbinlog` to replay events from the full backup time to just before the incident.

Replay from a specific datetime range:

```bash
mysqlbinlog \
  --start-datetime="2024-05-10 02:00:00" \
  --stop-datetime="2024-05-10 14:32:00" \
  /var/log/mysql/mysql-bin.000001 \
  /var/log/mysql/mysql-bin.000002 \
  | mysql -u root -p your_database
```

Or replay up to a specific binary log position:

```bash
mysqlbinlog \
  --start-position=4 \
  --stop-position=98765 \
  /var/log/mysql/mysql-bin.000002 \
  | mysql -u root -p your_database
```

## Step 4 - Verify Recovery

```sql
USE your_database;
SHOW TABLES;
SELECT COUNT(*) FROM orders WHERE created_at < '2024-05-10 14:32:00';
```

Confirm the accidentally dropped or modified data is restored.

## Using mysqlbinlog with Encrypted Binary Logs

If binary log encryption is enabled, decrypt during extraction:

```bash
mysqlbinlog --read-from-remote-server \
  --host=127.0.0.1 \
  --user=root \
  --password \
  --start-datetime="2024-05-10 14:00:00" \
  --stop-datetime="2024-05-10 14:32:00" \
  mysql-bin.000002 | mysql -u root -p
```

## Skipping a Specific Event (Disaster Recovery)

If you know the exact position of the damaging statement, you can skip it:

```bash
# Apply everything before the bad event
mysqlbinlog \
  --stop-position=55000 \
  /var/log/mysql/mysql-bin.000002 \
  | mysql -u root -p your_database

# Skip position 55000-56500 (the DROP TABLE), continue after
mysqlbinlog \
  --start-position=56501 \
  /var/log/mysql/mysql-bin.000002 \
  | mysql -u root -p your_database
```

## Automating Backup + PITR

Best practice: combine nightly full backups with binary log retention:

```text
[mysqld]
expire_logs_days = 14
```

Or in MySQL 8.0:

```text
[mysqld]
binlog_expire_logs_seconds = 1209600
```

This retains 14 days of binary logs for recovery.

## Summary

Point-in-time recovery uses a full backup as a baseline and replays binary log events up to the desired moment. Enable binary logging before it is needed, retain logs for an adequate retention window, and use `mysqlbinlog` to apply events up to a specific time or position. To skip a specific damaging event, apply logs in two passes with `--stop-position` and `--start-position` around the event.
