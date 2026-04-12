# How to Configure InnoDB Checkpointing in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Checkpoint, Performance

Description: Learn how InnoDB checkpointing works, what triggers a checkpoint, how fuzzy checkpoints protect durability, and how to tune flushing variables for your workload.

---

## What Is a Checkpoint?

A checkpoint is the process of writing dirty pages (modified pages in the buffer pool that have not yet been written to disk) to data files. Checkpoints ensure that after a crash, MySQL does not need to replay the entire redo log - only the changes since the last checkpoint.

```text
Write         Buffer Pool (dirty pages)
  |                  |
  v                  v
Redo Log <------- Checkpoint -------> Data Files (.ibd)

On crash recovery:
  Replay redo log from last checkpoint LSN onward
```

## Log Sequence Number (LSN)

Every change in InnoDB is tagged with a monotonically increasing Log Sequence Number. The checkpoint LSN marks how far into the redo log the data files are current.

```sql
-- View current checkpoint info
SHOW ENGINE INNODB STATUS\G
-- Look for the LOG section:
-- Log sequence number  12345678
-- Log flushed up to    12345678
-- Pages flushed up to  12340000
-- Last checkpoint at   12340000
```

The gap between "Log sequence number" and "Last checkpoint at" is the "redo log lag" - the amount of redo log that would need to be replayed on a crash.

## Fuzzy Checkpoint

InnoDB uses a fuzzy checkpoint model. Dirty pages are flushed continuously in the background rather than in one large burst. This avoids I/O spikes and keeps the redo log lag small.

Background flush threads write dirty pages to disk at a rate governed by:

```text
innodb_io_capacity         - target I/O ops/sec for background tasks
innodb_io_capacity_max     - burst ceiling
innodb_max_dirty_pages_pct - target maximum % of dirty pages in buffer pool
innodb_max_dirty_pages_pct_lwm - start flushing early below this watermark
```

## Sharp Checkpoint

A sharp checkpoint writes ALL dirty pages to disk. This happens at shutdown when `innodb_fast_shutdown = 0`. With the default value of `1`, dirty pages are still flushed but full purge and change buffer merge are skipped. With a value of `2`, no flushing occurs and crash recovery is required at the next start. A sharp checkpoint (value `0`) makes crash recovery instant after shutdown.

```sql
SHOW VARIABLES LIKE 'innodb_fast_shutdown';
-- 0 = full purge + change buffer merge + sharp checkpoint (slow but clean)
-- 1 = default (flush dirty pages, skip full purge and change buffer merge)
-- 2 = flush logs only, crash recovery at next start (fastest stop)
```

## Tuning Flush Rate

```sql
SHOW VARIABLES LIKE 'innodb_io_capacity%';
SHOW VARIABLES LIKE 'innodb_max_dirty_pages_pct%';
SHOW VARIABLES LIKE 'innodb_flush_neighbors';
```

Recommended settings for SSDs:

```text
[mysqld]
innodb_io_capacity           = 4000
innodb_io_capacity_max       = 8000
innodb_max_dirty_pages_pct   = 10
innodb_flush_neighbors       = 0    # no neighbor flushing on SSD
```

For HDDs, `innodb_flush_neighbors = 1` groups adjacent page flushes to improve seek performance.

## Adaptive Flushing

InnoDB's adaptive flushing algorithm increases flush rate when the redo log is filling up faster than pages are being written:

```sql
SHOW VARIABLES LIKE 'innodb_adaptive_flushing%';
-- innodb_adaptive_flushing        = ON
-- innodb_adaptive_flushing_lwm    = 10  (% of redo log used as low watermark)
```

When redo log usage exceeds `innodb_adaptive_flushing_lwm`, flushing rate increases ahead of the standard schedule to prevent the redo log from filling completely.

## Monitoring Dirty Page Pressure

```sql
-- Current dirty page count
SELECT variable_name, variable_value
FROM performance_schema.global_status
WHERE variable_name IN (
  'Innodb_buffer_pool_pages_dirty',
  'Innodb_buffer_pool_pages_total',
  'Innodb_pages_written',
  'Innodb_os_log_written'
);
```

## Summary

InnoDB uses continuous fuzzy checkpointing to write dirty buffer pool pages to disk, advancing the checkpoint LSN and reducing crash recovery time. Background I/O threads flush pages at a rate controlled by `innodb_io_capacity` and `innodb_max_dirty_pages_pct`. Adaptive flushing accelerates writes when the redo log fills up. On SSDs, disable neighbor flushing and increase `innodb_io_capacity` to match the device's throughput.
