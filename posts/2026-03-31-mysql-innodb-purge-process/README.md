# How MySQL InnoDB Purge Process Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Purge, MVCC, Internal

Description: Understand how the InnoDB purge process reclaims space from deleted and updated rows, and how to tune it for high-write workloads.

---

## What Is the Purge Process?

InnoDB implements Multi-Version Concurrency Control (MVCC). When you delete or update a row, InnoDB does not remove the old version immediately. Instead, it marks the row as deleted and keeps old versions so active transactions can still read a consistent snapshot. The purge process is a background thread that removes these old row versions once no active transaction needs them anymore.

Without purging, deleted rows and undo log entries accumulate indefinitely, causing:
- Table and index bloat
- Increasing undo tablespace size
- Slower queries that have to skip many deleted row versions

## How Purge Works Internally

1. A DELETE or UPDATE writes the old row version to the undo log and marks the clustered index record as deleted.
2. InnoDB records a `trx_id` on every row version indicating which transaction last modified it.
3. The purge coordinator thread tracks the `purge_sys->view` - the oldest read view still open by any transaction.
4. Once all active transactions have a `trx_id` newer than a row version, the purge threads can safely remove that version.
5. Purge removes the delete-marked records from the clustered index and secondary indexes, and truncates undo log segments.

## Monitoring the Purge Process

Check how far behind purge is:

```sql
-- History list length: number of undo log entries waiting to be purged
-- High values (thousands+) indicate purge is falling behind
SHOW ENGINE INNODB STATUS\G
-- Look for: "History list length 12345"

-- More detailed view
SELECT name, count
FROM information_schema.innodb_metrics
WHERE name IN (
  'trx_rseg_history_len',
  'purge_del_mark_records',
  'purge_upd_exist_or_extern_records',
  'purge_undo_log_pages'
);
```

A history list length above 1000 to 5000 suggests purge cannot keep up with the write rate.

## Tuning the Purge Configuration

```sql
-- Number of purge threads (default: 4 in MySQL 8)
-- Increase for high-write workloads
-- Note: dynamic since MySQL 8.0.26; requires restart on earlier 8.0.x versions
SHOW VARIABLES LIKE 'innodb_purge_threads';
SET GLOBAL innodb_purge_threads = 8;

-- Batch size: rows purged per iteration
SHOW VARIABLES LIKE 'innodb_purge_batch_size';
SET GLOBAL innodb_purge_batch_size = 300;

-- Maximum undo log size before InnoDB attempts to truncate
SHOW VARIABLES LIKE 'innodb_max_undo_log_size';
SET GLOBAL innodb_max_undo_log_size = 1073741824;  -- 1 GB

-- Enable automatic undo log truncation
SHOW VARIABLES LIKE 'innodb_undo_log_truncate';
SET GLOBAL innodb_undo_log_truncate = ON;
```

In `my.cnf` for persistence:

```bash
[mysqld]
innodb_purge_threads         = 8
innodb_purge_batch_size      = 300
innodb_max_undo_log_size     = 1G
innodb_undo_log_truncate     = ON
innodb_undo_tablespaces      = 2   # deprecated since 8.0.14; minimum is 2 by default
```

## Long-Running Transactions Block Purge

A transaction that stays open for hours (common in analytics or accidental forgotten transactions) prevents purge from advancing its view:

```sql
-- Find long-running transactions
SELECT trx_id,
       trx_started,
       TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS duration_secs,
       trx_mysql_thread_id,
       trx_query
FROM information_schema.innodb_trx
ORDER BY trx_started ASC;
```

If you find a very old transaction, kill it (after confirming with the owner):

```sql
KILL 12345;
```

## Impact of Purge Lag on Performance

When purge falls behind, secondary index lookups become slower because MySQL must check multiple row versions to find the visible one. This manifests as:
- Slow SELECT performance even with good indexes
- Growing undo tablespace files on disk
- High `trx_rseg_history_len` in InnoDB status

## Summary

The InnoDB purge process is the garbage collector for MVCC row versions and undo log entries. It runs as background threads and advances only as far as the oldest active transaction allows. Monitor the history list length in `SHOW ENGINE INNODB STATUS`, tune `innodb_purge_threads` and `innodb_purge_batch_size` for write-heavy workloads, and keep transactions short to prevent purge lag from degrading query performance.
