# How to Generate Year-End Reports in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Report, YEAR, Aggregation, Analytics

Description: Learn how to generate comprehensive year-end reports in MySQL by aggregating annual data, comparing year-over-year performance, and summarizing KPIs across dimensions.

---

## Annual Aggregation Fundamentals

Year-end reports summarize an entire calendar year across key business metrics. Group by `YEAR()` and aggregate with `SUM`, `COUNT`, and `AVG`:

```sql
SELECT
  YEAR(order_date)              AS year,
  COUNT(*)                      AS total_orders,
  COUNT(DISTINCT customer_id)   AS active_customers,
  SUM(total_amount)             AS gross_revenue,
  AVG(total_amount)             AS avg_order_value,
  MAX(total_amount)             AS largest_order
FROM orders
GROUP BY YEAR(order_date)
ORDER BY year;
```

## Year-over-Year Revenue Comparison

Compare each year to the prior year:

```sql
WITH annual AS (
  SELECT YEAR(order_date) AS yr, SUM(total_amount) AS revenue
  FROM orders GROUP BY yr
)
SELECT
  yr,
  revenue,
  LAG(revenue) OVER (ORDER BY yr)                  AS prior_year,
  revenue - LAG(revenue) OVER (ORDER BY yr)         AS yoy_change,
  ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY yr))
    / NULLIF(LAG(revenue) OVER (ORDER BY yr), 0), 2) AS yoy_pct
FROM annual
ORDER BY yr;
```

## Annual KPI Summary

Combine multiple KPIs in one year-end summary query:

```sql
SELECT
  YEAR(o.order_date) AS year,
  COUNT(DISTINCT o.id) AS total_orders,
  COUNT(DISTINCT o.customer_id) AS customers,
  SUM(o.total_amount) AS gross_revenue,
  SUM(CASE WHEN o.status = 'cancelled' THEN o.total_amount ELSE 0 END) AS refunds,
  SUM(o.total_amount) - SUM(CASE WHEN o.status = 'cancelled' THEN o.total_amount ELSE 0 END) AS net_revenue,
  ROUND(SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS cancellation_rate_pct
FROM orders o
GROUP BY YEAR(o.order_date)
ORDER BY year;
```

## Annual Revenue by Product Category

Break the year-end report down by category:

```sql
SELECT
  YEAR(o.order_date)              AS year,
  p.category,
  SUM(oi.quantity * oi.unit_price) AS revenue,
  COUNT(DISTINCT o.id)             AS orders
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY YEAR(o.order_date), p.category
ORDER BY year, revenue DESC;
```

## Top Products of the Year

Identify the best-performing products by annual revenue:

```sql
WITH ranked AS (
  SELECT
    YEAR(o.order_date) AS year,
    p.id AS product_id,
    p.name AS product_name,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.unit_price) AS revenue,
    RANK() OVER (PARTITION BY YEAR(o.order_date) ORDER BY SUM(oi.quantity * oi.unit_price) DESC) AS revenue_rank
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id
  JOIN products p ON oi.product_id = p.id
  GROUP BY year, p.id, p.name
)
SELECT * FROM ranked
WHERE revenue_rank <= 10
ORDER BY year, revenue_rank;
```

## Monthly Trend Within the Year

Show each month's contribution to the annual total:

```sql
SELECT
  MONTH(order_date) AS month_num,
  MONTHNAME(order_date) AS month_name,
  SUM(total_amount) AS revenue,
  ROUND(100.0 * SUM(total_amount) / SUM(SUM(total_amount)) OVER (), 2) AS pct_of_annual
FROM orders
WHERE YEAR(order_date) = YEAR(CURDATE()) - 1
GROUP BY MONTH(order_date), MONTHNAME(order_date)
ORDER BY month_num;
```

## Summary

Generate year-end reports in MySQL by grouping with `YEAR()` and aggregating KPIs like revenue, order count, and cancellation rate. Use `LAG()` for year-over-year comparison, `RANK()` for top product analysis, and `SUM() OVER ()` to show each month's percentage of the annual total. Store pre-computed annual summaries for instant reporting.
