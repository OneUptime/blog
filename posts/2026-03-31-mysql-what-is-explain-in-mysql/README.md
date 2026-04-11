# What Is EXPLAIN in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, EXPLAIN, Query Optimization, Performance Tuning

Description: EXPLAIN is a MySQL statement that shows the query execution plan, revealing how the optimizer will access tables and indexes to answer a query.

---

## Overview

`EXPLAIN` is one of the most powerful tools in a MySQL developer's toolkit. It shows the execution plan that the query optimizer has chosen for a given SELECT, INSERT, UPDATE, DELETE, or REPLACE statement. By understanding the plan, you can identify full table scans, missing indexes, and other inefficiencies.

## Basic EXPLAIN Usage

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 42;
```

Output:

```text
+----+-------------+--------+------+---------------+-------------+---------+-------+------+-------+
| id | select_type | table  | type | possible_keys | key         | key_len | ref   | rows | Extra |
+----+-------------+--------+------+---------------+-------------+---------+-------+------+-------+
|  1 | SIMPLE      | orders | ref  | idx_cust_id   | idx_cust_id | 4       | const |   10 | NULL  |
+----+-------------+--------+------+---------------+-------------+---------+-------+------+-------+
```

## Key EXPLAIN Output Columns

### `type` Column - Most Important

| Value | Meaning |
|-------|---------|
| `system` | Single row (best case) |
| `const` | At most one matching row |
| `eq_ref` | One row per row of previous table (join via unique key) |
| `ref` | Rows matched using a non-unique index |
| `range` | Index range scan |
| `index` | Full index scan |
| `ALL` | Full table scan (worst case) |

### `rows` Column

An estimate of the number of rows MySQL needs to examine. Lower is better.

### `Extra` Column

Contains additional information about query execution:

| Value | Meaning |
|-------|---------|
| `Using index` | Covered index - no table lookup needed |
| `Using where` | WHERE clause applied after fetch |
| `Using filesort` | Extra sort step required |
| `Using temporary` | Temporary table used |

## Interpreting a Bad Execution Plan

```sql
-- This query may trigger a full table scan
EXPLAIN SELECT * FROM users WHERE YEAR(created_at) = 2026;
```

```text
+----+-------------+-------+------+---------------+------+---------+------+--------+-------------+
| id | select_type | table | type | possible_keys | key  | key_len | ref  | rows   | Extra       |
+----+-------------+-------+------+---------------+------+---------+------+--------+-------------+
|  1 | SIMPLE      | users | ALL  | NULL          | NULL | NULL    | NULL | 500000 | Using where |
+----+-------------+-------+------+---------------+------+---------+------+--------+-------------+
```

The `type: ALL` and `rows: 500000` indicate a full table scan. Fix:

```sql
-- Use a sargable expression instead
EXPLAIN SELECT * FROM users
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
```

## EXPLAIN with Joins

```sql
EXPLAIN
SELECT o.id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE c.country = 'US';
```

Each row in the output represents one table in the join. Check that join columns use indexes.

## EXPLAIN for INSERT, UPDATE, DELETE

```sql
EXPLAIN UPDATE orders SET status = 'shipped' WHERE customer_id = 42;

EXPLAIN DELETE FROM audit_log WHERE created_at < '2025-01-01';
```

## EXPLAIN EXTENDED (Legacy)

In MySQL 5.x, you could use `EXPLAIN EXTENDED` followed by `SHOW WARNINGS` to see the rewritten query. In MySQL 8.0, this is deprecated - use `EXPLAIN FORMAT=JSON` instead.

```sql
EXPLAIN FORMAT=JSON SELECT * FROM orders WHERE status = 'pending'\G
```

## FORMAT=TREE (MySQL 8.0.16+)

```sql
EXPLAIN FORMAT=TREE SELECT * FROM orders JOIN customers USING (customer_id)\G
```

Outputs a tree-structured plan that's easier to read for complex queries.

## Practical Workflow

```sql
-- Step 1: Run EXPLAIN
EXPLAIN SELECT * FROM products WHERE category = 'electronics' ORDER BY price;

-- Step 2: Check for ALL type - add index
ALTER TABLE products ADD INDEX idx_category_price (category, price);

-- Step 3: Verify improvement
EXPLAIN SELECT * FROM products WHERE category = 'electronics' ORDER BY price;
-- type should now be 'ref', Using index for ORDER BY
```

## Summary

`EXPLAIN` reveals the query execution plan MySQL will use, including which indexes are utilized, how many rows are estimated, and whether expensive operations like filesort or full table scans occur. It is the starting point for all query optimization work, and should be run before adding indexes or restructuring queries.
