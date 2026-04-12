# How to Use COUNT() OVER for Running Counts in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, SQL, Query, Aggregate

Description: Learn how to use COUNT() OVER in MySQL to compute running counts and cumulative totals across result set rows without collapsing data.

---

## What Is COUNT() OVER?

MySQL 8.0 introduced window functions, and `COUNT() OVER` is one of the most versatile. Unlike the aggregate `COUNT()` paired with `GROUP BY`, the window variant preserves every row while adding a running or cumulative count alongside the original data.

The general syntax is:

```sql
COUNT(expr) OVER (
  [PARTITION BY partition_expr]
  [ORDER BY order_expr]
  [ROWS|RANGE frame_clause]
)
```

When you include `ORDER BY`, the count accumulates as rows are processed in the specified order. Without `ORDER BY`, the count is computed over the entire partition.

## Basic Running Count Example

Consider an `orders` table. To count how many orders have been placed up to and including each row (sorted by order date):

```sql
SELECT
  order_id,
  customer_id,
  order_date,
  COUNT(*) OVER (ORDER BY order_date) AS running_order_count
FROM orders
ORDER BY order_date;
```

The result adds `running_order_count` to each row. Note that the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, so rows sharing the same `order_date` are peers and receive the same count. If you need a strict row-by-row increment of 1, use `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` or `ROW_NUMBER()` instead.

## Partitioned Running Count

To reset the count for each customer, add a `PARTITION BY` clause:

```sql
SELECT
  order_id,
  customer_id,
  order_date,
  COUNT(*) OVER (
    PARTITION BY customer_id
    ORDER BY order_date
  ) AS customer_order_seq
FROM orders
ORDER BY customer_id, order_date;
```

Because the default frame is `RANGE`, orders sharing the same `order_date` within a customer receive the same count. This is useful for counting how many orders a customer has placed up to a given date, but if you need a unique sequential position (1, 2, 3, …) per order, use `ROW_NUMBER()` instead.

## Counting Non-NULL Values

`COUNT(expr)` only counts non-NULL values of `expr`. This lets you count how many rows have a non-NULL field up to the current row:

```sql
SELECT
  order_id,
  shipped_at,
  COUNT(shipped_at) OVER (ORDER BY order_id) AS running_shipped_count
FROM orders;
```

Rows where `shipped_at` is NULL are skipped in the count, giving you a running total of shipped orders.

## Using ROWS BETWEEN for a Sliding Window Count

You can count rows within a sliding window rather than a cumulative window. The example below counts how many orders occurred in the current row and the 6 rows before it:

```sql
SELECT
  order_id,
  order_date,
  COUNT(*) OVER (
    ORDER BY order_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS orders_last_7_rows
FROM orders;
```

This is useful for approximate rolling window counts when you want a fixed row-based window.

## Comparing Running Count to Total Count

A common pattern compares a running count to the full partition count to derive progress:

```sql
SELECT
  order_id,
  customer_id,
  order_date,
  COUNT(*) OVER (PARTITION BY customer_id ORDER BY order_date) AS seq,
  COUNT(*) OVER (PARTITION BY customer_id) AS total_orders,
  ROUND(
    COUNT(*) OVER (PARTITION BY customer_id ORDER BY order_date) * 100.0
    / COUNT(*) OVER (PARTITION BY customer_id),
    1
  ) AS pct_through
FROM orders;
```

This shows the percentage progress through each customer's order history.

## Practical Use Case - Detecting Duplicate Submissions

Running counts help identify duplicate rows without a subquery:

```sql
SELECT *
FROM (
  SELECT
    *,
    COUNT(*) OVER (PARTITION BY customer_id, order_date) AS dup_count
  FROM orders
) ranked
WHERE dup_count > 1;
```

Rows sharing the same `customer_id` and `order_date` appear with a count greater than 1, making deduplication straightforward.

## Performance Tips

- Add an index on the `ORDER BY` column to avoid a full sort.
- Avoid mixing many different window specifications in one query; MySQL processes each frame separately.
- Use `EXPLAIN` to verify that no unnecessary filesort operations occur.

## Summary

`COUNT() OVER` in MySQL 8.0 lets you build running counts, partitioned sequences, and sliding-window counts while retaining all rows in the result set. It replaces complex correlated subqueries with clean, readable SQL - making it ideal for order sequencing, duplicate detection, and progress calculations.
