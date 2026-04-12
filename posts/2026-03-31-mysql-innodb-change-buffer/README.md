# What Is the InnoDB Change Buffer in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Change Buffer, Secondary Index, Performance

Description: The InnoDB change buffer caches changes to non-unique secondary index pages when those pages are not in the buffer pool, deferring disk reads to improve write performance.

---

## Overview

The InnoDB change buffer is an optimization for non-unique secondary index updates. When an `INSERT`, `UPDATE`, or `DELETE` modifies a non-unique secondary index page that is not currently loaded in the buffer pool, InnoDB does not immediately read that page from disk to apply the change. Instead, it records the change in the change buffer and defers the actual merge to the index page until the page is naturally read into the buffer pool later. The change buffer does not apply to unique secondary indexes because a uniqueness check requires reading the page from disk, which eliminates the benefit of deferral.

This optimization reduces the I/O cost of maintaining secondary indexes during write-heavy workloads, because it avoids the random disk reads that would otherwise be needed to update each secondary index page immediately.

## Why Secondary Index Updates Are Expensive

Secondary indexes are stored in B-tree structures separate from the clustered index. When you insert a row, every secondary index on the table needs an update in a potentially different location on disk. For a table with five secondary indexes, one INSERT could require reading and writing five separate disk locations. The change buffer defers those reads by batching the changes.

```sql
-- A table with multiple secondary indexes benefits from the change buffer
CREATE TABLE user_events (
  event_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  session_id VARCHAR(64),
  created_at DATETIME NOT NULL,
  PRIMARY KEY (event_id),
  INDEX idx_user (user_id),           -- secondary index
  INDEX idx_type (event_type),        -- secondary index
  INDEX idx_session (session_id),     -- secondary index
  INDEX idx_created (created_at)      -- secondary index
) ENGINE=InnoDB;
```

For each INSERT into this table, up to four secondary index pages may be deferred via the change buffer instead of requiring immediate disk reads.

## Checking Change Buffer Status

```sql
-- View change buffer statistics
SHOW ENGINE INNODB STATUS\G
-- Look for "INSERT BUFFER AND ADAPTIVE HASH INDEX" section

-- Key metrics:
-- "ibuf: size X, free list len Y, seg size Z" - current buffer size
-- "merged operations: insert X, delete mark Y, delete Z" - merges done
-- "discarded operations: ..." - changes discarded after page purge
```

```sql
-- Monitor change buffer size from information_schema
SELECT PAGE_TYPE, COUNT(*) AS page_count
FROM information_schema.INNODB_BUFFER_PAGE
WHERE PAGE_TYPE = 'IBUF_INDEX'
GROUP BY PAGE_TYPE;
```

## Configuration

```sql
-- Check current change buffer settings
SHOW VARIABLES LIKE 'innodb_change_buffering';
SHOW VARIABLES LIKE 'innodb_change_buffer_max_size';
```

The `innodb_change_buffering` setting controls which operations are buffered:

```text
all      - buffer inserts, delete marks, and purges (default)
inserts  - buffer insert operations only
deletes  - buffer delete-mark operations only
changes  - buffer inserts and delete-mark operations
purges   - buffer background purge operations only
none     - disable change buffering entirely
```

```sql
-- Reduce change buffer size if the workload is mostly reads
-- Default is 25% of the buffer pool
SET GLOBAL innodb_change_buffer_max_size = 10; -- 10% of buffer pool
```

## When the Change Buffer Is Merged

Changes stored in the change buffer are merged into the actual secondary index pages when:
- A page is read into the buffer pool (triggering a merge of pending changes for that page)
- A background thread periodically merges buffered changes when the server is mostly idle
- During a slow shutdown or before MySQL flushes dirty pages

```sql
-- Force immediate merge of all change buffer entries
-- (useful before taking a consistent backup)
SET GLOBAL innodb_fast_shutdown = 0;
-- Then perform a slow shutdown: mysqladmin shutdown
```

## When to Disable Change Buffering

Change buffering is most beneficial for write-heavy workloads with secondary indexes. It provides little benefit for read-heavy workloads and can actually slow them down slightly because merge operations happen during reads. If your dataset fits entirely in the buffer pool, disable it.

```sql
SET GLOBAL innodb_change_buffering = 'none';
```

## Summary

The InnoDB change buffer improves write performance by deferring secondary index updates for pages not currently in the buffer pool. Instead of doing expensive random disk reads to update secondary index pages immediately, InnoDB records the changes and merges them when the pages are naturally accessed later. The change buffer is most valuable for write-heavy workloads with many secondary indexes. It can be tuned with `innodb_change_buffering` and `innodb_change_buffer_max_size` based on workload characteristics.
