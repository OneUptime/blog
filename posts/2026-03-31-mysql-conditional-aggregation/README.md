# How to Use Conditional Aggregation in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Aggregation, Query

Description: Learn how to use conditional aggregation in MySQL with CASE expressions inside aggregate functions to pivot and summarize data in a single query.

---

Conditional aggregation is a technique that combines aggregate functions like `SUM()`, `COUNT()`, and `AVG()` with `CASE` expressions to compute multiple summaries in a single query. Instead of running several separate queries and joining them, you can collapse all the logic into one efficient pass over the data.

## Why Use Conditional Aggregation

Traditional approaches to filtered aggregation require multiple subqueries or joins. Conditional aggregation replaces this pattern with a cleaner, more performant query. It is especially useful for building reports, dashboards, and cross-tab summaries where each column represents a filtered slice of the same dataset.

## Basic Syntax

The core pattern wraps a `CASE` expression inside an aggregate function:

```sql
SELECT
  department,
  COUNT(*) AS total_employees,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count,
  SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_count
FROM employees
GROUP BY department;
```

This produces a single result set with both active and inactive counts per department without any joins.

## Summing Values Conditionally

You can apply the same technique to numeric columns:

```sql
SELECT
  region,
  SUM(revenue) AS total_revenue,
  SUM(CASE WHEN product_line = 'hardware' THEN revenue ELSE 0 END) AS hardware_revenue,
  SUM(CASE WHEN product_line = 'software' THEN revenue ELSE 0 END) AS software_revenue
FROM sales
GROUP BY region;
```

Each `CASE` expression returns the revenue value when the condition matches, and zero otherwise. The outer `SUM()` accumulates only the matching rows.

## Calculating Conditional Averages

To compute an average over a filtered subset, omit the `ELSE` clause in the `CASE` expression so that non-matching rows return `NULL`, which `AVG()` ignores automatically:

```sql
SELECT
  category,
  AVG(price) AS avg_price_all,
  AVG(CASE WHEN in_stock = 1 THEN price END) AS avg_price_in_stock
FROM products
GROUP BY category;
```

When the `CASE` expression returns `NULL` (by omitting the `ELSE` clause), `AVG()` ignores those rows automatically. This is more accurate than averaging zero values.

## Counting Distinct Values Conditionally

Use `COUNT(DISTINCT ...)` with a `CASE` expression that returns `NULL` for non-matching rows:

```sql
SELECT
  month,
  COUNT(DISTINCT customer_id) AS total_customers,
  COUNT(DISTINCT CASE WHEN order_value > 100 THEN customer_id END) AS high_value_customers
FROM orders
GROUP BY month;
```

## Percentage Breakdown in One Query

A common reporting pattern is computing percentages across categories:

```sql
SELECT
  department,
  COUNT(*) AS total,
  ROUND(
    100.0 * SUM(CASE WHEN gender = 'F' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) AS pct_female
FROM employees
GROUP BY department;
```

## Using IF() as a Shorthand

MySQL provides the `IF()` function as a more concise alternative to `CASE` for binary conditions:

```sql
SELECT
  store_id,
  SUM(IF(returned = 1, amount, 0)) AS returned_total,
  SUM(IF(returned = 0, amount, 0)) AS completed_total
FROM transactions
GROUP BY store_id;
```

## Performance Considerations

Conditional aggregation processes the table in a single scan, which is generally faster than multiple filtered queries. Index usage still applies to the `WHERE` and `GROUP BY` clauses. If the base table is large, ensure the grouping columns are indexed. Adding a covering index that includes the aggregated columns can eliminate table lookups entirely.

## Summary

Conditional aggregation in MySQL lets you produce multi-dimensional summaries from a single query by embedding `CASE` expressions inside aggregate functions. This technique reduces query complexity, improves readability, and often performs better than equivalent multi-query approaches. It is a foundational skill for writing efficient reporting queries.
