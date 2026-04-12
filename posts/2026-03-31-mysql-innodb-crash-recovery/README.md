# How to Recover InnoDB Data After a Crash in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Crash Recovery, Backup, Disaster Recovery

Description: Learn how InnoDB crash recovery works in MySQL, how to handle common recovery scenarios, and how to restore data after unexpected shutdowns.

---

InnoDB is designed to recover automatically from crashes using its redo log. When MySQL restarts after an unclean shutdown, InnoDB automatically replays committed transactions from the redo log and rolls back incomplete transactions. Understanding this process helps you handle situations where automatic recovery fails.

## How InnoDB Crash Recovery Works

InnoDB uses a write-ahead logging (WAL) approach. Before writing data pages to disk, it records changes in the redo log files (`ib_logfile0`, `ib_logfile1` in MySQL before 8.0.30, or files in the `#innodb_redo/` directory in MySQL 8.0.30+). On restart after a crash:

1. InnoDB reads the redo log from the last checkpoint
2. It replays committed transactions (roll forward)
3. It rolls back incomplete transactions using the undo log

```sql
-- Check if recovery occurred after startup
SELECT * FROM performance_schema.global_status
WHERE VARIABLE_NAME LIKE 'Innodb_redo_log%';
```

## Automatic Recovery

For most crashes, MySQL recovers automatically on restart:

```bash
# Check MySQL error log for recovery messages
sudo tail -100 /var/log/mysql/error.log | grep -i "recovery\|innodb\|crash"
```

Look for messages like:
```text
InnoDB: Starting crash recovery.
InnoDB: Reading tablespace information from the .ibd files...
InnoDB: Restoring possible half-written data pages
InnoDB: Completed initialization of buffer pool
```

## Diagnosing Recovery Failures

If MySQL fails to start after a crash, the error log is the first place to look:

```bash
# View recent MySQL error log
sudo journalctl -u mysql --since "1 hour ago"
# or
sudo tail -200 /var/log/mysql/error.log
```

Common error messages indicate the appropriate next step:

```text
[ERROR] InnoDB: Corruption in the InnoDB tablespace - use innodb_force_recovery
[ERROR] InnoDB: Unable to lock ./ibdata1 - check if another mysqld is running
```

## Recovering from Backup

For severe corruption, the safest recovery path is restoring from backup:

```bash
# Restore from mysqldump backup (MySQL must be running)
mysql -u root -p < /backup/full_backup_2026-03-31.sql
```

For physical backups with Xtrabackup, MySQL must be stopped and the data directory emptied first:

```bash
# Restore from Xtrabackup
sudo systemctl stop mysql
xtrabackup --prepare --target-dir=/backup/xtrabackup_2026-03-31/
sudo rm -rf /var/lib/mysql/*
xtrabackup --copy-back --target-dir=/backup/xtrabackup_2026-03-31/
sudo chown -R mysql:mysql /var/lib/mysql/
sudo systemctl start mysql
```

## Point-in-Time Recovery Using Binary Logs

If you have binary logs enabled, you can recover to a specific point in time after restoring a backup:

```bash
# Identify binary log position
mysqlbinlog /var/lib/mysql/mysql-bin.000001 | grep -i "timestamp\|pos" | head -30

# Replay binary logs up to a specific datetime
mysqlbinlog --start-datetime="2026-03-31 08:00:00" \
            --stop-datetime="2026-03-31 10:30:00" \
            /var/lib/mysql/mysql-bin.000001 | mysql -u root -p
```

## Checking Table Integrity After Recovery

After recovery, verify critical tables are consistent:

```sql
-- Check table for corruption
CHECK TABLE orders;
CHECK TABLE customers EXTENDED;

-- Repair a MyISAM-style corruption (limited for InnoDB)
REPAIR TABLE some_table;
```

For InnoDB tables, `CHECK TABLE` detects corruption but `REPAIR TABLE` has limited effect. Rebuild the table if corruption is found:

```sql
-- Rebuild the table in place
ALTER TABLE orders ENGINE=InnoDB;
```

## Enabling Redo Log Redundancy

Increase crash recovery robustness by ensuring proper redo log sizing:

```text
[mysqld]
# MySQL 8.0.30+ - use innodb_redo_log_capacity
innodb_redo_log_capacity=2G

# Ensure binary logs are enabled for PITR
log_bin=mysql-bin
binlog_expire_logs_seconds=604800
```

## Summary

InnoDB automatically recovers from most crashes by replaying the redo log on startup. Check the MySQL error log immediately after a crash to understand what happened. For automatic recovery failures, use `innodb_force_recovery` to boot MySQL and extract data. For severe corruption, restore from backup and use binary logs for point-in-time recovery. Always keep regular backups and enable binary logging for production databases.
