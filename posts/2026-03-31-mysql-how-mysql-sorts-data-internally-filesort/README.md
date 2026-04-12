# How MySQL Sorts Data Internally (Filesort)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Filesort, ORDER BY, Performance, Query Optimization

Description: Learn how MySQL's filesort algorithm works internally, when it is used, and how to avoid it with proper indexes and sort buffer tuning.

---

## What Is Filesort

When MySQL cannot satisfy an `ORDER BY` or `GROUP BY` clause using an index, it performs a **filesort** - an in-memory or on-disk sort operation. Despite the name, filesort does not always use a file; it uses memory (the sort buffer) first, falling back to temporary disk files only when the data exceeds the buffer size.

## Detecting Filesort with EXPLAIN

```sql
EXPLAIN SELECT id, name, created_at
FROM users
ORDER BY created_at DESC;
```

Look for `Using filesort` in the `Extra` column:

```text
+------+-------------+-------+------+------+------------------+
| type | table       | rows  | key  | ...  | Extra            |
+------+-------------+-------+------+------+------------------+
| ALL  | users       | 50000 | NULL | ...  | Using filesort   |
+------+-------------+-------+------+------+------------------+
```

## How Filesort Works Internally

MySQL uses one of two sort algorithms:

### Two-Pass Sort (Read-Twice)

1. Read the rows satisfying the WHERE clause, extract the sort key and row ID.
2. Sort the (sort_key, row_id) pairs.
3. Read the actual rows again in sort order using the row IDs.

This was the original algorithm. It reads rows twice but uses less memory.

### Single-Pass Sort (Read-Once)

1. Read the rows satisfying WHERE, extract the sort key AND all required columns.
2. Sort the full row data in memory.
3. Return rows in sorted order directly - no second read.

This is the default when row size fits within `max_length_for_sort_data`. It is faster because it reads rows only once.

MySQL chooses between the two based on the length of the selected columns vs `max_length_for_sort_data`:

```sql
SHOW VARIABLES LIKE 'max_length_for_sort_data';
-- Default: 4096 bytes (deprecated in MySQL 8.0.20)
```

If the row length exceeds this, MySQL uses the two-pass algorithm. Note that in MySQL 8.0.20 and later, this variable is deprecated and the optimizer makes the algorithm choice automatically.

## Sort Buffer Size

The sort buffer is per-session and allocated only when a sort is needed:

```sql
SHOW VARIABLES LIKE 'sort_buffer_size';
-- Default: 262144 (256KB)
```

Increase for sessions that run large sorts:

```sql
SET SESSION sort_buffer_size = 8388608;  -- 8MB
```

If sorted data exceeds the sort buffer, MySQL creates temporary merge files on disk (merge sort). Watch for this with:

```sql
SHOW STATUS LIKE 'Sort_merge_passes';
-- If > 0, filesort is spilling to disk
```

## Eliminating Filesort with Indexes

The best optimization is to eliminate filesort entirely by creating an index that covers the ORDER BY columns.

### Simple ORDER BY

```sql
-- Before: filesort
SELECT id, name FROM users ORDER BY created_at DESC;

-- Add index to eliminate filesort
ALTER TABLE users ADD INDEX idx_created_at (created_at);

EXPLAIN SELECT id, name FROM users ORDER BY created_at DESC;
-- Extra: Backward index scan (Using filesort is eliminated)
```

### WHERE + ORDER BY Composite Index

```sql
SELECT id, name FROM users
WHERE status = 'active'
ORDER BY created_at DESC;

-- Index must cover both the WHERE column and the ORDER BY column
ALTER TABLE users ADD INDEX idx_status_created (status, created_at);
```

### ORDER BY Mixed Directions - Descending Index

```sql
-- MySQL 8 supports descending indexes:
ALTER TABLE orders ADD INDEX idx_cust_date (customer_id ASC, order_date DESC);
```

## Covering Index to Avoid Table Access

```sql
ALTER TABLE users ADD INDEX idx_status_created_covering (status, created_at, id, name);

EXPLAIN SELECT id, name FROM users WHERE status = 'active' ORDER BY created_at DESC;
-- Extra: Using index
```

## Monitoring Sort Operations

```sql
SHOW STATUS LIKE 'Sort%';
```

Key metrics:
- `Sort_rows` - total rows sorted.
- `Sort_range` - sorts done using index ranges.
- `Sort_scan` - sorts done after full table scans.
- `Sort_merge_passes` - sort buffer overflows requiring disk merge.

## Summary

MySQL's filesort algorithm sorts rows in memory (sort buffer) or falls back to disk merge when the data is too large. The single-pass algorithm is preferred for performance. Eliminate filesort entirely by adding indexes on ORDER BY columns, use composite indexes to cover both WHERE and ORDER BY predicates, and increase `sort_buffer_size` for sessions running large analytical sorts. Always verify with `EXPLAIN` and monitor `Sort_merge_passes` to detect disk spill.
