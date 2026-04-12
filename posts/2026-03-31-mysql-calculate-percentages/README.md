# How to Calculate Percentages in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Aggregation

Description: Learn how to calculate percentages in MySQL using subqueries, window functions, and conditional aggregation for reporting and analytics queries.

---

Calculating percentages in MySQL requires dividing a partial count or sum by a total. The challenge is that SQL aggregates are computed per group, so you need a way to reference the grand total alongside each group total. MySQL provides several approaches depending on your MySQL version and query complexity.

## Percentage Using a Subquery

The simplest method uses a subquery to compute the total and divides each group's value by it:

```sql
SELECT
  category,
  COUNT(*) AS cnt,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM products), 2) AS pct
FROM products
GROUP BY category;
```

The scalar subquery runs once and provides the denominator for every row in the outer query.

## Percentage Using a Cross Join

An alternative approach joins the totals table:

```sql
SELECT
  p.category,
  COUNT(*) AS cnt,
  ROUND(100.0 * COUNT(*) / t.total, 2) AS pct
FROM products p
CROSS JOIN (SELECT COUNT(*) AS total FROM products) t
GROUP BY p.category, t.total;
```

Cross joins work well when the total comes from a more complex subquery involving filters or multiple tables.

## Percentage Within a Group Using Window Functions

MySQL 8.0 introduced window functions that make within-group percentages straightforward:

```sql
SELECT
  department,
  employee_id,
  salary,
  ROUND(100.0 * salary / SUM(salary) OVER (PARTITION BY department), 2) AS pct_of_dept
FROM employees;
```

`SUM() OVER (PARTITION BY department)` computes the department total without collapsing rows, so each employee row shows its share of the department salary pool.

## Running Percentage Using Cumulative Sum

Combine `SUM()` window functions to build a cumulative percentage:

```sql
SELECT
  sale_date,
  daily_revenue,
  ROUND(
    100.0 * SUM(daily_revenue) OVER (ORDER BY sale_date) /
    SUM(daily_revenue) OVER (),
    2
  ) AS running_pct
FROM daily_sales;
```

`SUM() OVER ()` with no partition computes the grand total across all rows.

## Percentage of Category Total

To see each product's share within its category:

```sql
SELECT
  category,
  product_name,
  revenue,
  ROUND(
    100.0 * revenue / SUM(revenue) OVER (PARTITION BY category),
    2
  ) AS pct_of_category
FROM product_revenue;
```

## Percentage Change Between Periods

Use `LAG()` to compare consecutive periods:

```sql
SELECT
  month,
  revenue,
  LAG(revenue) OVER (ORDER BY month) AS prev_month_revenue,
  ROUND(
    100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) /
    NULLIF(LAG(revenue) OVER (ORDER BY month), 0),
    2
  ) AS pct_change
FROM monthly_revenue;
```

`NULLIF` prevents division by zero when the previous month had zero revenue.

## Scaling the Result to a Percentage

Dividing a partial count by a total with `/` returns a decimal fraction between 0 and 1 in MySQL, not a percentage. Multiply by `100` to convert the ratio to a percentage:

```sql
-- Returns a fraction like 0.3000, not a percentage
SELECT COUNT(*) / (SELECT COUNT(*) FROM products) FROM products WHERE category = 'A';

-- Returns a percentage like 30.00
SELECT 100.0 * COUNT(*) / (SELECT COUNT(*) FROM products) FROM products WHERE category = 'A';
```

## Summary

Calculating percentages in MySQL relies on combining group aggregates with a grand total, either via subqueries, cross joins, or window functions. Window functions (MySQL 8.0+) are the cleanest approach because they compute partitioned totals without collapsing the result set. Always multiply by 100 to convert the ratio to a percentage.
