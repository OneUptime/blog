# How to Configure max_binlog_size in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Configuration, Storage, Performance

Description: Learn how to configure max_binlog_size in MySQL to control individual binary log file sizes and manage binary log rotation.

---

`max_binlog_size` controls the maximum size of individual binary log files. When a binary log file reaches this size, MySQL automatically rotates to a new file. Choosing the right value affects disk usage patterns, recovery time, and replication management.

## Default Value and Behavior

The default value is 1073741824 bytes (1 GB). When a binary log reaches this size:

1. MySQL closes the current binary log file
2. A new binary log file with an incremented sequence number is created
3. The binary log index file is updated

Note: A single large transaction will not cause a rotation mid-transaction. The log may temporarily exceed `max_binlog_size` to complete the transaction before rotating.

## Checking the Current Setting

```sql
SHOW VARIABLES LIKE 'max_binlog_size';
```

## Changing max_binlog_size Dynamically

```sql
-- Set to 256 MB
SET GLOBAL max_binlog_size = 268435456;

-- Verify
SHOW VARIABLES LIKE 'max_binlog_size';
```

## Setting in my.cnf for Persistence

```ini
[mysqld]
log_bin = /var/lib/mysql/binlogs/mysql-bin
max_binlog_size = 268435456  # 256 MB
```

## Choosing the Right Size

The optimal `max_binlog_size` depends on your environment:

**Smaller files (64-256 MB):**
- Faster to transfer to replicas or remote storage
- Easier to manage and rotate
- More files to track, but each is quicker to process
- Better for streaming replication over slower networks

**Larger files (512 MB - 1 GB):**
- Fewer file handles and index entries
- More efficient for bulk operations
- May delay purge granularity

For most production setups, 128-512 MB is a good balance.

## Forcing Binary Log Rotation

To force a new binary log without waiting for the size limit:

```sql
FLUSH BINARY LOGS;
```

Verify the new file was created:

```sql
SHOW BINARY LOGS;
SHOW BINARY LOG STATUS;
```

## Calculating Expected Log Generation Rate

Estimate how quickly binary logs fill up to choose appropriate settings:

```bash
# List binary logs and their sizes to estimate generation rate
mysql -u root -p -e "SHOW BINARY LOGS;"
```

```sql
-- Check current binary log position growth
SELECT @@global.log_bin_basename;
SHOW BINARY LOG STATUS;
-- Wait 1 minute, then check again to see position increment
```

## Impact on Replication

Smaller `max_binlog_size` means replicas receive log rotation events more frequently. Each rotation causes the replica to request a new binary log file from the source. This is generally fine, but on very high-throughput systems, very small values (under 32 MB) can add overhead.

```sql
-- On the replica, observe rotation frequency
SHOW REPLICA STATUS\G
-- Check: Relay_Log_File to see which file is being read
```

## Interaction with binlog_expire_logs_seconds

`max_binlog_size` and `binlog_expire_logs_seconds` work together. Expiration only happens on log rotation. If you have `max_binlog_size = 1G` and write less than 1 GB per day, logs may not rotate (and therefore not expire) as expected.

Configure accordingly:

```ini
[mysqld]
max_binlog_size = 268435456       # 256 MB - rotate frequently
binlog_expire_logs_seconds = 604800  # 7 days
```

## Summary

`max_binlog_size` controls how large individual binary log files grow before rotation. The default 1 GB is appropriate for most workloads, but smaller values (128-256 MB) work better for network-based replication and more granular log management. Set it in `my.cnf` for persistence and pair it with `binlog_expire_logs_seconds` for automatic cleanup. Use `FLUSH BINARY LOGS` to force immediate rotation when needed.
