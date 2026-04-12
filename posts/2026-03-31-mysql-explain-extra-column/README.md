# How to Understand the Extra Column in EXPLAIN Output in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Optimization, Index, Performance

Description: Learn what the Extra column in MySQL EXPLAIN output means and how to interpret values like Using index, Using filesort, and Using temporary.

---

## What Is the Extra Column in EXPLAIN?

When you run `EXPLAIN` on a MySQL query, the output includes an `Extra` column that provides supplemental information about how MySQL executes the query. This column often contains the most actionable data for performance tuning. Unlike other columns that describe table access methods, `Extra` reveals what additional operations MySQL performs internally.

```sql
EXPLAIN SELECT name, email FROM users WHERE status = 'active' ORDER BY created_at;
```

The `Extra` column in the result might show values like `Using index`, `Using filesort`, or `Using temporary`.

## Common Extra Column Values

### Using index

This is the best possible value. It means MySQL can satisfy the query entirely from the index without touching the actual table rows (a covering index scenario).

```sql
-- Create a covering index
CREATE INDEX idx_status_created ON users(status, created_at, name, email);

EXPLAIN SELECT name, email FROM users WHERE status = 'active' ORDER BY created_at;
-- Extra: Using index
```

### Using where

MySQL applied a WHERE filter after fetching rows. This does not indicate a problem by itself but combined with a full table scan it signals missing indexes.

```sql
EXPLAIN SELECT * FROM orders WHERE total_amount > 500;
-- Extra: Using where
```

### Using filesort

MySQL must perform an extra sorting pass because no suitable index covers the ORDER BY clause. This is expensive for large result sets.

```sql
EXPLAIN SELECT * FROM products ORDER BY price DESC;
-- Extra: Using filesort
```

### Using temporary

MySQL created an internal temporary table to process the query. Common with GROUP BY, DISTINCT, or certain subqueries.

```sql
EXPLAIN SELECT category, COUNT(*) FROM products GROUP BY category;
-- Extra: Using temporary; Using filesort
```

### Using index condition

Introduced as the Index Condition Pushdown (ICP) optimization. MySQL evaluates part of the WHERE clause at the index level before fetching full rows.

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 10 AND amount > 100;
-- Extra: Using index condition
```

### NULL (empty Extra)

An empty `Extra` column is generally fine. It means MySQL used a standard index lookup or table scan with no special operations noted.

## Reading Multiple Values

The `Extra` column can contain multiple semicolon-separated values:

```sql
EXPLAIN SELECT customer_id, SUM(amount) FROM orders
WHERE status = 'shipped'
GROUP BY customer_id
ORDER BY SUM(amount) DESC;
-- Extra: Using where; Using temporary; Using filesort
```

This indicates three separate performance concerns in a single query.

## Practical Optimization Workflow

```sql
-- Step 1: Run EXPLAIN to see Extra values
EXPLAIN SELECT * FROM logs WHERE user_id = 42 ORDER BY timestamp DESC LIMIT 20;

-- Step 2: Add a composite index to eliminate filesort
CREATE INDEX idx_user_time ON logs(user_id, timestamp DESC);

-- Step 3: Re-run EXPLAIN to confirm improvement
EXPLAIN SELECT * FROM logs WHERE user_id = 42 ORDER BY timestamp DESC LIMIT 20;
-- Extra should now show: Using index condition (or Using index for covering)
```

## Less Common Values to Know

```text
Backward index scan        - MySQL scans index in descending order
Select tables optimized away - Aggregates resolved entirely via index
No tables used             - Query has no FROM clause (e.g., SELECT 1+1)
Impossible WHERE           - WHERE condition can never be true
```

## Summary

The `Extra` column in EXPLAIN output is your first clue about hidden performance costs. Values like `Using filesort` and `Using temporary` indicate operations that consume CPU and memory beyond basic row lookups. By adding appropriate indexes, you can often eliminate these operations. Always re-run EXPLAIN after schema changes to confirm that the Extra column shows the expected improvement.
