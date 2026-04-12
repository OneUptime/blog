# How to Understand the key Column in EXPLAIN Output in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, EXPLAIN, Index, Query, Optimization

Description: Learn what the key, possible_keys, and key_len columns in MySQL EXPLAIN output mean and how to use them to diagnose index selection and query performance issues.

---

## The key Column

The `key` column in `EXPLAIN` shows the index MySQL actually chose for the access step. A value of `NULL` means no index was used and a full table scan was performed.

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 42 AND status = 'pending'\G
```

```text
possible_keys: idx_customer_id, idx_status
key: idx_customer_id
key_len: 4
```

## possible_keys

`possible_keys` lists every index MySQL considered as a candidate. If it is `NULL`, no index exists on the columns referenced in the WHERE clause or JOIN ON condition.

```sql
-- Add a missing index if possible_keys is NULL
ALTER TABLE orders ADD INDEX idx_customer_id (customer_id), ALGORITHM=INPLACE, LOCK=NONE;
```

## Why key Might Differ from possible_keys

MySQL's optimizer estimates the cost of using each candidate index. It may choose a different index than you expect, or choose none at all, if:
- The index cardinality is too low (column has few distinct values)
- The query would return a large fraction of the table rows
- Statistics are stale

```sql
-- Force the optimizer to recalculate statistics
ANALYZE TABLE orders;
```

## The key_len Column

`key_len` shows how many bytes of the index key are used. For composite indexes, it reveals how many columns from the index are being applied.

```sql
CREATE INDEX idx_customer_status ON orders(customer_id, status);
-- customer_id: INT = 4 bytes
-- status: VARCHAR(20) utf8mb4 = 20*4 + 2 = 82 bytes

EXPLAIN SELECT * FROM orders WHERE customer_id = 42\G
-- key_len: 4  (only customer_id used)

EXPLAIN SELECT * FROM orders WHERE customer_id = 42 AND status = 'pending'\G
-- key_len: 86 (customer_id + status used)
```

A `key_len` shorter than the full index width tells you only the leading columns of a composite index are being used. This often indicates a range column is stopping further column use.

## Diagnosing a Wrong Index Choice

```sql
EXPLAIN SELECT id FROM orders WHERE customer_id = 42 ORDER BY created_at DESC\G
```

If `key` shows `idx_created_at` instead of `idx_customer_id`, MySQL preferred the sort index over the filter index. Force the correct index for testing:

```sql
EXPLAIN SELECT id FROM orders
FORCE INDEX (idx_customer_id)
WHERE customer_id = 42
ORDER BY created_at DESC\G
```

If the forced plan is better, consider a composite index that covers both:

```sql
ALTER TABLE orders ADD INDEX idx_customer_created (customer_id, created_at DESC);
```

## NULL key with Non-NULL possible_keys

If `key` is NULL but `possible_keys` is not, the optimizer chose a full scan because it estimated fewer rows would be examined that way. This often happens when the query would return more than 20-30% of the table.

```sql
-- Low selectivity: optimizer skips the index
EXPLAIN SELECT * FROM orders WHERE status = 'active'\G
-- possible_keys: idx_status, key: NULL, type: ALL
```

Solution: use a covering index or a more selective composite index.

## Summary

The `key` column in EXPLAIN shows the index MySQL selected. A NULL key means no index was used. Use `possible_keys` to see what was available, `key_len` to verify how many composite index columns are applied, and `FORCE INDEX` to diagnose wrong optimizer choices. Refresh statistics with `ANALYZE TABLE` when index selection seems unexpectedly poor.
