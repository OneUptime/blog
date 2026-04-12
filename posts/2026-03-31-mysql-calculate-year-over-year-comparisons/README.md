# How to Calculate Year-over-Year Comparisons in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Analytics, Lag, Window Function, Year-over-Year

Description: Learn how to calculate year-over-year comparisons in MySQL using LAG() window functions and self-joins to measure growth between the same periods across years.

---

## What Is a Year-over-Year Comparison?

Year-over-year (YoY) analysis compares a metric in one period to the same period in the prior year. It reveals growth trends while normalizing for seasonality. MySQL supports this with `LAG()` window functions or self-joins.

## Self-Join Approach

Join the revenue table to itself with a one-year offset:

```sql
SELECT
  cy.year,
  cy.revenue       AS current_year_revenue,
  py.revenue       AS prior_year_revenue,
  cy.revenue - py.revenue AS yoy_change,
  ROUND(100.0 * (cy.revenue - py.revenue) / NULLIF(py.revenue, 0), 2) AS yoy_growth_pct
FROM (
  SELECT YEAR(order_date) AS year, SUM(total_amount) AS revenue
  FROM orders
  GROUP BY YEAR(order_date)
) cy
LEFT JOIN (
  SELECT YEAR(order_date) AS year, SUM(total_amount) AS revenue
  FROM orders
  GROUP BY YEAR(order_date)
) py ON cy.year = py.year + 1
ORDER BY cy.year;
```

## LAG() Window Function Approach

`LAG()` retrieves the previous row's value without a self-join:

```sql
WITH yearly_revenue AS (
  SELECT
    YEAR(order_date) AS year,
    SUM(total_amount) AS revenue
  FROM orders
  GROUP BY YEAR(order_date)
)
SELECT
  year,
  revenue,
  LAG(revenue, 1) OVER (ORDER BY year) AS prior_year_revenue,
  revenue - LAG(revenue, 1) OVER (ORDER BY year) AS yoy_change,
  ROUND(
    100.0 * (revenue - LAG(revenue, 1) OVER (ORDER BY year))
    / NULLIF(LAG(revenue, 1) OVER (ORDER BY year), 0),
    2
  ) AS yoy_growth_pct
FROM yearly_revenue
ORDER BY year;
```

`NULLIF(..., 0)` prevents division by zero when prior year revenue is zero.

## Monthly YoY Comparison

Compare the same month across consecutive years:

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
  LAG(revenue, 12) OVER (ORDER BY yr, mo) AS same_month_last_year,
  ROUND(
    100.0 * (revenue - LAG(revenue, 12) OVER (ORDER BY yr, mo))
    / NULLIF(LAG(revenue, 12) OVER (ORDER BY yr, mo), 0),
    2
  ) AS yoy_pct
FROM monthly_revenue
ORDER BY yr, mo;
```

`LAG(revenue, 12)` looks back 12 rows in month-sorted order to get the same month last year.

## YoY by Product Category

Compare year-over-year within each category independently:

```sql
WITH cat_yearly AS (
  SELECT
    p.category,
    YEAR(o.order_date) AS yr,
    SUM(oi.quantity * oi.unit_price) AS revenue
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id
  JOIN products p ON oi.product_id = p.id
  GROUP BY p.category, YEAR(o.order_date)
)
SELECT
  category,
  yr,
  revenue,
  LAG(revenue) OVER (PARTITION BY category ORDER BY yr) AS prior_yr_revenue,
  ROUND(
    100.0 * (revenue - LAG(revenue) OVER (PARTITION BY category ORDER BY yr))
    / NULLIF(LAG(revenue) OVER (PARTITION BY category ORDER BY yr), 0),
    2
  ) AS yoy_pct
FROM cat_yearly
ORDER BY category, yr;
```

## Summary

Calculate YoY comparisons in MySQL using either a self-join or `LAG()` window function. For monthly YoY, use `LAG(value, 12)` over month-sorted data. Add `PARTITION BY` to compute independent YoY growth per category or segment. Always use `NULLIF` to handle zero-value prior periods gracefully.
