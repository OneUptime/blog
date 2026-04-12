# How to Generate Daily Reports in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Report, GROUP BY, Date, Aggregation

Description: Learn how to generate daily reports in MySQL by grouping data by date, filling gaps with a calendar table, and scheduling automated exports with MySQL Events.

---

## Grouping Data by Day

The foundation of any daily report is `GROUP BY` on a date expression:

```sql
SELECT
  DATE(order_date)           AS report_date,
  COUNT(*)                   AS order_count,
  SUM(total_amount)          AS total_revenue,
  AVG(total_amount)          AS avg_order_value,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM orders
WHERE order_date >= CURDATE() - INTERVAL 30 DAY
GROUP BY DATE(order_date)
ORDER BY report_date;
```

## Daily Report for a Specific Day

```sql
SELECT
  COUNT(*)              AS orders,
  SUM(total_amount)     AS revenue,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancellations
FROM orders
WHERE DATE(order_date) = CURDATE() - INTERVAL 1 DAY;
```

## Filling Gaps with a Calendar Table

When no orders exist on certain days, `GROUP BY` omits those dates. Use a calendar table to show zeros:

```sql
SELECT
  c.dt AS report_date,
  COALESCE(COUNT(o.id), 0)         AS order_count,
  COALESCE(SUM(o.total_amount), 0) AS revenue
FROM calendar c
LEFT JOIN orders o
  ON DATE(o.order_date) = c.dt
  AND o.order_date >= CURDATE() - INTERVAL 30 DAY
WHERE c.dt BETWEEN CURDATE() - INTERVAL 30 DAY AND CURDATE() - INTERVAL 1 DAY
GROUP BY c.dt
ORDER BY c.dt;
```

## Daily Multi-Metric Dashboard Query

```sql
SELECT
  DATE(created_at)              AS report_date,
  COUNT(*)                      AS new_users,
  SUM(CASE WHEN source = 'organic'  THEN 1 ELSE 0 END) AS organic,
  SUM(CASE WHEN source = 'paid'     THEN 1 ELSE 0 END) AS paid,
  SUM(CASE WHEN source = 'referral' THEN 1 ELSE 0 END) AS referral
FROM users
WHERE created_at >= CURDATE() - INTERVAL 30 DAY
GROUP BY DATE(created_at)
ORDER BY report_date;
```

## Daily Report Table for Persistence

Store pre-computed daily reports for fast dashboards:

```sql
CREATE TABLE daily_order_report (
  report_date     DATE PRIMARY KEY,
  order_count     INT UNSIGNED NOT NULL DEFAULT 0,
  total_revenue   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  unique_customers INT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO daily_order_report (report_date, order_count, total_revenue, unique_customers)
SELECT
  DATE(order_date),
  COUNT(*),
  SUM(total_amount),
  COUNT(DISTINCT customer_id)
FROM orders
WHERE DATE(order_date) = CURDATE() - INTERVAL 1 DAY
ON DUPLICATE KEY UPDATE
  order_count     = VALUES(order_count),
  total_revenue   = VALUES(total_revenue),
  unique_customers = VALUES(unique_customers);
```

## Scheduling with MySQL Events

Automate the daily report using the MySQL Event Scheduler:

```sql
SET GLOBAL event_scheduler = ON;

CREATE EVENT populate_daily_report
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 1 HOUR  -- runs at 01:00 daily
DO
  INSERT INTO daily_order_report (report_date, order_count, total_revenue, unique_customers)
  SELECT DATE(order_date), COUNT(*), SUM(total_amount), COUNT(DISTINCT customer_id)
  FROM orders
  WHERE DATE(order_date) = CURDATE() - INTERVAL 1 DAY
  ON DUPLICATE KEY UPDATE
    order_count = VALUES(order_count),
    total_revenue = VALUES(total_revenue),
    unique_customers = VALUES(unique_customers);
```

## Summary

Generate daily reports in MySQL by using `DATE()` with `GROUP BY` to aggregate by day. Join against a calendar table to ensure all days appear even on zero-activity days. Store pre-computed results in a report table for fast dashboard queries, and automate daily population with a MySQL Event Scheduler job.
