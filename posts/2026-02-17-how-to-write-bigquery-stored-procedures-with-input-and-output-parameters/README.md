# How to Write BigQuery Stored Procedures with Input and Output Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Stored Procedures, SQL, Data Engineering

Description: A practical guide to writing BigQuery stored procedures with input and output parameters for reusable data processing logic and complex business workflows.

---

Stored procedures in BigQuery let you bundle multiple SQL statements into a single callable unit. If you have been writing the same sequence of queries over and over - maybe a data cleanup followed by an aggregation followed by an insert - stored procedures let you wrap that into one reusable block with parameters.

I find them especially useful for data transformation pipelines that need to be run with different parameters, like processing data for different date ranges or regions.

## Basic Stored Procedure Syntax

Here is the simplest stored procedure - it takes no parameters and runs a fixed set of statements.

```sql
-- A basic stored procedure that refreshes a summary table
CREATE OR REPLACE PROCEDURE `my_project.my_dataset.refresh_daily_summary`()
BEGIN
  -- Delete existing data for today
  DELETE FROM `my_project.my_dataset.daily_summary`
  WHERE report_date = CURRENT_DATE();

  -- Insert fresh aggregated data
  INSERT INTO `my_project.my_dataset.daily_summary`
  SELECT
    CURRENT_DATE() AS report_date,
    region,
    COUNT(*) AS order_count,
    SUM(amount) AS total_revenue
  FROM `my_project.my_dataset.orders`
  WHERE order_date = CURRENT_DATE()
  GROUP BY region;
END;
```

Call it like this.

```sql
-- Execute the stored procedure
CALL `my_project.my_dataset.refresh_daily_summary`();
```

## Input Parameters

Input parameters let you make stored procedures flexible. You define them with a name, type, and optionally a default value.

```sql
-- Stored procedure with input parameters
-- Processes orders for a specific date range and region
CREATE OR REPLACE PROCEDURE `my_project.my_dataset.process_orders`(
  start_date DATE,
  end_date DATE,
  target_region STRING
)
BEGIN
  -- Clear existing data for the given range and region
  DELETE FROM `my_project.my_dataset.order_summary`
  WHERE report_date BETWEEN start_date AND end_date
    AND region = target_region;

  -- Insert new aggregated data
  INSERT INTO `my_project.my_dataset.order_summary`
  SELECT
    order_date AS report_date,
    region,
    product_category,
    COUNT(*) AS order_count,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_order_value
  FROM `my_project.my_dataset.orders`
  WHERE order_date BETWEEN start_date AND end_date
    AND region = target_region
  GROUP BY order_date, region, product_category;
END;
```

Call it with specific values.

```sql
-- Process US-West orders for January 2026
CALL `my_project.my_dataset.process_orders`(
  '2026-01-01',
  '2026-01-31',
  'US-West'
);
```

## Output Parameters

Output parameters let stored procedures return values back to the caller. Use the `OUT` keyword.

```sql
-- Stored procedure with output parameters
-- Returns the count and total revenue for a date range
CREATE OR REPLACE PROCEDURE `my_project.my_dataset.get_order_stats`(
  IN start_date DATE,
  IN end_date DATE,
  OUT total_orders INT64,
  OUT total_revenue NUMERIC
)
BEGIN
  -- Calculate aggregate statistics and assign to output parameters
  SET (total_orders, total_revenue) = (
    SELECT AS STRUCT
      COUNT(*),
      SUM(amount)
    FROM `my_project.my_dataset.orders`
    WHERE order_date BETWEEN start_date AND end_date
  );
END;
```

Call it and capture the output.

```sql
-- Declare variables to hold the output
DECLARE order_count INT64;
DECLARE revenue NUMERIC;

-- Call the procedure with output parameters
CALL `my_project.my_dataset.get_order_stats`(
  '2026-01-01',
  '2026-01-31',
  order_count,
  revenue
);

-- Use the returned values
SELECT
  order_count AS total_orders,
  revenue AS total_revenue;
```

## INOUT Parameters

INOUT parameters serve as both input and output. The caller passes a value in, and the procedure can modify it.

```sql
-- INOUT parameter example
-- Takes an initial budget and returns the remaining budget after allocation
CREATE OR REPLACE PROCEDURE `my_project.my_dataset.allocate_budget`(
  INOUT remaining_budget NUMERIC,
  IN region STRING
)
BEGIN
  DECLARE allocation NUMERIC;

  -- Calculate allocation for the region (10% of remaining budget)
  SET allocation = remaining_budget * 0.10;

  -- Record the allocation
  INSERT INTO `my_project.my_dataset.budget_allocations`
  VALUES (region, allocation, CURRENT_TIMESTAMP());

  -- Update the remaining budget
  SET remaining_budget = remaining_budget - allocation;
END;
```

```sql
-- Use the INOUT parameter
DECLARE budget NUMERIC DEFAULT 1000000;

CALL `my_project.my_dataset.allocate_budget`(budget, 'US-West');
SELECT budget;  -- Shows 900000

CALL `my_project.my_dataset.allocate_budget`(budget, 'US-East');
SELECT budget;  -- Shows 810000
```

## Error Handling in Stored Procedures

BigQuery stored procedures do not have TRY-CATCH blocks like some other databases, but you can use conditional logic and the `@@error` system variable pattern to handle errors gracefully.

A practical approach is to validate inputs before running the main logic.

