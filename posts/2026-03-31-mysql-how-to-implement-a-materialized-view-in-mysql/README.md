# How to Implement a Materialized View in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Materialized View, Performance, View, Stored Procedure

Description: Learn how to implement materialized views in MySQL using summary tables and scheduled events to cache expensive query results for fast reads.

---

## What Is a Materialized View

A materialized view is a precomputed query result stored as a physical table. Unlike a standard SQL view (which runs the underlying query on every access), a materialized view stores the result set and must be refreshed periodically.

MySQL does not have native materialized views, but you can achieve the same effect using:
1. A summary table.
2. A scheduled event or stored procedure to refresh it.
3. Optionally, triggers for near-real-time refresh.

## Step 1 - Create the Base Tables

```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  order_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
);

CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL
);
```

## Step 2 - Create the Materialized View Table

```sql
CREATE TABLE mv_daily_sales (
  sale_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  total_orders INT NOT NULL DEFAULT 0,
  total_revenue DECIMAL(14, 2) NOT NULL DEFAULT 0,
  refreshed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sale_date, category),
  INDEX idx_sale_date (sale_date)
);
```

## Step 3 - Create the Refresh Stored Procedure

```sql
DELIMITER $$

CREATE PROCEDURE refresh_mv_daily_sales()
BEGIN
  -- Truncate and rebuild from scratch (full refresh)
  TRUNCATE TABLE mv_daily_sales;

  INSERT INTO mv_daily_sales (sale_date, category, total_orders, total_revenue)
  SELECT
    o.order_date,
    p.category,
    COUNT(*) AS total_orders,
    SUM(o.quantity * o.unit_price) AS total_revenue
  FROM orders o
  JOIN products p ON o.product_id = p.id
  WHERE o.status = 'completed'
  GROUP BY o.order_date, p.category;

END$$

DELIMITER ;
```

For large tables, consider an incremental refresh that only updates recent data:

```sql
DELIMITER $$

CREATE PROCEDURE refresh_mv_daily_sales_incremental()
BEGIN
  -- Delete and re-insert only the last 3 days
  DELETE FROM mv_daily_sales
  WHERE sale_date >= CURDATE() - INTERVAL 3 DAY;

  INSERT INTO mv_daily_sales (sale_date, category, total_orders, total_revenue)
  SELECT
    o.order_date,
    p.category,
    COUNT(*),
    SUM(o.quantity * o.unit_price)
  FROM orders o
  JOIN products p ON o.product_id = p.id
  WHERE o.status = 'completed'
    AND o.order_date >= CURDATE() - INTERVAL 3 DAY
  GROUP BY o.order_date, p.category;

END$$

DELIMITER ;
```

## Step 4 - Schedule Automatic Refresh with an Event

```sql
-- Enable the event scheduler
SET GLOBAL event_scheduler = ON;

CREATE EVENT ev_refresh_daily_sales
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
DO
  CALL refresh_mv_daily_sales_incremental();
```

Verify the event is scheduled:

```sql
SHOW EVENTS FROM myapp;
```

## Step 5 - Query the Materialized View

Instead of running the expensive aggregation query:

```sql
-- Slow: runs against millions of rows every time
SELECT order_date, p.category, COUNT(*), SUM(o.quantity * o.unit_price)
FROM orders o JOIN products p ON o.product_id = p.id
WHERE o.status = 'completed'
GROUP BY order_date, p.category;
```

Use the materialized view for instant results:

```sql
-- Fast: reads from precomputed summary table
SELECT sale_date, category, total_orders, total_revenue
FROM mv_daily_sales
WHERE sale_date >= CURDATE() - INTERVAL 30 DAY
ORDER BY sale_date DESC, total_revenue DESC;
```

## Trigger-Based Refresh (Near Real-Time)

For near-real-time updates on small data volumes, use triggers:

```sql
DELIMITER $$

CREATE TRIGGER orders_after_status_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Upsert into materialized view
    INSERT INTO mv_daily_sales (sale_date, category, total_orders, total_revenue)
    SELECT NEW.order_date, p.category, 1, NEW.quantity * NEW.unit_price
    FROM products p WHERE p.id = NEW.product_id
    ON DUPLICATE KEY UPDATE
      total_orders = total_orders + 1,
      total_revenue = total_revenue + NEW.quantity * NEW.unit_price;
  END IF;
END$$

DELIMITER ;
```

## Summary

Materialized views in MySQL are implemented with summary tables refreshed by stored procedures and scheduled events. Full refreshes are simple but costly for large tables; incremental refreshes offer better performance by only updating recent data. For near-real-time accuracy, trigger-based incremental updates can maintain the summary table with each qualifying DML operation.
