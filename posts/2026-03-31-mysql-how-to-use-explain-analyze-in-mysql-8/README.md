# How to Use EXPLAIN ANALYZE in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, EXPLAIN ANALYZE, Query Optimization, Performance, Execution Plan

Description: Learn how to use EXPLAIN ANALYZE in MySQL 8 to profile query execution in real time, compare estimated vs actual row counts, and find bottlenecks.

---

## What Is EXPLAIN ANALYZE

`EXPLAIN ANALYZE` was introduced in MySQL 8.0.18. Unlike `EXPLAIN`, which shows the optimizer's plan without executing the query, `EXPLAIN ANALYZE` actually runs the query and reports:
- Estimated vs actual row counts
- Time spent in each step (actual time per operation)
- Number of loops (for nested joins)

This makes it the best tool for diagnosing optimizer mis-estimates and slow query plans.

## Basic Syntax

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
```

## Reading the Output

The output is a tree showing the execution steps from innermost to outermost:

```text
-> Filter: (orders.customer_id = 42)  (cost=3.51 rows=3) (actual time=0.042..0.065 rows=5 loops=1)
    -> Index lookup on orders using idx_customer_id (customer_id=42)  (cost=3.51 rows=3) (actual time=0.038..0.055 rows=5 loops=1)
```

Key fields:
- `cost=` - the optimizer's estimated cost
- `rows=` - estimated row count
- `actual time=start..end` - real start and end time in milliseconds
- `loops=` - how many times this step executed

## Comparing Estimated vs Actual Rows

When estimated rows differ greatly from actual rows, the optimizer may choose a poor plan:

```sql
EXPLAIN ANALYZE
SELECT o.id, c.name, o.total_amount
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'
  AND o.order_date > '2025-01-01';
```

Sample output excerpt:

```text
-> Nested loop inner join  (cost=108.50 rows=20) (actual time=0.25..12.3 rows=1450 loops=1)
    -> Filter: ((o.status = 'pending') and (o.order_date > '2025-01-01'))  (cost=50.25 rows=20) (actual time=0.10..4.2 rows=1450 loops=1)
        -> Table scan on o  (cost=50.25 rows=200) (actual time=0.10..3.5 rows=2000 loops=1)
    -> Single-row index lookup on c using PRIMARY (id=o.customer_id)  (cost=0.25 rows=1) (actual time=0.005..0.005 rows=1 loops=1450)
```

In this case, the optimizer estimated 20 rows but 1450 were returned - a strong signal to run `ANALYZE TABLE orders` to update statistics.

## Updating Statistics After EXPLAIN ANALYZE Reveals Mis-estimates

```sql
ANALYZE TABLE orders;
```

Then re-run `EXPLAIN ANALYZE` to see if the estimates improve.

## Using FORMAT=TREE (Default)

The default and only supported format is TREE. You can explicitly specify it, but no other format is allowed:

```sql
EXPLAIN ANALYZE FORMAT=TREE
SELECT * FROM orders WHERE customer_id = 1;
```

Note: Unlike regular `EXPLAIN`, `EXPLAIN ANALYZE` does not support `FORMAT=JSON` or `FORMAT=TRADITIONAL`.

## Identifying Full Table Scans

```sql
EXPLAIN ANALYZE
SELECT * FROM products WHERE description LIKE '%wireless%';
```

Output indicates a full table scan:

```text
-> Filter: (products.description like '%wireless%')  (cost=102.10 rows=100) (actual time=0.25..15.60 rows=23 loops=1)
    -> Table scan on products  (cost=102.10 rows=1000) (actual time=0.08..12.40 rows=1000 loops=1)
```

Since the LIKE pattern starts with a wildcard, no index can be used. Consider a full-text index instead.

## Analyzing a Slow JOIN

```sql
EXPLAIN ANALYZE
SELECT e.name, d.name AS department, SUM(s.amount) AS total_sales
FROM employees e
JOIN departments d ON e.dept_id = d.id
JOIN sales s ON s.employee_id = e.id
GROUP BY e.id, e.name, d.name
ORDER BY total_sales DESC;
```

Look for steps with high `actual time` values, large gaps between estimated and actual `rows`, and high loop counts that multiply execution time.

## Practical Tips

1. Run `EXPLAIN ANALYZE` before and after adding an index to measure the improvement.
2. High `loops=` counts on inner steps indicate expensive nested loop joins - consider adding covering indexes.
3. A large gap between estimated `rows=` and actual `rows=` suggests stale table statistics - run `ANALYZE TABLE` to refresh them.
4. For DML statements, wrap in a transaction and roll back to avoid side effects:

```sql
START TRANSACTION;
EXPLAIN ANALYZE UPDATE orders SET status = 'processed' WHERE order_date < '2025-01-01';
ROLLBACK;
```

## Summary

`EXPLAIN ANALYZE` in MySQL 8 is the definitive tool for understanding why a query is slow. By comparing optimizer estimates to actual execution metrics, you can pinpoint missing indexes, stale statistics, and inefficient join orders. Always run `ANALYZE TABLE` after identifying mis-estimates to refresh the optimizer's statistics.
