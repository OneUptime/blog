# How to Purge Old Binary Logs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Maintenance, Storage, Administration

Description: Learn how to safely purge old MySQL binary log files using PURGE BINARY LOGS and automatic expiration settings to free up disk space.

---

Binary logs accumulate quickly on busy MySQL servers. A server processing thousands of transactions per hour can generate gigabytes of binary logs in a single day. Failing to purge old binary logs leads to disk exhaustion, which can crash the MySQL server. This guide covers safe manual and automatic purging strategies.

## Why You Should NOT Delete Binary Logs Manually

Never delete binary log files with `rm` directly from the filesystem. MySQL maintains an internal index of binary logs (`mysql-bin.index`), and manually deleting files corrupts this index, causing replication failures and server errors.

Always use MySQL's built-in purge commands.

## Manual Purge by Date

Purge all binary logs older than a specific datetime:

```sql
PURGE BINARY LOGS BEFORE '2024-03-01 00:00:00';
```

Use a relative date expression:

```sql
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);
```

## Manual Purge by Log File Name

Purge all binary logs up to (but not including) a specific file:

```sql
-- Remove logs before mysql-bin.000050
PURGE BINARY LOGS TO 'mysql-bin.000050';
```

First check the current list of logs:

```sql
SHOW BINARY LOGS;
```

## Safety Check Before Purging

Before purging, verify that no replicas are behind on reading from the logs you plan to remove. Purging a log file that a replica still needs will break replication.

```sql
-- On each replica, check its replication position
SHOW REPLICA STATUS\G
-- Look at: Relay_Source_Log_File and Exec_Source_Log_Pos

-- On the source server, list connected replicas
SHOW REPLICAS;
```

Only purge logs that all replicas have already processed.

If using Group Replication or InnoDB Cluster, MySQL automatically protects needed logs from purging.

## Automatic Expiration

Configure automatic expiration so MySQL purges old logs without manual intervention:

```ini
[mysqld]
log_bin = /var/lib/mysql/binlogs/mysql-bin
binlog_expire_logs_seconds = 604800  # 7 days
```

Apply dynamically without restart:

```sql
SET GLOBAL binlog_expire_logs_seconds = 604800;
```

Force immediate cleanup of expired logs:

```sql
FLUSH BINARY LOGS;
```

## Checking Disk Space Before and After

```bash
# Before purge
df -h /var/lib/mysql
du -sh /var/lib/mysql/binlogs/

# Purge logs older than 3 days
mysql -u root -p -e "PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 3 DAY);"

# After purge
df -h /var/lib/mysql
du -sh /var/lib/mysql/binlogs/
```

## Automating Purge with a Shell Script

For environments requiring controlled purge policies:

```bash
#!/bin/bash
# Safe binary log purge script
MYSQL_USER="root"
MYSQL_PASS_FILE="/etc/mysql/mysql.pass"
RETAIN_DAYS=7

mysql -u "$MYSQL_USER" -p"$(cat $MYSQL_PASS_FILE)" <<EOF
-- List connected replicas (verify they are caught up before purging)
SHOW REPLICAS;

-- Purge logs older than RETAIN_DAYS
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL $RETAIN_DAYS DAY);

-- Verify remaining logs
SHOW BINARY LOGS;
EOF
```

## Emergency Disk Space Recovery

If the disk is nearly full and MySQL is refusing connections, purge aggressively:

```sql
-- Connect with --skip-networking disabled temporarily if needed
-- Purge all but the last 2 days
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 2 DAY);

-- Or purge to a specific recent file
SHOW BINARY LOGS;
PURGE BINARY LOGS TO 'mysql-bin.000090';
```

## Summary

Always use `PURGE BINARY LOGS` to remove old binary log files - never delete them manually from the filesystem. Before purging, verify all replicas have consumed the logs you plan to remove. Configure `binlog_expire_logs_seconds` for automatic cleanup and run `FLUSH BINARY LOGS` to trigger immediate expiration. Monitor disk usage regularly to catch growth before it becomes a disk-full emergency.
