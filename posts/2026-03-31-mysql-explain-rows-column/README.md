# How to Understand the rows Column in EXPLAIN Output in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, EXPLAIN, Query, Index, Optimization

Description: Learn what the rows and filtered columns in MySQL EXPLAIN output represent, how to interpret row estimates, and how to reduce them through better indexing.

---

## What Is the rows Column?

The `rows` column in `EXPLAIN` output is MySQL's estimate of how many rows it expects to examine at each step of the query plan. It is not the number of rows returned - it is the number of rows MySQL must read to find the ones that satisfy the query conditions.

A large `rows` value does not always mean a slow query - it depends on what fraction of rows are actually returned. But a large `rows` with a low `filtered` value often indicates a missing or ineffective index.

## Reading a Simple Query

```sql
EXPLAIN SELECT id, total FROM orders WHERE customer_id = 42\G
```

```text
type: ref
key: idx_customer_id
rows: 87
filtered: 100.00
```

MySQL estimates it will examine 87 rows by scanning the `idx_customer_id` index range for `customer_id = 42`, and 100% of those are expected to pass the WHERE filter.

## The filtered Column

`filtered` is the estimated percentage of examined rows that survive the WHERE clause after the index lookup. Multiply `rows * filtered / 100` to estimate the output row count fed to the next step.

```sql
EXPLAIN SELECT * FROM orders
WHERE customer_id = 42 AND status = 'pending'\G
```

```text
type: ref
key: idx_customer_id
rows: 87
filtered: 14.29
```

Estimated output = 87 * 0.1429 = ~12 rows. The low `filtered` value means MySQL reads 87 rows from the index but only 12 pass the additional `status = 'pending'` filter. Adding `status` to the index would reduce `rows`.

## Comparing Before and After Adding an Index

Before:

```sql
EXPLAIN SELECT id FROM orders WHERE created_at > '2025-06-01'\G
```

```text
type: ALL
key: NULL
rows: 500000
filtered: 33.33
```

After adding `idx_created_at`:

```sql
ALTER TABLE orders ADD INDEX idx_created_at (created_at);

EXPLAIN SELECT id FROM orders WHERE created_at > '2025-06-01'\G
```

```text
type: range
key: idx_created_at
rows: 165000
filtered: 100.00
```

`rows` dropped from 500,000 to 165,000 and `type` improved from ALL to range.

## rows in Multi-Table Queries

For joins, MySQL multiplies `rows` estimates across steps to estimate total work:

```sql
EXPLAIN SELECT o.id, c.name
FROM orders o JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'\G
```

```text
id  table     type  key              rows  filtered
1   orders    ref   idx_status       5000  100.00
1   customers eq_ref PRIMARY        1     100.00
```

Estimated rows processed: 5,000 * 1 = 5,000. The join is efficient because customers uses `eq_ref`.

## When rows Estimates Are Inaccurate

InnoDB row estimates are based on index statistics. Large discrepancies often indicate stale statistics:

```sql
ANALYZE TABLE orders;  -- refresh cardinality estimates
EXPLAIN SELECT ...;    -- re-check
```

For deeper analysis, use `EXPLAIN ANALYZE` (MySQL 8.0+) to see actual row counts alongside estimates:

```sql
EXPLAIN ANALYZE SELECT id FROM orders WHERE customer_id = 42\G
```

```text
-> Index lookup on orders using idx_customer_id (customer_id=42)
   (cost=8.70 rows=87) (actual time=0.156..0.312 rows=83 loops=1)
```

## Summary

The `rows` column estimates how many rows MySQL examines at each plan step, while `filtered` shows what percentage survive the WHERE clause. Aim to reduce `rows` through better indexes, especially composite indexes that cover all filter columns. Use `EXPLAIN ANALYZE` to compare estimated vs actual row counts and detect stale statistics.
