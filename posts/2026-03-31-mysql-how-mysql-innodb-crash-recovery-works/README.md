# How MySQL InnoDB Crash Recovery Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Crash Recovery, Redo Log, ACID, Internal

Description: Understand how InnoDB uses the redo log and undo log to recover from crashes automatically, ensuring committed transactions are never lost.

---

## Overview of InnoDB Crash Recovery

InnoDB is designed for ACID compliance. After a crash, it automatically recovers to a consistent state on the next startup without requiring manual intervention. Recovery is based on:

- **Redo log** - records all changes made by transactions, including uncommitted ones.
- **Undo log** - records the original values before a transaction modified them.

On restart after a crash, InnoDB:
1. Rolls forward all transactions (committed and uncommitted) by replaying the redo log.
2. Rolls back uncommitted transactions using the undo log.

## The Redo Log

The redo log is a circular set of files (`ib_logfile0`, `ib_logfile1`) that records every physical change to data pages. Under the Write-Ahead Logging (WAL) protocol, redo log records must be flushed to disk before the corresponding dirty data pages are flushed from the buffer pool to disk. This ensures that changes can always be recovered from the redo log even if a crash occurs before the data pages are written.

```sql
SHOW VARIABLES LIKE 'innodb_log_file_size';
SHOW VARIABLES LIKE 'innodb_log_files_in_group';
-- e.g., 2 files of 512MB each = 1GB redo log
```

In MySQL 8.0.30+, InnoDB manages redo log files dynamically in the `#innodb_redo` directory (with individual files named `#ib_redo<N>`). The `innodb_log_file_size` and `innodb_log_files_in_group` variables are deprecated in favor of `innodb_redo_log_capacity`.

## The Undo Log

The undo log stores the "before image" of modified rows. It is used to:
- Roll back uncommitted transactions after a crash.
- Provide MVCC (consistent reads) for other transactions during normal operation.

Undo logs are stored in the undo tablespace files.

## The Crash Recovery Process

### Step 1 - Determine the Starting Point

InnoDB reads the last checkpoint position from the redo log. The checkpoint is the point in the redo log up to which all dirty pages have been flushed to disk.

```sql
SHOW ENGINE INNODB STATUS\G
-- Look for "Log sequence number", "Log flushed up to", "Last checkpoint at"
```

### Step 2 - Roll Forward (Redo)

InnoDB replays all redo log entries from the last checkpoint to the end of the log. This brings the data pages up to the state they were in at the moment of the crash, including uncommitted transactions.

### Step 3 - Roll Back (Undo)

InnoDB identifies transactions that were active (not committed) at the time of the crash by examining the undo log. These transactions are rolled back to restore consistency.

### Visualizing the Process

```text
Timeline:
T1: BEGIN -> writes -> COMMIT (redo log persisted)
T2: BEGIN -> writes ->  [CRASH]  (no commit, must be rolled back)

On restart:
1. Read redo log from checkpoint
2. Re-apply T1 and T2's changes (roll forward)
3. Detect T2 was not committed, apply undo log to reverse T2
4. Database is consistent
```

## Checkpoint Frequency

Checkpoints flush dirty pages from the buffer pool to disk, advancing the checkpoint LSN (Log Sequence Number). More frequent checkpoints mean less redo log to replay on recovery:

```sql
SHOW VARIABLES LIKE 'innodb_io_capacity';  -- Controls background flushing rate
```

If the redo log is too small, checkpoints happen too frequently (causing write stalls). If too large, recovery takes longer.

## Monitoring Recovery

After a restart, MySQL logs recovery progress:

```bash
tail -f /var/log/mysql/error.log
```

```text
[InnoDB] Starting crash recovery.
[InnoDB] Applying a batch of 1234 redo log records...
[InnoDB] Rolling back 2 incomplete transactions
[InnoDB] Crash recovery finished
```

## Controlling Redo Log Size

For MySQL versions before 8.0.30:

```text
[mysqld]
innodb_log_file_size = 1G       -- Larger = faster writes, slower recovery
innodb_log_files_in_group = 2   -- Total redo log = 2GB
```

For MySQL 8.0.30+, use `innodb_redo_log_capacity` instead:

```text
[mysqld]
innodb_redo_log_capacity = 2G   -- Total redo log capacity
```

For high write workloads, a larger redo log reduces checkpoint pressure. A common recommendation is to size the redo log large enough for 1 hour of writes.

## Doublewrite Buffer

InnoDB also uses a doublewrite buffer to protect against partial page writes (torn pages) during a crash:

```sql
SHOW VARIABLES LIKE 'innodb_doublewrite';
-- Should be ON
```

Before writing a dirty page to its actual location on disk, InnoDB writes it to the doublewrite buffer first. If a crash occurs during the real write, InnoDB can recover the complete page from the doublewrite buffer.

## Forcing Recovery from a Catastrophic State

If normal recovery fails, use `innodb_force_recovery` to start the server despite corruption. Higher levels progressively skip more recovery steps (level 6 skips redo log replay entirely). At any level above 0, InnoDB prevents DML operations, so you can only extract data:

```text
[mysqld]
innodb_force_recovery = 1  -- Start at 1, increase up to 6 if needed
```

```bash
# Start with force recovery to read data
mysqld_safe --innodb-force-recovery=1 &
mysqldump --all-databases > /backup/emergency_backup.sql
```

Always dump data immediately after starting with forced recovery.

## Summary

InnoDB crash recovery is fully automatic, using a Write-Ahead Log (redo log) to roll forward committed transactions and an undo log to roll back uncommitted ones. This guarantees ACID durability - no committed transaction is ever lost on restart. Size the redo log appropriately for your write volume, keep the doublewrite buffer enabled for torn page protection, and monitor error logs after a crash to verify clean recovery.
