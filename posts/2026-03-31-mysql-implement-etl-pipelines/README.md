# How to Implement ETL Pipelines with MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ETL, Data Pipeline, Stored Procedure

Description: Learn how to build Extract, Transform, Load pipelines using MySQL stored procedures, staging tables, and event scheduling for reliable data warehouse loading.

---

## ETL Architecture with MySQL

An ETL pipeline in MySQL typically uses three layers:
- **Staging tables** - raw data lands here first, minimal transformation
- **Transform queries** - cleanse, deduplicate, and enrich data in place
- **Target tables** - the final dimensional model or reporting tables

Keeping layers separate makes it easy to rerun failed steps without corrupting the target.

## Step 1 - Extract into Staging

Create a staging table that mirrors the source structure. Staging tables are truncated and reloaded each run:

```sql
CREATE TABLE stg_orders (
  order_id     VARCHAR(50)   NOT NULL,
  customer_id  VARCHAR(50),
  product_sku  VARCHAR(50),
  quantity     INT,
  unit_price   DECIMAL(10,2),
  order_date   VARCHAR(20),  -- raw string, cleaned in transform step
  status       VARCHAR(20),
  loaded_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Load from CSV exported by source system
TRUNCATE TABLE stg_orders;
LOAD DATA INFILE '/tmp/orders_2025_01_15.csv'
  INTO TABLE stg_orders
  FIELDS TERMINATED BY ','
  OPTIONALLY ENCLOSED BY '"'
  LINES TERMINATED BY '\n'
  IGNORE 1 ROWS
  (order_id, customer_id, product_sku, quantity, unit_price, order_date, status);
```

## Step 2 - Transform

Cleanse and enrich the staged data in a transform table:

```sql
CREATE TABLE trx_orders (
  order_id     VARCHAR(50)   NOT NULL PRIMARY KEY,
  customer_key BIGINT,
  product_key  BIGINT,
  quantity     INT           NOT NULL DEFAULT 0,
  unit_price   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  order_date   DATE,
  status       VARCHAR(20),
  revenue      DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
) ENGINE=InnoDB;

-- Transform: resolve surrogate keys, parse dates, filter bad rows
INSERT INTO trx_orders (order_id, customer_key, product_key, quantity, unit_price, order_date, status)
SELECT
  s.order_id,
  c.customer_key,
  p.product_key,
  GREATEST(s.quantity, 0),
  GREATEST(s.unit_price, 0.00),
  STR_TO_DATE(s.order_date, '%Y-%m-%d'),
  UPPER(TRIM(s.status))
FROM stg_orders          s
LEFT JOIN dim_customer   c ON c.customer_id = s.customer_id
LEFT JOIN dim_product    p ON p.sku         = s.product_sku
WHERE s.order_id IS NOT NULL
  AND s.order_date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
ON DUPLICATE KEY UPDATE
  quantity   = VALUES(quantity),
  unit_price = VALUES(unit_price),
  status     = VALUES(status);
```

## Step 3 - Load into Target

```sql
-- Load from transform table into fact table
INSERT INTO fact_orders (order_id, date_key, customer_key, product_key, quantity, unit_price, revenue)
SELECT
  t.order_id,
  DATE_FORMAT(t.order_date, '%Y%m%d') + 0,
  t.customer_key,
  t.product_key,
  t.quantity,
  t.unit_price,
  t.revenue
FROM trx_orders t
WHERE t.order_date IS NOT NULL
  AND t.customer_key IS NOT NULL
  AND t.product_key  IS NOT NULL
ON DUPLICATE KEY UPDATE
  quantity   = VALUES(quantity),
  unit_price = VALUES(unit_price),
  revenue    = VALUES(revenue);
```

## Wrapping in a Stored Procedure

```sql
DELIMITER $$
CREATE PROCEDURE run_orders_etl(IN p_file VARCHAR(255))
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
    DELETE FROM stg_orders;
    SET @sql = CONCAT("LOAD DATA INFILE '", p_file,
      "' INTO TABLE stg_orders FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 ROWS");
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    CALL transform_orders();
    CALL load_orders();
  COMMIT;
END$$
DELIMITER ;
```

## Scheduling the Pipeline

```sql
CREATE EVENT ev_daily_etl
  ON SCHEDULE EVERY 1 DAY
  STARTS '2025-01-16 03:00:00'
  DO CALL run_orders_etl('/data/orders_latest.csv');
```

## Summary

MySQL ETL pipelines follow a three-layer pattern: staging, transform, and load. Use `LOAD DATA INFILE` for fast extraction, transform queries to resolve surrogate keys and cleanse data, and `INSERT ... ON DUPLICATE KEY UPDATE` for idempotent loads. Wrap the steps in a stored procedure with an error handler and schedule the job with MySQL Event Scheduler.
