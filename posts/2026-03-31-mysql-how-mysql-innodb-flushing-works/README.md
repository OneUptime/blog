# How MySQL InnoDB Flushing Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Flushing, Buffer Pool, Performance, Internal

Description: Learn how InnoDB flushes dirty pages from the buffer pool to disk, what controls flushing behavior, and how to tune it for your storage hardware.

---

## What Is InnoDB Flushing

When InnoDB modifies data, it writes changes to pages in the buffer pool first (in memory). These modified pages are called "dirty pages." Flushing is the process of writing dirty pages from the buffer pool to the actual data files on disk.

Flushing must balance two goals:
- Write dirty pages to disk frequently enough to limit data loss on crash.
- Not flush so aggressively that it saturates I/O and impacts query performance.

## Why Flushing Matters

1. **Crash recovery** - dirty pages in memory are lost on crash. More flushing means less redo log to replay on restart.
2. **Write amplification** - flushing too aggressively can saturate disk I/O, hurting performance.
3. **Redo log space** - dirty pages hold redo log space. If redo log fills, InnoDB stalls writes until pages are flushed.

## The Flush List

InnoDB maintains a "flush list" - an ordered list of dirty pages sorted by the LSN (Log Sequence Number) at which they were first dirtied. Flushing happens in LSN order to advance the checkpoint.

```sql
SHOW ENGINE INNODB STATUS\G
-- Look for "Modified db pages" in BUFFER POOL AND MEMORY section
```

## Types of Flushing

### 1 - Background Flushing (Normal)

Background threads continuously flush dirty pages to stay within the configured limits:

```sql
SHOW VARIABLES LIKE 'innodb_max_dirty_pages_pct';
-- Default: 90% (flush when dirty pages exceed 90% of buffer pool)

SHOW VARIABLES LIKE 'innodb_max_dirty_pages_pct_lwm';
-- Low watermark: proactively start flushing at this percentage (default: 10%)
```

### 2 - Adaptive Flushing

InnoDB uses an adaptive algorithm that flushes more aggressively as the redo log fills:

```sql
SHOW VARIABLES LIKE 'innodb_adaptive_flushing';
-- ON by default

SHOW VARIABLES LIKE 'innodb_adaptive_flushing_lwm';
-- Redo log % at which adaptive flushing kicks in (default: 10)
```

The adaptive flusher considers both:
- Current dirty page percentage vs `innodb_max_dirty_pages_pct`.
- Current redo log utilization vs `innodb_log_file_size`.

### 3 - Forced Flushing (Emergency)

If dirty pages or redo log fill up faster than background flushing can handle, InnoDB stalls user transactions until flushing catches up. This appears as InnoDB "checkpointing" in slow query logs.

## Tuning I/O Capacity

The key control for flushing rate is `innodb_io_capacity`:

```sql
SHOW VARIABLES LIKE 'innodb_io_capacity';
-- Default: 200 (IOPS)

SHOW VARIABLES LIKE 'innodb_io_capacity_max';
-- Default: 2000 (IOPS during aggressive flushing)
```

Set these to reflect your storage hardware's actual IOPS capacity:

```text
[mysqld]
# For SSD storage
innodb_io_capacity = 2000
innodb_io_capacity_max = 4000

# For NVMe storage
innodb_io_capacity = 10000
innodb_io_capacity_max = 20000

# For HDD storage
innodb_io_capacity = 200
innodb_io_capacity_max = 400
```

Undersetting `innodb_io_capacity` causes dirty pages to accumulate and triggers forced flushing stalls.

## Checking Current Dirty Page Percentage

```sql
SELECT
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_dirty') AS dirty_pages,
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_total') AS total_pages,
  ROUND(
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_dirty') /
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_total') * 100,
    2
  ) AS dirty_pct;
```

## Flushing Behavior with SSDs vs HDDs

HDDs prefer sequential writes and have high random write latency. SSDs handle random writes well.

For SSD-based storage, enable:

```text
[mysqld]
innodb_flush_neighbors = 0  -- Disable neighbor flushing (unnecessary on SSD)
```

`innodb_flush_neighbors = 1` flushes adjacent dirty pages together to reduce head seeks. In MySQL 5.7 this was the default, but in MySQL 8.0 the default was changed to 0 since SSD storage is now common. On HDDs, setting it to 1 can still improve throughput.

## Redo Log and Flushing Relationship

```sql
SHOW ENGINE INNODB STATUS\G
-- Log sequence number: latest LSN
-- Log flushed up to: redo log flushed to disk
-- Pages flushed up to: checkpoint LSN
-- Last checkpoint at: checkpoint advancing as pages are flushed
```

The gap between "Log sequence number" and "Last checkpoint at" shows how much redo log data would need to be replayed on crash. A large gap means more recovery time.

## Summary

InnoDB flushing writes dirty buffer pool pages to disk using adaptive background threads controlled by `innodb_io_capacity`. Set I/O capacity to match your storage hardware, use `innodb_max_dirty_pages_pct` to bound dirty page accumulation, disable neighbor flushing on SSDs, and monitor the redo log checkpoint gap to ensure flushing keeps pace with writes. Undersizing I/O capacity leads to forced stalls that directly impact query latency.
