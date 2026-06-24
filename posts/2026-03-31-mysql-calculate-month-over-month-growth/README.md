# How to Calculate Month-over-Month Growth in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Analytics, Lag, Window Function, Growth

Description: Learn how to calculate month-over-month growth rates in MySQL using LAG() window functions, self-joins, and CTEs for trend analysis and reporting.

---

## What Is Month-over-Month Growth?

Month-over-month (MoM) growth measures the percentage change in a metric from one month to the next. It is the most granular growth trend indicator, useful for revenue tracking, user acquisition, and churn analysis.

## Basic MoM with LAG()

Use `LAG()` to retrieve the prior month's value:

```sql
WITH monthly AS (
  SELECT
    DATE_FORMAT(order_date, '%Y-%m') AS month,
    SUM(total_amount) AS revenue
  FROM orders
  GROUP BY DATE_FORMAT(order_date, '%Y-%m')
)
SELECT
  month,
  revenue,
  LAG(revenue) OVER (ORDER BY month) AS prior_month_revenue,
  ROUND(
    100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
    / NULLIF(LAG(revenue) OVER (ORDER BY month), 0),
    2
  ) AS mom_growth_pct
FROM monthly
ORDER BY month;
```

## MoM with Absolute and Relative Change

Show both the dollar change and the percentage:

```sql
WITH monthly_revenue AS (
  SELECT
    YEAR(order_date) AS yr,
    MONTH(order_date) AS mo,
    SUM(total_amount) AS revenue
  FROM orders
  GROUP BY yr, mo
)
SELECT
  yr,
  mo,
  revenue,
  LAG(revenue) OVER (ORDER BY yr, mo)                              AS prev_revenue,
  revenue - LAG(revenue) OVER (ORDER BY yr, mo)                   AS abs_change,
  ROUND(
    100.0 * (revenue - LAG(revenue) OVER (ORDER BY yr, mo))
    / NULLIF(LAG(revenue) OVER (ORDER BY yr, mo), 0), 2)          AS pct_change
FROM monthly_revenue
ORDER BY yr, mo;
```

## MoM for Multiple Metrics

Calculate MoM for revenue, order count, and average order value simultaneously:

```sql
WITH monthly_stats AS (
  SELECT
    DATE_FORMAT(order_date, '%Y-%m') AS month,
    SUM(total_amount)                AS revenue,
    COUNT(*)                         AS order_count,
    AVG(total_amount)                AS avg_order_value
  FROM orders
  GROUP BY month
)
SELECT
  month,
  revenue,
  ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
    / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 2) AS rev_mom_pct,
  order_count,
  ROUND(100.0 * (order_count - LAG(order_count) OVER (ORDER BY month))
    / NULLIF(LAG(order_count) OVER (ORDER BY month), 0), 2) AS orders_mom_pct,
  ROUND(avg_order_value, 2) AS aov
FROM monthly_stats
ORDER BY month;
```

## MoM Growth by Segment

Compute independent MoM growth for each product category:

```sql
WITH cat_monthly AS (
  SELECT
    p.category,
    DATE_FORMAT(o.order_date, '%Y-%m') AS month,
    SUM(oi.quantity * oi.unit_price)   AS revenue
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id
  JOIN products p ON oi.product_id = p.id
  GROUP BY p.category, month
)
SELECT
  category,
  month,
  revenue,
  ROUND(
    100.0 * (revenue - LAG(revenue) OVER (PARTITION BY category ORDER BY month))
    / NULLIF(LAG(revenue) OVER (PARTITION BY category ORDER BY month), 0),
    2
  ) AS mom_pct
FROM cat_monthly
ORDER BY category, month;
```

## Highlighting Declining Months

Filter for months with negative growth:

```sql
WITH mom_data AS (
  SELECT
    DATE_FORMAT(order_date, '%Y-%m') AS month,
    SUM(total_amount) AS revenue
  FROM orders
  GROUP BY month
),
mom_calc AS (
  SELECT
    month,
    revenue,
    ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
      / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 2) AS mom_pct
  FROM mom_data
)
SELECT *
FROM mom_calc
WHERE mom_pct < 0
ORDER BY mom_pct ASC;
```

## Summary

Calculate month-over-month growth in MySQL using `LAG(revenue) OVER (ORDER BY month)`. Use `NULLIF` to prevent division by zero, `PARTITION BY` for segment-level analysis, and CTEs to keep the query readable. Combine absolute change and percentage change in a single query for complete reporting.
