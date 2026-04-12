# How to Use EXPLAIN in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, EXPLAIN, Query Optimization, Performance, Execution Plan

Description: Learn how to use EXPLAIN in MySQL to inspect query execution plans, understand output columns, and identify performance bottlenecks.

---

## Overview

`EXPLAIN` is MySQL's primary tool for understanding how the query optimizer executes a SQL statement. It shows the execution plan: which tables are accessed, in what order, which indexes are used, and how many rows MySQL estimates it will examine.

Understanding `EXPLAIN` output is the first step in diagnosing slow queries and optimizing database performance.

## Basic Syntax

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 42;
```

You can also use `EXPLAIN` with `INSERT`, `UPDATE`, `DELETE`, and `REPLACE` statements.

## Reading the Output Columns

```sql
EXPLAIN SELECT o.id, o.total, u.email
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'paid'\G
```

```text
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: o
   partitions: NULL
         type: ref
possible_keys: idx_status
          key: idx_status
      key_len: 82
          ref: const
         rows: 1523
     filtered: 100.00
        Extra: NULL
*************************** 2. row ***************************
           id: 1
  select_type: SIMPLE
        table: u
   partitions: NULL
         type: eq_ref
possible_keys: PRIMARY
          key: PRIMARY
      key_len: 4
          ref: myapp.o.user_id
         rows: 1
     filtered: 100.00
        Extra: NULL
```

## Key Columns Explained

### id
The SELECT identifier. Rows with the same `id` are executed at the same level. Higher `id` values run first in subqueries.

### select_type
How MySQL classifies the query:
- `SIMPLE` - no subqueries or unions
- `PRIMARY` - outermost SELECT when subqueries or unions are present
- `SUBQUERY` - first SELECT in a subquery
- `DERIVED` - subquery in FROM clause
- `UNION` - second or later SELECT in a union

### type (access type)
The most important column - how MySQL accesses the table. Best to worst:

```text
system   - table has exactly one row
const    - at most one matching row (primary key or unique lookup)
eq_ref   - one row from joined table per row in outer table
ref      - rows matching a non-unique index lookup
range    - index range scan
index    - full index scan
ALL      - full table scan (worst case)
```

### key
Which index MySQL actually chose. `NULL` means no index is used.

### rows
Estimated number of rows MySQL must examine. Lower is better.

### Extra
Additional notes. Important values:

```text
Using index      - covering index (fast)
Using where      - filter applied after index lookup
Using filesort   - in-memory or disk sort required (may be slow)
Using temporary  - temp table created (often slow)
```

## Identifying Problems

### Full Table Scan

```sql
EXPLAIN SELECT * FROM orders WHERE total > 100\G
```

```text
         type: ALL
          key: NULL
         rows: 850000
        Extra: Using where
```

`type: ALL` with no key means a full scan of 850,000 rows. Add an index on `total`.

### Filesort

```sql
EXPLAIN SELECT * FROM orders ORDER BY created_at DESC LIMIT 10\G
```

```text
        Extra: Using filesort
```

Add an index on `created_at` to avoid the sort.

### Using Temporary Table

```sql
EXPLAIN SELECT status, COUNT(*) FROM orders GROUP BY status\G
```

```text
        Extra: Using temporary; Using filesort
```

An index on `status` can resolve both the temp table and filesort.

## EXPLAIN with Subqueries

```sql
EXPLAIN
SELECT * FROM users
WHERE id IN (
  SELECT user_id FROM orders WHERE status = 'paid'
)\G
```

This shows multiple rows - one per query component - which helps identify if subqueries are being materialized or run as loops.

## Using Index Hints

If EXPLAIN shows MySQL choosing the wrong index, you can hint which one to use:

```sql
EXPLAIN SELECT * FROM orders USE INDEX (idx_user_status)
WHERE user_id = 42 AND status = 'paid'\G
```

## Summary

`EXPLAIN` is the essential starting point for MySQL query optimization. Focus on the `type` column - `ALL` or `index` means you likely need better indexes. Check the `key` column to see if an index is being used, and look at `Extra` for `Using filesort` or `Using temporary` as signals of expensive operations. Always run `EXPLAIN` before and after adding indexes to confirm your changes have the expected effect.
