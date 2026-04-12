# How to Generate Monthly Reports in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Report, DATE_FORMAT, GROUP BY, Aggregation

Description: Learn how to generate monthly reports in MySQL using DATE_FORMAT and YEAR/MONTH grouping, month-over-month comparison, and automated Event Scheduler population.

---

## Grouping Data by Month

Use `DATE_FORMAT` or a `YEAR()`/`MONTH()` combination to group by calendar month:

```sql
SELECT
  DATE_FORMAT(order_date, '%Y-%m')   AS report_month,
  COUNT(*)                           AS order_count,
  SUM(total_amount)                  AS monthly_revenue,
  AVG(total_amount)                  AS avg_order_value,
  COUNT(DISTINCT customer_id)        AS unique_customers
FROM orders
WHERE order_date >= CURDATE() - INTERVAL 12 MONTH
GROUP BY DATE_FORMAT(order_date, '%Y-%m')
ORDER BY report_month;
```

## Monthly Report with Breakdown by Category

```sql
SELECT
  DATE_FORMAT(o.order_date, '%Y-%m') AS report_month,
  p.category,
  COUNT(*)                           AS orders,
  SUM(oi.quantity * oi.unit_price)   AS category_revenue
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.order_date >= CURDATE() - INTERVAL 6 MONTH
GROUP BY report_month, p.category
ORDER BY report_month, p.category;
```

## Month-over-Month Comparison

```sql
WITH monthly AS (
  SELECT
    DATE_FORMAT(order_date, '%Y-%m') AS month,
    SUM(total_amount) AS revenue
  FROM orders
  GROUP BY month
)
SELECT
  month,
  revenue,
  LAG(revenue) OVER (ORDER BY month) AS prev_month,
  ROUND(
    100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
    / NULLIF(LAG(revenue) OVER (ORDER BY month), 0),
    2
  ) AS mom_pct
FROM monthly
ORDER BY month;
```

## Filling Missing Months

When months have no data, use a date sequence to ensure they appear in the report:

```sql
WITH RECURSIVE months AS (
  SELECT DATE_FORMAT(CURDATE() - INTERVAL 11 MONTH, '%Y-%m-01') AS month_start
  UNION ALL
  SELECT month_start + INTERVAL 1 MONTH
  FROM months
  WHERE month_start < DATE_FORMAT(CURDATE(), '%Y-%m-01')
),
monthly_data AS (
  SELECT
    DATE_FORMAT(order_date, '%Y-%m') AS month,
    SUM(total_amount) AS revenue
  FROM orders
  GROUP BY month
)
SELECT
  DATE_FORMAT(m.month_start, '%Y-%m') AS month,
  COALESCE(d.revenue, 0)              AS revenue
FROM months m
LEFT JOIN monthly_data d ON DATE_FORMAT(m.month_start, '%Y-%m') = d.month
ORDER BY m.month_start;
```

## Monthly Report Table

Pre-aggregate for fast reporting:

```sql
CREATE TABLE monthly_order_report (
  report_month    CHAR(7)       NOT NULL COMMENT 'YYYY-MM',
  order_count     INT UNSIGNED  NOT NULL DEFAULT 0,
  total_revenue   DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  unique_customers INT UNSIGNED  NOT NULL DEFAULT 0,
  PRIMARY KEY (report_month)
) ENGINE=InnoDB;

INSERT INTO monthly_order_report (report_month, order_count, total_revenue, unique_customers)
SELECT
  DATE_FORMAT(order_date, '%Y-%m'),
  COUNT(*),
  SUM(total_amount),
  COUNT(DISTINCT customer_id)
FROM orders
WHERE DATE_FORMAT(order_date, '%Y-%m') = DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m')
ON DUPLICATE KEY UPDATE
  order_count      = VALUES(order_count),
  total_revenue    = VALUES(total_revenue),
  unique_customers = VALUES(unique_customers);
```

## Automated Monthly Population with Events

```sql
CREATE EVENT generate_monthly_report
ON SCHEDULE EVERY 1 MONTH
STARTS DATE_FORMAT(CURDATE(), '%Y-%m-01') + INTERVAL 1 MONTH + INTERVAL 2 HOUR
DO
  INSERT INTO monthly_order_report ...;
```

## Summary

Generate monthly reports in MySQL by grouping with `DATE_FORMAT(date, '%Y-%m')`. Use a recursive CTE date sequence to fill months with no data. Add MoM comparison with `LAG()`, and pre-populate a report table with a monthly MySQL Event for instant dashboard queries.
