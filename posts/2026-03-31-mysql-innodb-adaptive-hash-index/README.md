# What Is the InnoDB Adaptive Hash Index in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Adaptive Hash Index, Performance, Buffer Pool

Description: The InnoDB Adaptive Hash Index automatically builds in-memory hash indexes for frequently accessed index values to speed up repeated equal-value lookups in MySQL.

---

## Overview

The InnoDB Adaptive Hash Index (AHI) is an automatic optimization where InnoDB builds hash indexes in memory for B-tree index pages that are accessed frequently with the same search pattern. Unlike a regular B-tree index traversal which requires multiple page reads from root to leaf, a hash index provides O(1) lookup directly to the target page - making repeated identical lookups significantly faster.

The key word is "adaptive" - InnoDB monitors index access patterns and automatically decides which index pages benefit from a hash index, builds the hash entries without administrator intervention, and discards them when pages are evicted from the buffer pool.

## How the AHI Works

When InnoDB detects that a particular B-tree index page is being searched repeatedly with the same key value or prefix pattern, it builds a hash index for that page in the buffer pool. The hash index maps key values directly to the buffer pool page and row slot.

```text
Normal B-tree lookup:
  Root page --> Internal page --> Leaf page --> Row

AHI lookup (when cached):
  Hash key --> Row (direct, single step)
```

The AHI is built and maintained entirely in memory - it is not persisted to disk and is rebuilt from scratch after a restart.

## Checking AHI Status

```sql
-- Check if AHI is enabled
SHOW VARIABLES LIKE 'innodb_adaptive_hash_index';

-- Check AHI statistics
SHOW ENGINE INNODB STATUS\G
-- Look for "INSERT BUFFER AND ADAPTIVE HASH INDEX" section
-- It shows: "hash searches/s" vs "non-hash searches/s"
-- High hash searches/s = AHI is being used effectively
```

```sql
-- More detailed AHI metrics from INFORMATION_SCHEMA
SELECT
  NAME,
  COUNT
FROM INFORMATION_SCHEMA.INNODB_METRICS
WHERE NAME IN (
  'adaptive_hash_searches',
  'adaptive_hash_searches_btree'
);

-- Calculate AHI hit rate
SELECT
  (SELECT COUNT
   FROM INFORMATION_SCHEMA.INNODB_METRICS
   WHERE NAME = 'adaptive_hash_searches') /
  (
    (SELECT COUNT
     FROM INFORMATION_SCHEMA.INNODB_METRICS
     WHERE NAME = 'adaptive_hash_searches') +
    (SELECT COUNT
     FROM INFORMATION_SCHEMA.INNODB_METRICS
     WHERE NAME = 'adaptive_hash_searches_btree')
  ) AS ahi_hit_rate;
```

## Configuration

```sql
-- Disable the AHI (can help if it causes contention)
SET GLOBAL innodb_adaptive_hash_index = OFF;

-- Re-enable it
SET GLOBAL innodb_adaptive_hash_index = ON;

-- Number of AHI partitions (MySQL 5.7+)
-- More partitions reduce mutex contention on high-concurrency workloads
SHOW VARIABLES LIKE 'innodb_adaptive_hash_index_parts';
-- Default is 8; range is 1-512
-- This variable is NOT dynamic - it requires a server restart to change
-- Set it in my.cnf: innodb_adaptive_hash_index_parts = 16
```

## When the AHI Helps and When It Hurts

The AHI provides the most benefit for:
- Workloads with many repeated lookups using the same key values (point queries)
- Hot rows or small hot datasets accessed constantly
- OLTP workloads with high-concurrency equality lookups

The AHI can actually hurt performance in:
- Workloads with highly diverse key values (few repeated patterns)
- Range scan-heavy workloads (hash indexes do not help ranges)
- High-concurrency environments where AHI latch contention becomes a bottleneck

```sql
-- If you see high mutex contention on "btr0sea" in SHOW ENGINE INNODB STATUS
-- the AHI may be causing contention - consider disabling it
SHOW ENGINE INNODB STATUS\G
-- Look for: "RW-latch at ... btr0sea.cc" with high waits
```

## Workload Example

```sql
-- This query pattern benefits from AHI (repeated equality lookup on same key)
SELECT * FROM user_sessions WHERE session_token = 'abc123xyz';
-- If this runs thousands of times per second with different tokens,
-- InnoDB will build AHI entries for the session_token index pages
```

## Summary

The InnoDB Adaptive Hash Index is an automatic in-memory optimization that builds hash indexes for frequently accessed B-tree index pages, converting O(log n) B-tree lookups into O(1) hash lookups for hot key values. It is self-managing - InnoDB builds, maintains, and discards AHI entries automatically based on access patterns. For high-concurrency OLTP workloads with repeated point queries, the AHI can significantly reduce CPU cycles per query. If AHI latch contention appears in SHOW ENGINE INNODB STATUS, increasing `innodb_adaptive_hash_index_parts` or disabling AHI can resolve it.
