# How MySQL InnoDB Buffer Pool Works Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Buffer Pool, Performance, Internal

Description: Understand how the InnoDB buffer pool caches data and index pages, manages the LRU list, and controls dirty page flushing for optimal performance.

---

## What Is the InnoDB Buffer Pool

The InnoDB buffer pool is the main in-memory cache for InnoDB. It stores data pages, index pages, undo logs, and the data dictionary. Any data read from disk is placed into the buffer pool, and any modification is written there first (as a "dirty page") before being flushed to disk.

Buffer pool efficiency directly determines MySQL's read and write performance. A well-sized buffer pool means fewer disk I/O operations.

## Buffer Pool Architecture

The buffer pool is divided into fixed-size pages (default 16KB). These pages are organized into:

1. **The LRU List** - determines which pages stay in memory and which get evicted.
2. **The Free List** - a list of available pages not yet used.
3. **The Flush List** - pages that have been modified (dirty) and need to be written to disk.

## The Modified LRU Algorithm

InnoDB uses a variation of the LRU (Least Recently Used) algorithm. The list is divided into two sublists:

```text
[--- New (Young) Sublist (5/8 of buffer pool) ---][--- Old Sublist (3/8) ---]
Head (Most Recently Used)                          Tail (Least Recently Used)
```

When a new page is read from disk, it is inserted at the **midpoint** (the boundary between new and old sublists), not at the head. This protects frequently accessed "hot" pages from being evicted by large sequential scans.

A page moves from the old sublist to the new sublist only after it has been accessed again while sitting in the old sublist for at least `innodb_old_blocks_time` milliseconds (default 1000ms).

## Checking Buffer Pool Status

```sql
SHOW ENGINE INNODB STATUS\G
-- Look for "BUFFER POOL AND MEMORY" section
```

Or query Performance Schema:

```sql
SELECT
  POOL_ID,
  POOL_SIZE,
  FREE_BUFFERS,
  DATABASE_PAGES,
  OLD_DATABASE_PAGES,
  MODIFIED_DATABASE_PAGES,
  PAGES_MADE_YOUNG,
  PAGES_NOT_MADE_YOUNG,
  HIT_RATE
FROM information_schema.INNODB_BUFFER_POOL_STATS;
```

A good `HIT_RATE` should be close to 1000 (per 1000 requests).

## Sizing the Buffer Pool

The buffer pool should typically be 70-80% of available RAM for a dedicated MySQL server.

```sql
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
-- Set it:
SET GLOBAL innodb_buffer_pool_size = 8589934592;  -- 8GB
```

In `my.cnf`:

```text
[mysqld]
innodb_buffer_pool_size = 8G
```

## Multiple Buffer Pool Instances

For servers with large buffer pools (> 1GB), split into multiple instances to reduce mutex contention:

```sql
SHOW VARIABLES LIKE 'innodb_buffer_pool_instances';
```

```text
[mysqld]
innodb_buffer_pool_size = 16G
innodb_buffer_pool_instances = 8
```

Each instance manages its own LRU list and free list independently.

## Buffer Pool Warm-Up

On restart, the buffer pool is empty. InnoDB can automatically save and restore the buffer pool state:

```sql
SHOW VARIABLES LIKE 'innodb_buffer_pool_dump_at_shutdown';
SHOW VARIABLES LIKE 'innodb_buffer_pool_load_at_startup';
```

```text
[mysqld]
innodb_buffer_pool_dump_at_shutdown = ON
innodb_buffer_pool_load_at_startup = ON
innodb_buffer_pool_dump_pct = 25   # Save the hottest 25% of pages
```

Manually trigger a dump or load:

```sql
SET GLOBAL innodb_buffer_pool_dump_now = ON;
SET GLOBAL innodb_buffer_pool_load_now = ON;
```

## Monitoring Hit Rate

```sql
SHOW STATUS LIKE 'Innodb_buffer_pool_reads';
SHOW STATUS LIKE 'Innodb_buffer_pool_read_requests';

-- Calculate hit rate
SELECT
  (1 - (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads') /
       (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests')
  ) * 100 AS buffer_pool_hit_rate_pct;
```

A hit rate below 95% indicates the buffer pool may be undersized.

## Dirty Pages and Flushing

Dirty pages accumulate when writes happen faster than flushing. InnoDB flushes using background threads controlled by:

```sql
SHOW VARIABLES LIKE 'innodb_io_capacity';          -- I/O operations per second
SHOW VARIABLES LIKE 'innodb_io_capacity_max';      -- Max I/O during aggressive flushing
SHOW VARIABLES LIKE 'innodb_max_dirty_pages_pct';  -- Max % of dirty pages (default 90%)
```

If `Innodb_buffer_pool_pages_dirty` is consistently high, increase `innodb_io_capacity` to match your storage's IOPS capacity.

## Summary

The InnoDB buffer pool is the heart of MySQL performance - it caches data and index pages in a modified LRU structure that protects hot pages from full scan evictions. Size it at 70-80% of RAM, split into multiple instances for large configurations, enable dump/load for fast warm-up after restarts, and monitor hit rate to determine if more memory is needed.
