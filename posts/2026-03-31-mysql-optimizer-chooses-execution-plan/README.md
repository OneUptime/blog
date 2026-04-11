# How MySQL Optimizer Chooses an Execution Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Optimizer, Execution Plan, Index, Statistics

Description: Learn how the MySQL cost-based optimizer evaluates index choices, join order, and access methods to generate an execution plan for each query.

---

## The Cost-Based Optimizer

MySQL uses a cost-based optimizer (CBO) that assigns a numeric cost to each candidate execution plan and selects the plan with the lowest estimated cost. Cost is expressed in abstract units representing disk I/O and CPU time.

## Inputs to the Optimizer

The optimizer relies on three sources of information:

1. **Table statistics**: row counts, index cardinality, and data distribution stored in `information_schema.STATISTICS` and collected by `ANALYZE TABLE`.
2. **Index definitions**: which columns are indexed and in what order.
3. **Cost model constants**: configurable values in `mysql.server_cost` and `mysql.engine_cost`.

```sql
-- View current cost constants
SELECT cost_name, cost_value FROM mysql.server_cost;
SELECT cost_name, cost_value FROM mysql.engine_cost;
```

## Access Method Selection

For each table in the query, the optimizer considers several access methods:

- **const/eq_ref**: single row lookup via primary key or unique index - cheapest
- **ref**: index lookup using equality on a non-unique index
- **range**: index range scan with inequalities (`>`, `<`, `BETWEEN`)
- **index**: full index scan - reads only the index, not table rows
- **ALL**: full table scan - most expensive

```sql
EXPLAIN SELECT * FROM orders WHERE id = 100;
-- type = const, rows = 1

EXPLAIN SELECT * FROM orders WHERE user_id = 42;
-- type = ref if index exists, ALL if not
```

## Index Cardinality and Selectivity

The optimizer uses index cardinality (distinct values) to estimate how many rows an index lookup returns. Low-cardinality indexes (e.g., a `status` column with 3 values) may be skipped in favor of a full scan:

```sql
SELECT index_name, cardinality
FROM information_schema.STATISTICS
WHERE table_schema = 'myapp' AND table_name = 'orders';
```

Update statistics so the optimizer has accurate data:

```sql
ANALYZE TABLE orders;
```

## Join Order Optimization

For queries joining multiple tables, the optimizer evaluates different join orders. With N tables, there are N! possible orderings. MySQL limits the search space using heuristics and the `optimizer_search_depth` variable:

```sql
SHOW VARIABLES LIKE 'optimizer_search_depth';
-- Default 62 (maximum depth, effectively exhaustive for any practical join count)
```

The optimizer generally places the most selective table first (the "driving table") to reduce rows passed to subsequent joins.

## Reading the Execution Plan

Use `EXPLAIN FORMAT=JSON` for full cost details:

```sql
EXPLAIN FORMAT=JSON
SELECT o.id, u.email
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'shipped'
ORDER BY o.created_at DESC
LIMIT 20\G
```

Look for `query_cost` at the top level and `read_cost` plus `eval_cost` per table node.

## Optimizer Hints

Override the optimizer when it makes wrong choices:

```sql
-- Force a specific index
SELECT * FROM orders USE INDEX (idx_user_status)
WHERE user_id = 42 AND status = 'pending';

-- Prevent an index
SELECT * FROM orders IGNORE INDEX (idx_created_at)
WHERE created_at > '2025-01-01';

-- Set join order hint (MySQL 8.0+)
SELECT /*+ JOIN_ORDER(u, o) */ u.email, o.total
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.country = 'US';
```

## Viewing the Optimizer Trace

For deep debugging, enable the optimizer trace:

```sql
SET optimizer_trace = 'enabled=on';
SELECT * FROM orders WHERE user_id = 42;
SELECT * FROM information_schema.OPTIMIZER_TRACE\G
SET optimizer_trace = 'enabled=off';
```

The trace shows every considered plan, cost estimate, and the reason each was accepted or rejected.

## Summary

The MySQL optimizer is a cost-based system that evaluates access methods and join orders using table statistics to find the lowest-cost plan. Keep statistics current with `ANALYZE TABLE`, use `EXPLAIN FORMAT=JSON` to inspect costs, and apply optimizer hints when the chosen plan is suboptimal. The optimizer trace provides the full decision log for difficult cases.