```sql
-- Stored procedure with input validation
CREATE OR REPLACE PROCEDURE `my_project.my_dataset.safe_process_orders`(
  IN start_date DATE,
  IN end_date DATE,
  IN target_region STRING,
  OUT status STRING
)
BEGIN
  -- Validate inputs
  IF start_date IS NULL OR end_date IS NULL THEN
    SET status = 'ERROR: start_date and end_date must not be null';
    RETURN;
  END IF;

  IF start_date > end_date THEN
    SET status = 'ERROR: start_date must be before end_date';
    RETURN;
  END IF;

  IF DATE_DIFF(end_date, start_date, DAY) > 365 THEN
    SET status = 'ERROR: date range must not exceed 365 days';
    RETURN;
  END IF;

  -- Main processing logic
  DELETE FROM `my_project.my_dataset.order_summary`
  WHERE report_date BETWEEN start_date AND end_date
    AND region = target_region;

  INSERT INTO `my_project.my_dataset.order_summary`
  SELECT
    order_date AS report_date,
    region,
    product_category,
    COUNT(*) AS order_count,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_order_value
  FROM `my_project.my_dataset.orders`
  WHERE order_date BETWEEN start_date AND end_date
    AND region = target_region
  GROUP BY order_date, region, product_category;

  SET status = 'SUCCESS';
END;
```

## Using Temporary Tables in Stored Procedures

Stored procedures can create and use temporary tables for intermediate results. Temporary tables are automatically dropped when the procedure completes.

```sql
-- Procedure that uses temporary tables for complex multi-step processing
CREATE OR REPLACE PROCEDURE `my_project.my_dataset.generate_customer_report`(
  IN report_date DATE,
  OUT customers_processed INT64
)
BEGIN
  -- Step 1: Create temp table with customer order stats
  CREATE TEMP TABLE customer_orders AS
  SELECT
    customer_id,
    COUNT(*) AS order_count,
    SUM(amount) AS total_spent,
    MAX(order_date) AS last_order_date
  FROM `my_project.my_dataset.orders`
  WHERE order_date <= report_date
  GROUP BY customer_id;

  -- Step 2: Enrich with customer profile data
  CREATE TEMP TABLE enriched_customers AS
  SELECT
    co.customer_id,
    cp.customer_name,
    cp.region,
    co.order_count,
    co.total_spent,
    co.last_order_date,
    DATE_DIFF(report_date, co.last_order_date, DAY) AS days_since_last_order
  FROM customer_orders co
  JOIN `my_project.my_dataset.customer_profiles` cp
    ON co.customer_id = cp.customer_id;

  -- Step 3: Write the final report
  DELETE FROM `my_project.my_dataset.customer_report`
  WHERE report_date = report_date;

  INSERT INTO `my_project.my_dataset.customer_report`
  SELECT
    report_date,
    customer_id,
    customer_name,
    region,
    order_count,
    total_spent,
    last_order_date,
    days_since_last_order,
    CASE
      WHEN days_since_last_order <= 30 THEN 'active'
      WHEN days_since_last_order <= 90 THEN 'at_risk'
      ELSE 'churned'
    END AS customer_status
  FROM enriched_customers;

  -- Set the output parameter
  SET customers_processed = (SELECT COUNT(*) FROM enriched_customers);
END;
```

## Calling Stored Procedures from Other Procedures

You can nest stored procedure calls for modular designs.

```sql
-- Parent procedure that orchestrates multiple child procedures
CREATE OR REPLACE PROCEDURE `my_project.my_dataset.daily_pipeline`(
  IN pipeline_date DATE,
  OUT pipeline_status STRING
)
BEGIN
  DECLARE step_status STRING;
  DECLARE customer_count INT64;

  -- Step 1: Process orders
  CALL `my_project.my_dataset.safe_process_orders`(
    pipeline_date, pipeline_date, 'ALL', step_status
  );

  IF step_status != 'SUCCESS' THEN
    SET pipeline_status = CONCAT('Failed at step 1: ', step_status);
    RETURN;
  END IF;

  -- Step 2: Generate customer report
  CALL `my_project.my_dataset.generate_customer_report`(
    pipeline_date, customer_count
  );

  SET pipeline_status = CONCAT('SUCCESS: processed ', CAST(customer_count AS STRING), ' customers');
END;
```

## Best Practices

1. **Use descriptive parameter names**: Make it obvious what each parameter does. Prefix output parameters with something meaningful.

2. **Validate inputs early**: Check for nulls, invalid ranges, and edge cases at the start of the procedure.

3. **Keep procedures focused**: Each procedure should do one thing well. Use nested calls for complex workflows.

4. **Log procedure execution**: Insert a row into a logging table at the start and end of each procedure run so you can track execution history.

5. **Use temporary tables for intermediate results**: They are cleaned up automatically and keep your logic clear.

6. **Document your procedures**: Add comments explaining what the procedure does, what each parameter means, and any assumptions.

## Wrapping Up

BigQuery stored procedures bring procedural programming to your data warehouse. Input and output parameters make them flexible and reusable, while nested calls let you build modular data pipelines. They are not a replacement for tools like Cloud Composer or Dataflow for complex orchestration, but for SQL-centric workflows, they are a clean and effective solution.

To monitor the health of your stored procedure executions and the pipelines they power, [OneUptime](https://oneuptime.com) provides observability tools that can alert you when your data workflows fail or degrade.
