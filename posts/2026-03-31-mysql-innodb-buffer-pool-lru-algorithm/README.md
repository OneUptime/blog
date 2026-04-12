# How to Understand the InnoDB Buffer Pool LRU Algorithm in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Buffer Pool, LRU Algorithm

Description: Learn how InnoDB's midpoint insertion LRU algorithm manages buffer pool pages, prevents scan pollution, and how to tune it for read-heavy and mixed workloads.

---

## What Is the Buffer Pool?

The InnoDB buffer pool is the main memory cache for data and index pages. Before reading or writing a page, InnoDB checks the buffer pool. A cache hit avoids disk I/O; a miss triggers a page read and an eviction if the pool is full.

```sql
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
-- Recommended: 70-80% of available RAM

-- Buffer pool hit rate (should be > 99%)
SELECT variable_name, variable_value
FROM performance_schema.global_status
WHERE variable_name IN (
  'Innodb_buffer_pool_reads',        -- disk reads (misses)
  'Innodb_buffer_pool_read_requests' -- total read requests
);
-- Hit rate = 1 - (reads / read_requests)
```

## Standard LRU vs. InnoDB's Midpoint Insertion

A naive LRU evicts the least recently used page. The problem is that a full table scan or a large backup read will flood the LRU list with pages that are never revisited, evicting frequently-accessed "hot" pages.

InnoDB solves this with a **midpoint insertion strategy** - the LRU list is split into two sublists:

```text
Head of LRU (Young / Hot sublist) -- frequently accessed, ~5/8 of pool
                                   |
               Midpoint (3/8 from tail)
                                   |
Tail of LRU (Old / Cold sublist)   -- recently loaded but not yet "proven" hot
```

Every newly read page enters at the midpoint (head of the old sublist) instead of the head of the entire list.

## Promotion from Old to Young

A page in the old sublist is promoted to the young sublist only if it is accessed again after a delay controlled by:

```sql
SHOW VARIABLES LIKE 'innodb_old_blocks_time';
-- Default: 1000 ms (1 second)
```

If a page in the old list is accessed within 1 second of being inserted (as in a sequential scan), it is NOT promoted. This prevents scan pollution from evicting genuinely hot pages.

## Configuring the Old Sublist Size

```sql
SHOW VARIABLES LIKE 'innodb_old_blocks_pct';
-- Default: 37 (approximately 3/8 of the buffer pool)
```

```text
innodb_old_blocks_pct = 37    (default, good for most workloads)
innodb_old_blocks_pct = 50    (more protection against scan flooding)
innodb_old_blocks_pct = 20    (less cold sublist for very hot OLTP)
```

```sql
-- Dynamically adjustable
SET GLOBAL innodb_old_blocks_pct  = 50;
SET GLOBAL innodb_old_blocks_time = 2000;
```

## Buffer Pool Instances

To reduce mutex contention, the buffer pool is split into multiple independent instances, each with its own LRU list.

```sql
SHOW VARIABLES LIKE 'innodb_buffer_pool_instances';
-- Default: 8 (for buffer pools >= 1 GB)
-- Each instance manages pool_size / instances bytes
```

## Monitoring Buffer Pool Usage

```sql
SELECT pool_id,
       pages_made_young,
       pages_not_made_young,
       number_pages_read,
       number_pages_created,
       number_pages_written
FROM information_schema.innodb_buffer_pool_stats;

-- Or in aggregate
SHOW STATUS LIKE 'Innodb_buffer_pool%';
```

Key metrics:
```text
Innodb_buffer_pool_pages_total  - total pages in pool
Innodb_buffer_pool_pages_free   - free pages (want > 0)
Innodb_buffer_pool_pages_dirty  - dirty pages awaiting flush
Innodb_buffer_pool_read_ahead   - read-ahead pages loaded
Innodb_buffer_pool_read_ahead_evicted - read-ahead pages evicted before use
```

A high `read_ahead_evicted` count means read-ahead is loading pages that are never used - consider reducing `innodb_read_ahead_threshold`.

## Read-Ahead Integration

```sql
SHOW VARIABLES LIKE 'innodb_read_ahead_threshold';
-- Default: 56 (if 56 of 64 pages in an extent are accessed, pre-fetch the next extent)
SHOW VARIABLES LIKE 'innodb_random_read_ahead';
-- Default: OFF (random read-ahead is usually harmful)
```

## Summary

InnoDB's buffer pool uses a midpoint insertion LRU algorithm to prevent full scans from evicting hot pages. Newly loaded pages enter the old (cold) sublist at the midpoint. Only pages accessed again after `innodb_old_blocks_time` milliseconds are promoted to the young (hot) sublist. Tune `innodb_old_blocks_pct` and `innodb_old_blocks_time` when large scans or backups are degrading read performance for OLTP workloads.
