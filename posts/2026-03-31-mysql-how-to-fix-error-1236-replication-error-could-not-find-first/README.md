# How to Fix ERROR 1236 Replication Error in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Error Handling, Troubleshooting

Description: Learn how to diagnose and fix MySQL ERROR 1236 'Could not find first log file named in binary log index' in replication setups.

---

## What is ERROR 1236

MySQL Replication ERROR 1236 appears in replica status as:

```text
Last_IO_Error: Got fatal error 1236 from master when reading data from binary log:
'Could not find first log file named in binary log index file'
```

This error occurs when the MySQL replica requests a binary log file from the primary that no longer exists. The binary log file was likely purged on the primary before the replica could consume it.

## Checking Replica Status

```sql
SHOW SLAVE STATUS\G
-- MySQL 8.0+:
SHOW REPLICA STATUS\G
```

Look for:
- `Last_IO_Error` - shows the ERROR 1236 message
- `Master_Log_File` - the log file the replica is trying to read
- `Read_Master_Log_Pos` - position within that file

## Checking Available Binary Logs on Primary

Connect to the primary server:

```sql
SHOW BINARY LOGS;
```

If the file listed in the replica's `Master_Log_File` does not appear here, it has been purged.

## Solution 1 - Resync the Replica

The safest solution is to resync the replica using a fresh dump from the primary.

On the primary:

```bash
mysqldump --single-transaction --master-data=2 --all-databases \
  -u root -p > full_backup.sql
```

Check the binary log position embedded in the dump:

```bash
head -50 full_backup.sql | grep "CHANGE MASTER"
```

Output:

```text
-- CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000042', MASTER_LOG_POS=154;
```

On the replica, stop replication first:

```sql
STOP SLAVE;
```

Then restore the dump:

```bash
mysql -u root -p < full_backup.sql
```

Then reset replication and configure the new position:

```sql
RESET SLAVE;
CHANGE MASTER TO
  MASTER_HOST='primary_host',
  MASTER_USER='repl_user',
  MASTER_PASSWORD='repl_password',
  MASTER_LOG_FILE='mysql-bin.000042',
  MASTER_LOG_POS=154;
START SLAVE;
SHOW SLAVE STATUS\G
```

## Solution 2 - Use GTID-Based Replication (MySQL 5.6+)

With GTID replication, the replica automatically finds the right position without needing explicit log file names.

On primary `/etc/mysql/my.cnf`:

```text
[mysqld]
gtid_mode = ON
enforce_gtid_consistency = ON
log_bin = mysql-bin
binlog_format = ROW
```

On replica:

```sql
STOP SLAVE;
CHANGE MASTER TO
  MASTER_HOST='primary_host',
  MASTER_AUTO_POSITION=1;
START SLAVE;
```

## Preventing Future Purge Issues

Ensure binary logs are not purged before the replica has consumed them.

Check current purge settings on primary:

```sql
SHOW VARIABLES LIKE 'expire_logs_days';
SHOW VARIABLES LIKE 'binlog_expire_logs_seconds';
```

Increase retention:

```sql
SET GLOBAL binlog_expire_logs_seconds = 604800; -- 7 days
```

Or in `/etc/mysql/my.cnf`:

```text
[mysqld]
binlog_expire_logs_seconds = 604800
```

## Checking Replication Lag

High replication lag is a warning sign that the replica might fall behind and eventually miss purged logs:

```sql
SHOW SLAVE STATUS\G
-- Look at: Seconds_Behind_Master
```

If lag is consistently high, investigate slow queries on the replica or consider parallel replication:

```sql
SHOW VARIABLES LIKE 'slave_parallel_workers';
SET GLOBAL slave_parallel_workers = 4;
SET GLOBAL slave_parallel_type = 'LOGICAL_CLOCK';
```

## Summary

ERROR 1236 in MySQL replication means the replica requested a binary log file that was already purged on the primary. Fix it by resyncing the replica from a fresh dump, capturing the log position, and configuring `CHANGE MASTER TO` with the correct coordinates. Prevent recurrence by increasing `binlog_expire_logs_seconds` and monitoring replication lag to ensure the replica stays current.
