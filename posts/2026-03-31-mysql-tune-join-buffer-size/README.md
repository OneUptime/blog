# How to Tune join_buffer_size for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Tuning, Join, Memory

Description: Tune MySQL join_buffer_size to improve performance of full-table-scan joins, and learn when adding indexes is a better solution than increasing memory buffers.

---

MySQL uses the join buffer when performing joins that cannot use an index on the joined table. The `join_buffer_size` controls how much memory is allocated per join operation per connection. Understanding when this buffer is used - and when to fix the underlying problem with indexes - is key to effective MySQL tuning.

## When MySQL Uses the Join Buffer

The join buffer is used for Block Nested Loop (BNL) joins, which happen when the inner table in a join has no usable index on the join column. Check EXPLAIN for `Using join buffer`:

```sql
EXPLAIN SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending';
```

If the `Extra` column for the `customers` table shows `Using join buffer (Block Nested Loop)`, an index is missing or not being used. In MySQL 8.0, BNL was replaced with hash joins for some cases, shown as `Using join buffer (hash join)`.

## Checking Current Join Buffer Settings

```sql
SHOW VARIABLES LIKE 'join_buffer_size';
-- Default: 256KB

SHOW VARIABLES LIKE 'optimizer_switch';
-- Check if block_nested_loop is enabled
```

## Setting join_buffer_size

The default 256 KB is often sufficient. Increase it if you have unavoidable full-table scans in joins:

```sql
-- Set globally
SET GLOBAL join_buffer_size = 1048576;  -- 1MB

-- Set per session for a specific batch operation
SET SESSION join_buffer_size = 4194304;  -- 4MB
```

In configuration file:

```text
[mysqld]
join_buffer_size = 1M
```

## Calculating Memory Impact

Like `sort_buffer_size`, the join buffer is per-connection. Calculate worst-case consumption:

```sql
SELECT
  @@max_connections,
  @@join_buffer_size / 1024 AS join_buffer_kb,
  (@@max_connections * @@join_buffer_size) / 1024 / 1024 AS total_mb;
```

A query with multiple joined tables that all require join buffers multiplies this further - each non-indexed join in a query gets its own buffer allocation.

## The Better Fix: Add Indexes on Join Columns

For queries that repeatedly use the join buffer, adding a foreign key index eliminates the need for the join buffer entirely:

```sql
-- Check for missing indexes on join columns
EXPLAIN SELECT o.id, c.email
FROM orders o
JOIN customers c ON o.customer_id = c.id;

-- If customer_id in orders lacks an index:
ALTER TABLE orders ADD INDEX idx_customer_id (customer_id);

-- Re-check EXPLAIN - join buffer should be gone
EXPLAIN SELECT o.id, c.email
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

## Identifying Problematic Joins with Performance Schema

Find queries performing BNL joins:

```sql
SELECT
  DIGEST_TEXT,
  COUNT_STAR,
  SUM_NO_INDEX_USED,
  ROUND(AVG_TIMER_WAIT / 1000000000000, 3) AS avg_sec
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_NO_INDEX_USED > 0
ORDER BY SUM_NO_INDEX_USED DESC
LIMIT 10;
```

## Hash Join in MySQL 8.0

MySQL 8.0.18 introduced hash joins as a faster alternative to BNL. Hash joins are automatically chosen by the optimizer when applicable:

```sql
-- Verify hash join usage
EXPLAIN FORMAT=JSON
SELECT o.id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id\G
```

Look for `"using_join_buffer": "hash join"` in the JSON output to confirm a hash join is being used.

## Summary

The `join_buffer_size` helps when MySQL performs joins without usable indexes, but it is a workaround rather than a fix. Monitor EXPLAIN output for `Using join buffer` and prioritize adding indexes on join columns - this eliminates the buffer requirement entirely and provides much greater performance gains. Keep `join_buffer_size` at 256 KB to 1 MB for general workloads, and only increase it for specific batch or reporting jobs that operate on unindexed large tables.
