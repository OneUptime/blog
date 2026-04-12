# How to Configure sync_binlog in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Durability, Configuration, Performance

Description: Learn how to configure sync_binlog in MySQL to balance durability and performance for binary log writes to disk.

---

`sync_binlog` is one of the most important durability settings in MySQL. It controls how often MySQL flushes the binary log to disk. The setting directly impacts data durability in the event of a crash and affects write performance. Understanding this tradeoff is critical for production MySQL deployments.

## What sync_binlog Does

The binary log is first written to an OS page cache buffer, and eventually flushed to disk. `sync_binlog` determines when this flush happens:

- `sync_binlog = 0`: MySQL never explicitly syncs to disk - the OS handles it. Fastest but least safe.
- `sync_binlog = 1`: MySQL syncs to disk after every committed transaction. Safest but slowest.
- `sync_binlog = N` (where N > 1): MySQL syncs every N transactions. A middle ground.

## Checking the Current Setting

```sql
SHOW VARIABLES LIKE 'sync_binlog';
```

## Setting sync_binlog Dynamically

```sql
-- Maximum durability (recommended for production)
SET GLOBAL sync_binlog = 1;

-- Balanced (sync every 100 transactions)
SET GLOBAL sync_binlog = 100;

-- Maximum performance (OS controls flushing)
SET GLOBAL sync_binlog = 0;
```

## Setting in my.cnf for Persistence

For production databases requiring strong durability:

```ini
[mysqld]
log_bin = /var/lib/mysql/binlogs/mysql-bin
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
```

These two settings together provide the "fully durable" mode - no committed transaction is lost even if the server crashes immediately after the commit.

## The Durability Matrix

| sync_binlog | innodb_flush_log_at_trx_commit | Durability | Performance |
|-------------|-------------------------------|------------|-------------|
| 1           | 1                             | Highest    | Lowest      |
| 0           | 0                             | Lowest     | Highest     |
| 100         | 2                             | Moderate   | Moderate    |

## Performance Impact

The impact of `sync_binlog = 1` depends heavily on your storage:

```bash
# Test fsync performance on your storage
fio --name=binlog-test --ioengine=sync --rw=write \
    --bs=4k --numjobs=1 --runtime=30 --filename=/var/lib/mysql/fio-test.bin \
    --fsync=1 --output=fio-results.txt

cat fio-results.txt | grep -E "iops|lat"
```

SSDs and NVMe drives handle `sync_binlog = 1` with minimal performance impact. On spinning HDDs, the performance difference is significant.

## Replica-Specific Recommendations

On replicas that serve as recovery targets, use full durability:

```ini
[mysqld]
# On replicas that may be promoted
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
relay_log_recovery = ON
```

On read-only replicas used only for reporting, you can relax settings:

```ini
[mysqld]
# On pure read replicas
sync_binlog = 0
innodb_flush_log_at_trx_commit = 2
```

## Understanding the Risk of sync_binlog = 0

With `sync_binlog = 0`, the OS may buffer binary log writes for several seconds. If the server loses power or crashes:

- The InnoDB redo log may contain committed transactions
- The binary log may be missing those same transactions
- This creates a gap between InnoDB and the binary log, causing replication inconsistency

The server detects and handles this on restart, but transactions in the gap are lost and never replicated.

## Monitoring Binary Log Write Performance

```sql
-- Check binary log write statistics
SHOW STATUS LIKE 'Binlog_cache%';
SHOW STATUS LIKE 'Binlog_stmt_cache%';
```

```text
+----------------------------+-------+
| Variable_name              | Value |
+----------------------------+-------+
| Binlog_cache_disk_use      | 0     |
| Binlog_cache_use           | 1524  |
| Binlog_stmt_cache_disk_use | 0     |
| Binlog_stmt_cache_use      | 89    |
+----------------------------+-------+
```

## Summary

Set `sync_binlog = 1` combined with `innodb_flush_log_at_trx_commit = 1` for maximum durability on production servers that must not lose committed transactions. On systems with SSD/NVMe storage, the performance cost is acceptable. On HDDs or high-throughput write workloads where some data loss is tolerable, `sync_binlog = 100-1000` offers a practical balance. Never use `sync_binlog = 0` on a source server that drives critical replicas.
