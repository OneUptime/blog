# How to Use MySQL Hints (Optimizer Hints)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Optimizer Hint, Query Optimization, Performance

Description: Learn how to use MySQL 8.0 optimizer hints to override query planner decisions, control join order, index usage, and parallelism for better query performance.

---

## What Are Optimizer Hints

MySQL 5.7 introduced optimizer hints as a standardized way to influence query execution plans, and MySQL 8.0 greatly expanded the set of available hints. Unlike the older index hints (`USE INDEX`, `FORCE INDEX`) which only control index selection, optimizer hints use a `/*+ ... */` comment syntax and control a much wider range of planner behaviors including join order, semijoin strategies, subquery materialization, and derived table merging.

## Syntax

Optimizer hints are placed inside a `/*+ */` comment immediately after the `SELECT`, `UPDATE`, `INSERT`, or `DELETE` keyword:

```sql
SELECT /*+ hint_name(table_name) */ col1, col2 FROM ...
```

Multiple hints can be combined in the same comment:

```sql
SELECT /*+ JOIN_ORDER(orders, customers) NO_INDEX_MERGE(orders) */ ...
```

## Controlling Join Order

By default, MySQL's optimizer decides which table to use as the driving table. Use `JOIN_ORDER` to override this:

```sql
-- Force MySQL to join in the order: orders -> customers -> products
SELECT /*+ JOIN_ORDER(o, c, p) */
  o.id, c.email, p.name
FROM orders    o
JOIN customers c ON c.id = o.customer_id
JOIN products  p ON p.id = o.product_id
WHERE o.status = 'PENDING';
```

## Forcing or Disabling Index Usage

```sql
-- Force the optimizer to use a specific index
SELECT /*+ INDEX(orders idx_status_date) */
  id, total
FROM orders
WHERE status = 'PENDING'
  AND created_at > '2025-01-01';

-- Prevent the optimizer from using a specific index
SELECT /*+ NO_INDEX(orders idx_status_date) */
  id, total
FROM orders
WHERE status = 'PENDING';

-- Disable index merge (when the optimizer picks multiple indexes poorly)
SELECT /*+ NO_INDEX_MERGE(orders) */
  id
FROM orders
WHERE status = 'PENDING' OR total > 1000;
```

## Controlling Subquery Materialization

```sql
-- Force subquery to be materialized into a temp table
SELECT /*+ SUBQUERY(MATERIALIZATION) */
  id, name
FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE total > 500);

-- Force semijoin instead of materialization
SELECT /*+ SEMIJOIN(FIRSTMATCH) */
  id, name
FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE status = 'COMPLETED');
```

## Controlling Derived Table Merging

```sql
-- Prevent MySQL from merging a derived table (subquery in FROM) into the outer query
SELECT /*+ NO_MERGE(recent) */
  region, SUM(revenue)
FROM (
  SELECT region, revenue
  FROM orders
  WHERE created_at > '2025-01-01'
) AS recent
GROUP BY region;
```

## Hash Join Hints

MySQL 8.0.18 introduced hash joins along with `HASH_JOIN` and `NO_HASH_JOIN` hints. However, these hints were deprecated in MySQL 8.0.19 and have no effect in 8.0.19+. In modern MySQL versions, the optimizer automatically uses hash joins for equi-join conditions where appropriate, and the `BNL`/`NO_BNL` hints can be used to influence this behavior:

```sql
-- In MySQL 8.0.18 only: force hash join between orders and customers
SELECT /*+ HASH_JOIN(o, c) */
  o.id, c.email
FROM orders    o
JOIN customers c ON c.id = o.customer_id
WHERE o.total > 100;

-- In MySQL 8.0.19+: use NO_BNL to disable hash join
SELECT /*+ NO_BNL(o) */
  o.id, c.email
FROM orders    o
JOIN customers c ON c.id = o.customer_id;
```

## Using EXPLAIN to Verify

Always verify that your hints are being applied:

```sql
EXPLAIN FORMAT=TREE
SELECT /*+ JOIN_ORDER(o, c) INDEX(o idx_status) */
  o.id, c.email
FROM orders    o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'PENDING'\G
```

After running EXPLAIN, use `SHOW WARNINGS` to check for hint-related warnings. Malformed or conflicting hints generate warnings, while valid hints that cannot be applied are silently ignored.

## When to Use Optimizer Hints

```text
- The optimizer picks an inefficient join order for a query with many tables
- A specific index is known to perform better but the planner avoids it
- Subquery flattening causes worse performance than explicit materialization
- A hash join would outperform nested loops for a large join
```

Optimizer hints should be a last resort after verifying that statistics are up to date (`ANALYZE TABLE`) and indexes are properly designed.

## Summary

MySQL optimizer hints provide fine-grained control over query execution plans using `/*+ */` syntax. Use `JOIN_ORDER` to fix bad join sequences, `INDEX` and `NO_INDEX` to override index selection, and materialization hints to control subquery behavior. Always verify with EXPLAIN and treat hints as a targeted fix rather than a substitute for proper schema and index design.
