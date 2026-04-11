# How to Set Binary Log Expiration in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Configuration, Storage, Maintenance

Description: Learn how to configure binary log expiration in MySQL using binlog_expire_logs_seconds and expire_logs_days to manage disk space.

---

Binary logs can consume gigabytes of disk space on busy systems within days. Starting with MySQL 8.0.11, the default expiration is 30 days (2592000 seconds), but on high-traffic servers this may not be aggressive enough to prevent disk pressure. On MySQL 5.7 and earlier 8.0 releases (before 8.0.11), binary logs accumulate indefinitely unless you configure expiration explicitly. Configuring proper expiration ensures old binary logs are cleaned up automatically while retaining enough history for replication and point-in-time recovery.

## The Two Expiration Variables

MySQL provides two variables for controlling binary log retention:

- `binlog_expire_logs_seconds` - sets expiration in seconds (MySQL 8.0+, preferred)
- `expire_logs_days` - sets expiration in days (deprecated in MySQL 8.0, removed in later versions)

Always use `binlog_expire_logs_seconds` on MySQL 8.0 and later.

## Checking Current Settings

```sql
SHOW VARIABLES LIKE 'binlog_expire_logs_seconds';
SHOW VARIABLES LIKE 'expire_logs_days';
```

## Setting Expiration Dynamically

Change the expiration without restarting the server:

```sql
-- Set to 7 days (7 * 24 * 60 * 60 = 604800 seconds)
SET GLOBAL binlog_expire_logs_seconds = 604800;

-- Verify
SHOW VARIABLES LIKE 'binlog_expire_logs_seconds';
```

## Setting Expiration in my.cnf

For persistence across server restarts:

```ini
[mysqld]
log_bin = /var/lib/mysql/binlogs/mysql-bin
binlog_expire_logs_seconds = 604800

# For MySQL 5.7 compatibility (deprecated in 8.0)
# expire_logs_days = 7
```

## When Binary Logs Are Purged

Automatic purging happens at two points:
1. When the server starts
2. When binary log rotation occurs (a new binary log file is created)

Binary log rotation is triggered by:
- The server reaching `max_binlog_size` (default 1GB)
- Running `FLUSH BINARY LOGS` manually
- Server restart

```sql
-- Force binary log rotation and trigger purge
FLUSH BINARY LOGS;
```

## Checking Disk Usage

Monitor binary log disk usage before and after adjusting expiration:

```sql
SHOW BINARY LOGS;
```

```bash
# Check total binary log disk usage
du -sh /var/lib/mysql/binlogs/
ls -lh /var/lib/mysql/binlogs/
```

## Choosing the Right Retention Window

Your retention window must satisfy two requirements:

1. **Replication**: Retain logs long enough for all replicas to consume them. If a replica goes offline for maintenance, it must be able to catch up when it returns.

2. **Point-in-time recovery**: Retain logs to cover your backup cycle. If you take weekly full backups, retain at least 7 days of binary logs (plus a buffer).

```ini
[mysqld]
# 14 days - covers weekly backup cycle with 7-day buffer
binlog_expire_logs_seconds = 1209600
```

## Protecting Replica-Required Logs from Purge

If replicas might fall behind, configure `binlog_expire_logs_seconds` conservatively and also set `sync_binlog` for durability:

```ini
[mysqld]
binlog_expire_logs_seconds = 1209600
sync_binlog = 1
```

On Group Replication or InnoDB Cluster setups, if binary logs needed for incremental recovery have already been purged, MySQL 8.0.17+ uses the Clone plugin to automatically provision rejoining members with a full copy of the data instead.

## Manual Purge

To manually remove binary logs older than a specific date:

```sql
PURGE BINARY LOGS BEFORE '2024-03-01 00:00:00';
```

Or to purge up to a specific log file:

```sql
PURGE BINARY LOGS TO 'mysql-bin.000050';
```

## Summary

Use `binlog_expire_logs_seconds` to set automatic binary log cleanup in MySQL 8.0. Choose a retention window that covers your full backup cycle plus a buffer for replica lag. Verify disk usage after adjusting settings and use `FLUSH BINARY LOGS` to trigger immediate cleanup. For replicated setups, ensure the retention window exceeds the maximum expected replica downtime to avoid replication failures.
