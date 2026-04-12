# How to Understand the type Column in EXPLAIN Output in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, EXPLAIN, Query, Index, Optimization

Description: Learn what every value of the type column in MySQL EXPLAIN output means, from the fastest const to the slowest ALL, and how to improve your query plan.

---

## What Is the type Column?

The `type` column in `EXPLAIN` output describes how MySQL accesses rows for each table in the query plan. It is the single most important indicator of query performance. Values range from extremely efficient single-row lookups to full table scans that read every row.

## The Complete List (Best to Worst)

### system

The table has exactly one row. Used for single-row system tables. Effectively a constant.

```sql
-- A derived table or subquery that materialises to exactly one row:
EXPLAIN SELECT * FROM (SELECT 1) AS t\G
-- type: system
```

### const

At most one matching row, accessed via a primary key or unique index equality filter. MySQL reads the row once and treats it as a constant for the rest of the query.

```sql
EXPLAIN SELECT * FROM orders WHERE id = 42\G
-- type: const
```

### eq_ref

One row from this table is read for each row combination from previous tables. Used when joining on a primary key or unique NOT NULL index. The most efficient join type.

```sql
EXPLAIN SELECT o.id, c.name
FROM orders o JOIN customers c ON o.customer_id = c.id\G
-- customers table: type: eq_ref (if c.id is PK of customers)
```

### ref

All rows matching a non-unique index value are read. More than one row may match.

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 42\G
-- type: ref (if customer_id has a regular index)
```

### fulltext

Uses a FULLTEXT index.

### ref_or_null

Like `ref`, but MySQL additionally searches for rows where the indexed column is NULL.

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 42 OR customer_id IS NULL\G
-- type: ref_or_null
```

### index_merge

Two or more indexes are used and results merged (union or intersection).

### unique_subquery

Replaces `eq_ref` for `IN` subqueries that look up a primary key or unique index. MySQL replaces the subquery with an index lookup function.

```sql
EXPLAIN SELECT * FROM orders
WHERE customer_id IN (SELECT id FROM customers WHERE active = 1)\G
-- type: unique_subquery (for the customers subquery)
```

### index_subquery

Like `unique_subquery`, but for non-unique indexes in `IN` subqueries.

```sql
EXPLAIN SELECT * FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE total > 100)\G
-- type: index_subquery (if customer_id has a non-unique index)
```

### range

MySQL uses an index to scan a range of rows. Triggered by `>`, `<`, `BETWEEN`, `IN`, `LIKE 'prefix%'`.

```sql
EXPLAIN SELECT * FROM orders WHERE created_at > '2025-01-01'\G
-- type: range
```

### index

Full index scan - reads every entry in the index (better than ALL if the index is a covering index).

```sql
EXPLAIN SELECT customer_id FROM orders\G
-- type: index (if customer_id is the only indexed column needed)
```

### ALL

Full table scan - reads every row regardless of indexes. The worst outcome for large tables.

```sql
EXPLAIN SELECT * FROM orders WHERE notes LIKE '%urgent%'\G
-- type: ALL (no index can satisfy a leading wildcard)
```

## Fixing type: ALL

| Situation | Fix |
|-----------|-----|
| No index on the filter column | Add an index |
| Function wrapped around column | Rewrite predicate or add functional index |
| Leading wildcard LIKE | Use FULLTEXT search |
| Low selectivity column alone | Use a composite index with a higher-cardinality prefix |

```sql
-- Before: type ALL
SELECT * FROM orders WHERE LOWER(status) = 'pending';

-- Fix: functional index
ALTER TABLE orders ADD INDEX idx_status_lower ((LOWER(status)));

-- After: type ref
EXPLAIN SELECT * FROM orders WHERE LOWER(status) = 'pending'\G
```

## Summary

The `type` column in EXPLAIN output tells you how MySQL accesses rows. Aim for `const`, `eq_ref`, or `ref` for point lookups, `range` for range scans, and avoid `ALL` on large tables. Fix `type: ALL` by adding an appropriate index, rewriting the predicate, or using FULLTEXT search for free-text patterns.
