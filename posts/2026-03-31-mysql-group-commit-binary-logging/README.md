# How to Configure MySQL Group Commit for Binary Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Group Commit, Performance, Durability

Description: Learn how MySQL group commit for binary logging works and how to tune binlog_group_commit settings to improve write throughput without sacrificing durability.

---

## Overview

MySQL group commit is an optimization that batches multiple transaction commits into a single disk sync operation. When binary logging is enabled, this is especially important because each commit requires writing to both the InnoDB redo log and the binary log. Properly configuring group commit can dramatically improve write throughput on busy servers.

## How Group Commit Works

Without group commit, each transaction commit requires:

```text
1. Prepare phase: Write to InnoDB redo log
2. Commit phase: Write to binary log
3. Fsync binary log
4. Commit InnoDB (redo log fsync)
```

With group commit, multiple transactions batch their binary log writes and share a single fsync:

```text
Transactions T1, T2, T3 arrive at the same time:
1. All three write to binary log buffer
2. One fsync flushes all three
3. All three commit InnoDB
Result: 3x fewer fsyncs for the same throughput
```

## Configuring Group Commit Parameters

```sql
-- View current group commit settings
SHOW VARIABLES LIKE 'binlog_group_commit%';
SHOW VARIABLES LIKE 'sync_binlog';
```

Key variables:

```sql
-- Delay before flushing binary log group (microseconds, default: 0)
-- Higher value = larger groups = better throughput, slightly higher latency
SET GLOBAL binlog_group_commit_sync_delay = 1000;

-- Maximum transactions to wait for before flushing (0 = no limit)
SET GLOBAL binlog_group_commit_sync_no_delay_count = 100;
```

## The sync_binlog Setting

`sync_binlog` controls how often the binary log is synced to disk:

```text
sync_binlog = 0  - OS decides (fastest, least durable)
sync_binlog = 1  - Sync after every transaction (most durable, slowest)
sync_binlog = N  - Sync every N binary log commit groups (balanced)
```

```sql
-- Recommended production setting: sync after every transaction
SET GLOBAL sync_binlog = 1;

-- For higher throughput at slightly reduced durability:
SET GLOBAL sync_binlog = 100;
```

## Tuning Group Commit for Throughput

The relationship between delay and throughput:

```text
binlog_group_commit_sync_delay = 0:
  - Minimal latency per transaction
  - Low group sizes (1-2 transactions per fsync)
  - Good for low-concurrency workloads

binlog_group_commit_sync_delay = 1000 (1ms):
  - Slightly higher per-transaction latency
  - Larger groups (10-50 transactions per fsync)
  - Much better throughput under high concurrency
```

Configure in `my.cnf`:

```text
[mysqld]
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
binlog_group_commit_sync_delay = 1000
binlog_group_commit_sync_no_delay_count = 100
```

## Monitoring Group Commit Efficiency

**Note:** The status variables `Binlog_commits` and `Binlog_group_commits` are available in Percona Server for MySQL and MariaDB, but not in standard Oracle MySQL. If you are using Percona Server or MariaDB, you can query them directly:

```sql
-- Percona Server / MariaDB only
SHOW STATUS LIKE 'Binlog_commits';
SHOW STATUS LIKE 'Binlog_group_commits';
```

And calculate the average group size:

```sql
-- Percona Server / MariaDB only
SELECT
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status
     WHERE VARIABLE_NAME = 'Binlog_commits') /
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status
     WHERE VARIABLE_NAME = 'Binlog_group_commits')
    AS avg_transactions_per_group;
```

A ratio greater than 1 indicates group commit is working. Higher ratios mean better batching efficiency.

For standard Oracle MySQL, you can indirectly assess group commit effectiveness by monitoring overall write throughput (transactions per second) and disk I/O before and after tuning the group commit parameters.

## InnoDB Redo Log and Binary Log Coordination

For maximum durability, combine group commit settings with InnoDB durability settings:

```text
[mysqld]
# Full ACID compliance
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1

# Group commit tuning
binlog_group_commit_sync_delay = 1000
binlog_group_commit_sync_no_delay_count = 100

# Recommended for crash-safe replication
relay_log_recovery = ON
```

## Summary

MySQL group commit batches multiple transaction commits to share binary log fsync operations, significantly improving write throughput on multi-transaction workloads. Tune `binlog_group_commit_sync_delay` to increase the window for gathering transactions into a group - a value of 1000-5000 microseconds typically provides a good throughput improvement with minimal latency impact. Always keep `sync_binlog=1` and `innodb_flush_log_at_trx_commit=1` for crash-safe configurations, and monitor the `Binlog_commits` vs `Binlog_group_commits` ratio to measure group commit efficiency.
