# How to Tune sort_buffer_size for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Tuning, Memory, Sorting

Description: Tune MySQL sort_buffer_size to speed up ORDER BY and GROUP BY queries that cannot use an index, balancing per-session memory allocation against connection count.

---

MySQL allocates a sort buffer per connection when executing ORDER BY or GROUP BY operations that cannot be satisfied by an index. The `sort_buffer_size` variable controls how much memory each sort operation can use before spilling to disk with a filesort.

## Understanding When sort_buffer_size Matters

MySQL uses the sort buffer when a query requires sorting that cannot be resolved via an index. You can identify this in EXPLAIN output:

```sql
EXPLAIN SELECT customer_id, total_amount
FROM orders
ORDER BY created_at DESC
LIMIT 100;
```

If the `Extra` column shows `Using filesort`, the sort buffer is being used. This is not necessarily bad - it only becomes a performance issue when the data being sorted exceeds the sort buffer size and spills to disk.

## Checking Current Sort Buffer Usage

```sql
SHOW VARIABLES LIKE 'sort_buffer_size';
SHOW GLOBAL STATUS LIKE 'Sort%';
```

```text
Sort_merge_passes   847
Sort_range          12034
Sort_rows           5891023
Sort_scan           3421
```

A high `Sort_merge_passes` value indicates the sort buffer is too small. Each merge pass reads data from disk, which slows query execution significantly.

## Recommended sort_buffer_size Values

The default is 256 KB. For most workloads, 1-4 MB is a reasonable starting point:

```text
[mysqld]
sort_buffer_size = 1M
```

Set it dynamically for testing:

```sql
SET GLOBAL sort_buffer_size = 1048576;  -- 1MB

-- Or per-session for a specific workload
SET SESSION sort_buffer_size = 4194304;  -- 4MB
```

## Memory Impact at Scale

Since this is a per-connection buffer, calculate total potential memory usage:

```sql
SELECT
  @@max_connections AS max_connections,
  @@sort_buffer_size / 1024 / 1024 AS sort_buffer_mb,
  (@@max_connections * @@sort_buffer_size) / 1024 / 1024 / 1024 AS worst_case_gb;
```

With 300 connections and 4 MB sort buffer, worst case is 1.2 GB. Not all connections will sort simultaneously, so real usage is typically much lower, but this informs whether to keep the value conservative.

## Identifying Queries that Benefit from Larger Buffers

Use Performance Schema to find queries with high sort activity:

```sql
SELECT
  DIGEST_TEXT,
  COUNT_STAR,
  SUM_SORT_MERGE_PASSES,
  SUM_SORT_ROWS,
  ROUND(AVG_TIMER_WAIT / 1000000000000, 3) AS avg_latency_sec
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_SORT_MERGE_PASSES > 0
ORDER BY SUM_SORT_MERGE_PASSES DESC
LIMIT 10;
```

## Better Long-Term Fix: Add Indexes

For frequently executed queries, adding an index on the ORDER BY column is more effective than a larger sort buffer:

```sql
-- Instead of relying on sort buffer for this query:
SELECT id, name FROM products ORDER BY price DESC;

-- Add an index
ALTER TABLE products ADD INDEX idx_price (price);

-- Verify EXPLAIN no longer shows filesort
EXPLAIN SELECT id, name FROM products ORDER BY price DESC LIMIT 100;
```

## Summary

The `sort_buffer_size` controls per-session memory for ORDER BY and GROUP BY operations that cannot use an index. Watch `Sort_merge_passes` in SHOW GLOBAL STATUS - a high value indicates disk spills and suggests increasing the buffer. Set it to 1-4 MB for general workloads, but avoid setting it too high with many connections as total memory usage multiplies by the connection count. The best long-term solution for high-sort-cost queries is adding appropriate indexes rather than relying on larger sort buffers.
