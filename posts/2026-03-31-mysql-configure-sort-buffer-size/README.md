# How to Configure sort_buffer_size in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Sorting, Buffer, Performance

Description: Learn how to configure MySQL sort_buffer_size to improve ORDER BY and GROUP BY query performance while avoiding memory over-allocation.

---

## What Is sort_buffer_size

`sort_buffer_size` is the amount of memory allocated **per connection** for sorting operations. When MySQL executes `ORDER BY` or `GROUP BY` and cannot use an index, it performs an in-memory sort. If the data to be sorted exceeds `sort_buffer_size`, MySQL performs a multi-pass merge sort using temporary files on disk.

## Check the Current Value

```sql
SHOW VARIABLES LIKE 'sort_buffer_size';
```

```text
+------------------+--------+
| Variable_name    | Value  |
+------------------+--------+
| sort_buffer_size | 262144 |
+------------------+--------+
```

Default is 256 KB on most platforms.

## Check How Often Sorts Spill to Disk

```sql
SHOW GLOBAL STATUS LIKE 'Sort%';
```

```text
+-------------------+--------+
| Variable_name     | Value  |
+-------------------+--------+
| Sort_merge_passes | 12543  |
| Sort_range        | 890    |
| Sort_rows         | 4521098|
| Sort_scan         | 23451  |
+-------------------+--------+
```

`Sort_merge_passes` counts multi-pass sorts that used disk. High values indicate `sort_buffer_size` is too small for the queries being run.

## Increase sort_buffer_size

```sql
-- Set globally for all new sessions
SET GLOBAL sort_buffer_size = 2097152;  -- 2 MB
```

In `my.cnf`:

```ini
[mysqld]
sort_buffer_size = 2M
```

## Important: sort_buffer_size Is Per-Session

This buffer is allocated **per connection** on demand. If you have 500 connections and set `sort_buffer_size = 16M`, that is potentially 8 GB of RAM when all connections are sorting simultaneously.

Calculate conservatively:

```text
max safe value = (available RAM for sort buffers) / max_connections
Example: 2 GB / 200 connections = 10 MB per connection
```

## Set sort_buffer_size Per Session for Heavy Queries

For reporting queries that sort large datasets, set a larger value just for that session:

```sql
SET SESSION sort_buffer_size = 67108864;  -- 64 MB for this session only
SELECT customer_id, SUM(amount)
FROM orders
GROUP BY customer_id
ORDER BY SUM(amount) DESC;
```

## Identify Queries with Sort Problems

```sql
-- Queries with the most sort merge passes
SELECT
  DIGEST_TEXT,
  SUM_SORT_MERGE_PASSES AS merge_passes,
  SUM_SORT_ROWS AS sort_rows,
  SUM_NO_GOOD_INDEX_USED AS bad_index
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_SORT_MERGE_PASSES > 0
ORDER BY merge_passes DESC
LIMIT 10;
```

## Fix Sorts at the Query Level First

Adding an index is usually better than increasing the buffer:

```sql
-- This query causes a filesort
SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;

-- Add an index to avoid the sort entirely
ALTER TABLE orders ADD INDEX idx_created_at (created_at);

-- Verify with EXPLAIN FORMAT=JSON
EXPLAIN FORMAT=JSON SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;
```

Look for `"using_filesort": false` in EXPLAIN JSON output after adding the index.

## Summary

`sort_buffer_size` controls per-connection memory for sort operations. Monitor `Sort_merge_passes` to detect if the current value is too small. Increase it globally for workloads with many sort-heavy queries, but stay conservative relative to `max_connections`. For ad-hoc reporting queries, increase `sort_buffer_size` at the session level. Where possible, add indexes to eliminate sorts entirely.
