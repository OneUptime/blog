# How to Use Query Hints in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Hint, Query Optimization, Performance, Optimizer

Description: Learn how to use query hints in MySQL to control optimizer behavior, including index hints, join order hints, and optimizer switch hints.

---

## Overview

MySQL query hints are directives embedded in SQL statements that influence how the optimizer executes a query. They are used when the optimizer makes suboptimal choices due to stale statistics, unusual data distributions, or schema complexity. Hints are a last resort after exhausting statistics updates and schema improvements.

## Types of Query Hints in MySQL

MySQL supports several categories of hints:

1. Index hints: USE INDEX, FORCE INDEX, IGNORE INDEX
2. Optimizer hints: `/*+ hint */` syntax (introduced in MySQL 5.7, expanded in 8.0+)
3. Join order hints: STRAIGHT_JOIN
4. Table-level hints: BKA, NO_BKA, BNL, NO_BNL

## Index Hints

Index hints control which indexes the optimizer uses:

```sql
-- Use only this index
SELECT * FROM orders USE INDEX (idx_customer_id) WHERE customer_id = 42;

-- Force this index, make full table scan a last resort
SELECT * FROM orders FORCE INDEX (idx_status) WHERE status = 'pending';

-- Exclude this index from consideration
SELECT * FROM orders IGNORE INDEX (idx_old_unused) WHERE customer_id = 42;
```

## Optimizer Hints (MySQL 8.0+)

The `/*+ */` optimizer hint syntax provides fine-grained control:

```sql
-- Force use of a specific index for a table alias
SELECT /*+ INDEX(o idx_customer_id) */ *
FROM orders o WHERE customer_id = 42;

-- Disable specific optimizer features for this query
SELECT /*+ NO_MERGE(subq) */ *
FROM (SELECT * FROM orders WHERE status = 'pending') AS subq;

-- Set join order
SELECT /*+ JOIN_ORDER(c, o) */ c.name, o.total
FROM customers c JOIN orders o ON c.id = o.customer_id;
```

## STRAIGHT_JOIN for Join Order Control

`STRAIGHT_JOIN` forces MySQL to join tables in the exact order they appear in the FROM clause:

```sql
SELECT STRAIGHT_JOIN o.id, c.name, p.description
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id
WHERE o.status = 'pending';
```

Use this when EXPLAIN shows the optimizer choosing a poor driving table.

## MAX_EXECUTION_TIME Hint

Limit query execution time to prevent runaway queries:

```sql
SELECT /*+ MAX_EXECUTION_TIME(5000) */ *
FROM large_table
WHERE complex_condition = 'value';
```

This cancels the query if it runs longer than 5000 milliseconds.

## QB_NAME Hint for Complex Queries

Name query blocks to apply hints to specific subqueries:

```sql
SELECT /*+ QB_NAME(main_query) */ *
FROM orders o
WHERE o.customer_id IN (
  SELECT /*+ QB_NAME(subq) NO_INDEX(c idx_email) */ c.id
  FROM customers c WHERE c.region = 'US'
);
```

## Disabling Optimizer Features Per Query

Use `SET_VAR` to change optimizer settings for a single query:

```sql
SELECT /*+ SET_VAR(optimizer_switch='block_nested_loop=off') */ *
FROM large_table a
JOIN another_table b ON a.id = b.foreign_id;
```

## Verifying Hints with EXPLAIN

Always use EXPLAIN to confirm hints are applied correctly:

```sql
EXPLAIN SELECT /*+ INDEX(o idx_customer_id) */ o.id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending';
```

Check `key` to confirm the index and `Extra` for join methods.

## When to Use Query Hints

Use hints when:
- ANALYZE TABLE does not fix poor index selection
- Statistics are accurate but the optimizer still chooses badly
- You have profiled the query and confirmed a specific plan is faster
- A regression occurs after a MySQL upgrade changes optimizer behavior

Avoid hints when:
- The root cause is missing indexes
- Statistics are simply stale (run ANALYZE TABLE first)
- The hint will become invalid as data distribution changes

## Summary

MySQL query hints give you control over the optimizer when automatic query planning falls short. Use index hints for simple cases, optimizer hint syntax (`/*+ */`) for fine-grained control, and STRAIGHT_JOIN for join order issues. Always verify hint effects with EXPLAIN and treat hints as temporary fixes while addressing underlying schema or statistics issues.
