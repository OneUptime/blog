# How to Schedule Aggregation Tasks with MySQL Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Event Scheduler, Aggregation, Summary Table, Automation

Description: Learn how to use MySQL events to automatically populate summary tables with pre-aggregated data on a scheduled basis to speed up reporting queries.

---

Pre-aggregating data into summary tables is a classic performance optimization for read-heavy reporting workloads. MySQL events let you automate this process so summary tables are always up to date without requiring application-level scheduling logic.

## The Pattern

Instead of computing `SUM`, `COUNT`, and `AVG` at query time across millions of rows, you pre-compute them into a summary table and refresh it on a schedule.

## Example 1 - Daily Sales Summary

Create a summary table and populate it every night:

```sql
CREATE TABLE daily_sales_summary (
    summary_date  DATE PRIMARY KEY,
    order_count   INT          NOT NULL DEFAULT 0,
    total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    avg_order     DECIMAL(10,2) NOT NULL DEFAULT 0,
    updated_at    DATETIME
);
```

Schedule the aggregation event:

```sql
DELIMITER //

CREATE EVENT evt_aggregate_daily_sales
ON SCHEDULE EVERY 1 DAY
STARTS '2026-04-01 01:00:00'
DO
BEGIN
    INSERT INTO daily_sales_summary
        (summary_date, order_count, total_revenue, avg_order, updated_at)
    SELECT
        DATE(created_at),
        COUNT(*),
        SUM(total),
        AVG(total),
        NOW()
    FROM orders
    WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
    ON DUPLICATE KEY UPDATE
        order_count   = VALUES(order_count),
        total_revenue = VALUES(total_revenue),
        avg_order     = VALUES(avg_order),
        updated_at    = VALUES(updated_at);
END //

DELIMITER ;
```

## Example 2 - Hourly Active User Count

```sql
CREATE TABLE hourly_active_users (
    stat_hour  DATETIME PRIMARY KEY,
    user_count INT NOT NULL DEFAULT 0
);

DELIMITER //

CREATE EVENT evt_aggregate_hourly_users
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    INSERT INTO hourly_active_users (stat_hour, user_count)
    SELECT
        DATE_FORMAT(NOW() - INTERVAL 1 HOUR, '%Y-%m-%d %H:00:00'),
        COUNT(DISTINCT user_id)
    FROM user_activity
    WHERE activity_time >= NOW() - INTERVAL 1 HOUR
      AND activity_time <  NOW()
    ON DUPLICATE KEY UPDATE user_count = VALUES(user_count);
END //

DELIMITER ;
```

## Example 3 - Rolling 7-Day Product View Counts

Rebuild a rolling aggregate every 15 minutes:

```sql
DELIMITER //

CREATE EVENT evt_rolling_product_views
ON SCHEDULE EVERY 15 MINUTE
DO
BEGIN
    -- Truncate and rebuild for simplicity; for large tables use upserts
    TRUNCATE TABLE product_view_summary;

    INSERT INTO product_view_summary (product_id, view_count, last_updated)
    SELECT product_id, COUNT(*), NOW()
    FROM product_views
    WHERE viewed_at >= NOW() - INTERVAL 7 DAY
    GROUP BY product_id;
END //

DELIMITER ;
```

Use `TRUNCATE` only when the table can be briefly empty. For production systems, write to a staging table first and then swap:

```sql
RENAME TABLE product_view_summary TO product_view_summary_old,
             product_view_summary_new TO product_view_summary;
DROP TABLE product_view_summary_old;
```

## Querying Summary Tables

Reporting queries against summary tables run instantly:

```sql
SELECT summary_date, total_revenue, order_count
FROM daily_sales_summary
WHERE summary_date BETWEEN '2026-03-01' AND '2026-03-31'
ORDER BY summary_date;
```

## Summary

Schedule MySQL events to pre-aggregate data into summary tables using `ON DUPLICATE KEY UPDATE` for idempotent runs. This offloads heavy `GROUP BY` computations to off-peak hours and gives reporting queries fast, index-friendly access to pre-computed results.
