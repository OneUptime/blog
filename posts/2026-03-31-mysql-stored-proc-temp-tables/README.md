# How to Use Temporary Tables in MySQL Stored Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, Temporary Table, Performance, SQL

Description: Learn how to create and use temporary tables inside MySQL stored procedures for multi-step data processing and complex intermediate calculations.

---

Temporary tables in MySQL stored procedures allow you to store intermediate results that would otherwise require complex nested queries or correlated subqueries. They are particularly useful when you need to process data in multiple steps or reference an intermediate result set multiple times.

## Creating Temporary Tables in Procedures

Temporary tables are created with `CREATE TEMPORARY TABLE` and automatically dropped when the session ends. Unlike regular tables, they are session-local:

```sql
DELIMITER //

CREATE PROCEDURE generate_sales_report(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    -- Drop temp table if it exists from a previous failed run
    DROP TEMPORARY TABLE IF EXISTS tmp_daily_sales;
    DROP TEMPORARY TABLE IF EXISTS tmp_ranked_products;

    -- Step 1: Aggregate daily sales
    CREATE TEMPORARY TABLE tmp_daily_sales (
        sale_date DATE,
        product_id INT,
        units_sold INT,
        revenue DECIMAL(12,2),
        INDEX idx_date (sale_date),
        INDEX idx_product (product_id)
    );

    INSERT INTO tmp_daily_sales (sale_date, product_id, units_sold, revenue)
    SELECT
        DATE(o.created_at),
        oi.product_id,
        SUM(quantity),
        SUM(quantity * unit_price)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE DATE(o.created_at) BETWEEN p_start_date AND p_end_date
      AND o.status = 'delivered'
    GROUP BY DATE(o.created_at), oi.product_id;

    -- Step 2: Rank products by revenue
    CREATE TEMPORARY TABLE tmp_ranked_products AS
    SELECT
        product_id,
        SUM(units_sold) AS total_units,
        SUM(revenue) AS total_revenue,
        RANK() OVER (ORDER BY SUM(revenue) DESC) AS revenue_rank
    FROM tmp_daily_sales
    GROUP BY product_id;

    -- Return results using the precomputed data
    SELECT
        p.name AS product_name,
        rp.total_units,
        rp.total_revenue,
        rp.revenue_rank
    FROM tmp_ranked_products rp
    JOIN products p ON p.id = rp.product_id
    WHERE rp.revenue_rank <= 20
    ORDER BY rp.revenue_rank;

    -- Clean up explicitly (good practice)
    DROP TEMPORARY TABLE IF EXISTS tmp_daily_sales;
    DROP TEMPORARY TABLE IF EXISTS tmp_ranked_products;
END //

DELIMITER ;
```

## Temp Tables vs. CTEs for Multi-Step Processing

Temporary tables are preferable to CTEs when you need to:
- Reference the intermediate result more than once
- Add indexes to the intermediate result
- Run statistics on it before the next step

```sql
DELIMITER //

CREATE PROCEDURE reconcile_inventory()
BEGIN
    -- Build an indexed temp table
    DROP TEMPORARY TABLE IF EXISTS tmp_inventory_snapshot;

    CREATE TEMPORARY TABLE tmp_inventory_snapshot
    SELECT
        product_id,
        SUM(quantity) AS on_hand
    FROM inventory_transactions
    GROUP BY product_id;

    ALTER TABLE tmp_inventory_snapshot
    ADD PRIMARY KEY (product_id);

    -- Now join it multiple times efficiently
    SELECT p.name, s.on_hand, p.reorder_point,
           (s.on_hand - p.reorder_point) AS safety_stock
    FROM tmp_inventory_snapshot s
    JOIN products p ON p.id = s.product_id
    WHERE s.on_hand < p.reorder_point;

    SELECT COUNT(*) AS products_below_reorder
    FROM tmp_inventory_snapshot s
    JOIN products p ON p.id = s.product_id
    WHERE s.on_hand < p.reorder_point;

    DROP TEMPORARY TABLE IF EXISTS tmp_inventory_snapshot;
END //

DELIMITER ;
```

## Avoiding Name Collisions

Temporary tables are session-scoped, so concurrent sessions can have temp tables with the same name without conflict. However, within a single session (connection pooling), always drop them before creation:

```sql
DELIMITER //

CREATE PROCEDURE safe_temp_table_usage()
BEGIN
    -- Always guard with IF EXISTS
    DROP TEMPORARY TABLE IF EXISTS tmp_work_data;

    CREATE TEMPORARY TABLE tmp_work_data (
        id INT PRIMARY KEY,
        value DECIMAL(10,2)
    );

    -- Do work...
    INSERT INTO tmp_work_data SELECT id, revenue FROM orders LIMIT 1000;

    SELECT SUM(value) AS total FROM tmp_work_data;

    -- Clean up at the end
    DROP TEMPORARY TABLE IF EXISTS tmp_work_data;
END //

DELIMITER ;
```

## Monitoring Temporary Table Usage

```sql
-- Check if disk-based temp tables are being created
SHOW STATUS LIKE 'Created_tmp%';

-- Check temp file usage
SHOW VARIABLES LIKE 'tmpdir';
```

## Summary

Temporary tables in stored procedures are ideal for multi-step data processing where intermediate results need indexing or multiple references. Always use `DROP TEMPORARY TABLE IF EXISTS` before creating them to guard against leftover state from failed runs. Add indexes to temporary tables when subsequent joins use them as the driving table. Drop temporary tables explicitly at procedure end as a best practice, even though they are cleaned up automatically at session end.
