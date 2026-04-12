# How to Use EXPLAIN FORMAT=TREE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, EXPLAIN, Query, Performance, Optimization

Description: Learn how to use EXPLAIN FORMAT=TREE in MySQL 8.0 to read hierarchical query execution plans and identify cost estimates for each operation.

---

## What Is EXPLAIN FORMAT=TREE?

MySQL 8.0.16 introduced `EXPLAIN FORMAT=TREE`, which displays the query execution plan as a hierarchical tree structure. Unlike the default tabular output, the tree format mirrors the actual execution order and shows iterator-level cost estimates from the iterator-based executor.

The tree format is especially useful for understanding join ordering, subquery processing, and operation nesting.

## Basic Syntax

```sql
EXPLAIN FORMAT=TREE
SELECT o.id, c.name, o.total
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending';
```

Sample output:

```text
-> Nested loop inner join  (cost=4250.50 rows=1200)
    -> Filter: (o.status = 'pending')  (cost=1200.25 rows=1200)
        -> Index lookup on o using idx_status (status='pending')  (cost=1200.25 rows=1200)
    -> Single-row index lookup on c using PRIMARY (id=o.customer_id)  (cost=0.25 rows=1)
```

## Reading the Tree Format

The tree is read from the innermost indented lines outward. Each node represents an operation:

```text
-> Nested loop inner join         <- outer operation (join type)
    -> Filter: ...                <- filter applied to left input
        -> Index lookup on o ...  <- index used for filtering
    -> Single-row index lookup    <- right-side index lookup per join row
```

Numbers in parentheses are optimizer cost estimates and row count predictions.

## Comparing Tree vs Table Format

```sql
-- Traditional tabular format
EXPLAIN SELECT * FROM products WHERE price > 100 ORDER BY price;

-- Tree format
EXPLAIN FORMAT=TREE SELECT * FROM products WHERE price > 100 ORDER BY price;
```

Tree output for the above:

```text
-> Sort: products.price  (cost=12500.50 rows=50000)
    -> Filter: (products.price > 100)  (cost=7500.25 rows=50000)
        -> Table scan on products  (cost=7500.25 rows=100000)
```

The tree shows the sort wrapping the filter, which wraps the table scan. This makes the operation hierarchy immediately clear.

## Spotting Problems in Tree Format

### Full table scan

```text
-> Table scan on orders  (cost=80000.00 rows=800000)
```

A table scan node with high cost and row count means no index is being used.

### Sort without index

```text
-> Sort: orders.created_at DESC  (cost=45000.00 rows=200000)
    -> Table scan on orders
```

This tells you a full scan followed by a sort - both expensive.

### Efficient plan

```text
-> Index range scan on orders using idx_created_at  (cost=2500.00 rows=5000)
```

Index range scans are good - the optimizer found an appropriate index.

## Using EXPLAIN ANALYZE with TREE Format

In MySQL 8.0.18+, you can combine `EXPLAIN ANALYZE` with the tree format to get actual execution statistics alongside estimates:

```sql
EXPLAIN ANALYZE
SELECT p.name, SUM(oi.quantity) AS total_sold
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id
ORDER BY total_sold DESC
LIMIT 10;
```

```text
-> Limit: 10 row(s)  (cost=1234.56 rows=10) (actual time=45.123..45.234 rows=10 loops=1)
    -> Sort: total_sold DESC  (cost=...)  (actual time=45.100..45.120 rows=10 loops=1)
        -> Table scan on <temporary>  (...)
            -> Aggregate using temporary table  (actual time=42.000..44.500 rows=5000 loops=1)
                -> Nested loop inner join  (actual time=0.500..38.000 rows=50000 loops=1)
```

The `actual time` values in parentheses show real measured time, making it easy to spot which step is slow.

## Summary

`EXPLAIN FORMAT=TREE` in MySQL 8.0 provides a hierarchical view of query execution plans that maps directly to how the optimizer thinks about your query. It shows operation nesting, join types, and cost estimates in an intuitive format. Combined with `EXPLAIN ANALYZE`, you get both predicted and actual timing data for each node, making it the most detailed diagnostic tool available for MySQL query tuning.
