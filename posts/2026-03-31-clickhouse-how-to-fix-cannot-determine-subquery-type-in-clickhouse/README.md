# How to Fix 'Cannot determine subquery type' in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Subqueries, Troubleshooting

Description: Understand why ClickHouse throws 'Cannot determine subquery type' and learn how to rewrite subqueries to resolve the error.

---

## Understanding the Error

When ClickHouse encounters a subquery it cannot categorize as either a scalar, set, or table subquery, it raises:

```text
DB::Exception: Cannot determine subquery type.
```

This usually happens when a subquery returns an ambiguous result structure - for example, a subquery that ClickHouse cannot prove returns a single column or single row at parse time.

## Common Causes

- Using a correlated subquery that ClickHouse does not support in that context
- Placing a subquery where ClickHouse expects a scalar but the subquery could return multiple columns
- Using `IN` with a subquery that returns multiple columns
- Subquery used in a context requiring a constant expression

## Reproducing the Error

```sql
-- This can trigger the error in older ClickHouse versions:
SELECT *
FROM orders
WHERE (customer_id, product_id) IN (
    SELECT customer_id, product_id
    FROM top_customers
);
```

## Fix 1 - Use a JOIN Instead of a Subquery

JOINs are generally more reliable in ClickHouse than complex subqueries:

```sql
-- Replace IN subquery with a JOIN
SELECT o.*
FROM orders o
INNER JOIN top_customers tc
    ON o.customer_id = tc.customer_id
   AND o.product_id = tc.product_id;
```

## Fix 2 - Rewrite Multi-Column IN as a Tuple

ClickHouse does support tuple IN syntax but requires explicit tuple notation:

```sql
-- Use tuple notation explicitly
SELECT *
FROM orders
WHERE (customer_id, product_id) IN (
    SELECT (customer_id, product_id)
    FROM top_customers
);
```

## Fix 3 - Use a CTE to Materialize the Subquery

Wrapping the subquery in a CTE can help ClickHouse determine its type:

```sql
WITH top_pairs AS (
    SELECT customer_id, product_id
    FROM top_customers
)
SELECT o.*
FROM orders o
INNER JOIN top_pairs tp
    ON o.customer_id = tp.customer_id
   AND o.product_id = tp.product_id;
```

## Fix 4 - Split Into Single-Column Subqueries

If tuple IN is not supported in your ClickHouse version, split the condition:

```sql
SELECT *
FROM orders
WHERE customer_id IN (SELECT customer_id FROM top_customers)
  AND product_id IN (SELECT product_id FROM top_customers);
```

Note: this changes the semantics (logical AND of two independent sets). Use a JOIN if you need exact pair matching.

## Fix 5 - Concatenate Columns for a Composite Key

Create a synthetic key to use with single-column IN:

```sql
SELECT *
FROM orders
WHERE concat(toString(customer_id), '_', toString(product_id)) IN (
    SELECT concat(toString(customer_id), '_', toString(product_id))
    FROM top_customers
);
```

## Fix 6 - Use IN with a Scalar Subquery

For scalar subqueries (guaranteed single value), ensure the subquery returns exactly one row and one column:

```sql
-- Scalar subquery - returns a single value
SELECT *
FROM orders
WHERE customer_id = (
    SELECT customer_id
    FROM top_customers
    ORDER BY total_spend DESC
    LIMIT 1
);
```

## Checking Your ClickHouse Version

Subquery support has improved significantly across versions:

```sql
SELECT version();
```

If you are on an older version (pre-22.x), upgrading may resolve the issue as ClickHouse continuously improves its SQL planner.

## Debugging Tips

Enable query logging to see the parsed query structure:

```sql
SET log_queries = 1;
SET send_logs_level = 'debug';

-- Run your query here
```

Then check the logs:

```bash
grep "Cannot determine subquery" /var/log/clickhouse-server/clickhouse-server.log | tail -20
```

## Summary

The "Cannot determine subquery type" error occurs when ClickHouse cannot infer the structure of a subquery at parse time. The most reliable fixes are converting subqueries to JOINs, using explicit CTEs, or switching to tuple IN notation. Upgrading to a recent ClickHouse version also resolves many subquery limitations.
