# How to Optimize UNION Queries in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Optimization, Performance, Index

Description: Learn how to optimize MySQL UNION queries by choosing between UNION and UNION ALL, applying indexes to each SELECT, and restructuring queries to reduce temporary table usage.

---

## UNION vs UNION ALL: The Core Difference

`UNION` combines result sets and removes duplicates, requiring an internal temporary table and deduplication step. `UNION ALL` combines result sets without deduplication - faster and more memory efficient.

```sql
-- UNION: creates temporary table for deduplication
SELECT user_id FROM premium_users
UNION
SELECT user_id FROM trial_users;

-- UNION ALL: no deduplication, no temp table
SELECT user_id FROM premium_users
UNION ALL
SELECT user_id FROM trial_users;
```

## Detecting UNION Performance Issues

```sql
EXPLAIN
SELECT name, email FROM customers WHERE region = 'east'
UNION
SELECT name, email FROM customers WHERE region = 'west';
```

```text
id | select_type  | table     | type | key
1  | PRIMARY      | customers | ref  | idx_region
2  | UNION        | customers | ref  | idx_region
NULL | UNION RESULT | <union1,2> | ALL | NULL
```

The `UNION RESULT` row with `type: ALL` represents the deduplication step. `UNION ALL` eliminates this row entirely.

## Use UNION ALL When Results Are Distinct

If the separate SELECT statements cannot produce duplicate rows, always use `UNION ALL`:

```sql
-- These partitions of a table are mutually exclusive
-- by definition, so UNION ALL is safe
SELECT id, event FROM events_2024 WHERE event_type = 'purchase'
UNION ALL
SELECT id, event FROM events_2025 WHERE event_type = 'purchase';
```

## Index Each SELECT Branch Independently

Each SELECT in a UNION must be individually optimized. Run EXPLAIN on each branch:

```sql
-- Check each branch
EXPLAIN SELECT * FROM orders WHERE status = 'pending' AND region = 'west';
EXPLAIN SELECT * FROM orders WHERE status = 'shipped' AND region = 'west';
```

Ensure each branch uses an appropriate index. A UNION is only as fast as its slowest branch.

## Rewrite UNION as a Single Query When Possible

Many UNION queries can be rewritten as a single SELECT with OR or IN:

```sql
-- Before: UNION across two status values
SELECT id, total FROM orders WHERE status = 'pending'
UNION ALL
SELECT id, total FROM orders WHERE status = 'backorder';

-- After: single query with IN
SELECT id, total FROM orders WHERE status IN ('pending', 'backorder');
```

The single query approach often performs better because MySQL can use a single index range scan.

## UNION with Sorting and LIMIT

To sort or limit the entire UNION result, place `ORDER BY` and `LIMIT` after the last SELECT:

```sql
SELECT id, name, created_at FROM active_users
UNION ALL
SELECT id, name, created_at FROM guest_users
ORDER BY created_at DESC
LIMIT 20;
```

`ORDER BY` and `LIMIT` after the final branch apply to the entire combined result. If placed inside parenthesized individual SELECT statements, they apply only to that branch and `ORDER BY` without `LIMIT` may be optimized away since it has no effect on the final result.

## Push Down WHERE Conditions Into Each Branch

MySQL does not always push WHERE conditions from the outer query into UNION branches. Do it explicitly:

```sql
-- Outer WHERE may not be pushed into UNION branches
SELECT * FROM (
  SELECT id, category, price FROM products_us
  UNION ALL
  SELECT id, category, price FROM products_eu
) all_products
WHERE category = 'electronics';

-- Better: push the filter into each branch explicitly
SELECT id, category, price FROM products_us WHERE category = 'electronics'
UNION ALL
SELECT id, category, price FROM products_eu WHERE category = 'electronics';
```

Each branch can now use an index on `category`.

## Summary

UNION query optimization starts with choosing `UNION ALL` over `UNION` whenever duplicate elimination is not required. Ensure each SELECT branch in the UNION uses an appropriate index by running EXPLAIN on each one individually. When possible, rewrite multi-branch UNIONs as single queries with `IN` or `OR` clauses. Push filter conditions down into each branch explicitly rather than relying on MySQL to do it automatically.
