# How to Create BigQuery Table-Valued Functions for Reusable Query Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Table-Valued Functions, SQL, Code Reuse

Description: Learn how to create table-valued functions in BigQuery to encapsulate complex query logic into reusable, parameterized functions that return tables.

---

Regular UDFs in BigQuery take scalar inputs and return scalar values. But what if you want a reusable function that returns an entire table? That is what table-valued functions (TVFs) are for. They encapsulate a parameterized query that returns a result set, and you call them in the FROM clause of your SQL just like a table or view.

I use TVFs as parameterized views - they give you the reusability of views with the flexibility of accepting parameters.

## What Is a Table-Valued Function?

A TVF is a function that returns a TABLE. You define the query logic once, expose parameters for the parts that change, and then call it from any query. Think of it as a view that accepts arguments.

## Creating Your First TVF

Here is a simple TVF that returns orders for a given date range and region.

```sql
-- TVF that returns filtered and aggregated order data
-- Call it with specific parameters instead of writing the same query repeatedly
CREATE OR REPLACE TABLE FUNCTION `my_project.my_dataset.orders_summary`(
  start_date DATE,
  end_date DATE,
  target_region STRING
)
AS (
  SELECT
    order_date,
    region,
    product_category,
    COUNT(*) AS order_count,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_order_value,
    COUNT(DISTINCT customer_id) AS unique_customers
  FROM `my_project.my_dataset.orders`
  WHERE order_date BETWEEN start_date AND end_date
    AND region = target_region
  GROUP BY order_date, region, product_category
);
```

Call it in the FROM clause.

```sql
-- Use the TVF just like a table
SELECT *
FROM `my_project.my_dataset.orders_summary`('2026-01-01', '2026-01-31', 'US-West')
ORDER BY total_revenue DESC;
```

## TVFs vs Views

You might wonder why not just use views. Here is the difference.

A view has fixed logic with no parameters.

```sql
-- View: fixed logic, no parameters
CREATE VIEW `my_project.my_dataset.january_orders_view` AS
SELECT * FROM `my_project.my_dataset.orders`
WHERE order_date BETWEEN '2026-01-01' AND '2026-01-31'
  AND region = 'US-West';
```

A TVF accepts parameters, making it flexible.

```sql
-- TVF: same logic but parameterized
-- Works for any date range and any region
CREATE OR REPLACE TABLE FUNCTION `my_project.my_dataset.filtered_orders`(
  start_date DATE,
  end_date DATE,
  target_region STRING
)
AS (
  SELECT * FROM `my_project.my_dataset.orders`
  WHERE order_date BETWEEN start_date AND end_date
    AND region = target_region
);
```

TVFs are also better for partition pruning. When you pass a date parameter to a TVF, BigQuery can use it for partition elimination, which does not always work with views that have complex filter logic.

## Joining TVF Results

Since TVFs return tables, you can join them with other tables.

```sql
-- Join TVF results with another table
SELECT
  os.order_date,
  os.product_category,
  os.total_revenue,
  t.target_revenue,
  os.total_revenue - t.target_revenue AS variance
FROM `my_project.my_dataset.orders_summary`('2026-01-01', '2026-01-31', 'US-West') os
JOIN `my_project.my_dataset.revenue_targets` t
  ON os.product_category = t.product_category
  AND os.order_date = t.target_date;
```

## TVFs with Complex Logic

TVFs can contain complex queries with CTEs, window functions, and subqueries.

```sql
-- TVF with complex analytics logic
-- Returns customer cohort analysis for a given signup month
CREATE OR REPLACE TABLE FUNCTION `my_project.my_dataset.cohort_analysis`(
  cohort_month DATE
)
AS (
  WITH cohort_users AS (
    -- Get users who signed up in the given month
    SELECT
      user_id,
      DATE_TRUNC(signup_date, MONTH) AS cohort_date
    FROM `my_project.my_dataset.users`
    WHERE DATE_TRUNC(signup_date, MONTH) = cohort_month
  ),
  user_activity AS (
    -- Get monthly activity for cohort users
    SELECT
      cu.user_id,
      cu.cohort_date,
      DATE_TRUNC(a.activity_date, MONTH) AS activity_month,
      DATE_DIFF(DATE_TRUNC(a.activity_date, MONTH), cu.cohort_date, MONTH) AS months_since_signup
    FROM cohort_users cu
    JOIN `my_project.my_dataset.user_activity` a
      ON cu.user_id = a.user_id
    WHERE a.activity_date >= cohort_month
  )
  SELECT
    cohort_date,
    months_since_signup,
    COUNT(DISTINCT user_id) AS active_users,
    (SELECT COUNT(*) FROM cohort_users) AS cohort_size,
    ROUND(COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM cohort_users), 2) AS retention_pct
  FROM user_activity
  GROUP BY cohort_date, months_since_signup
);
```

```sql
-- Analyze retention for the January 2026 cohort
SELECT *
FROM `my_project.my_dataset.cohort_analysis`('2026-01-01')
ORDER BY months_since_signup;
```

## TVFs for Data Access Patterns

TVFs are excellent for standardizing how teams access data. Instead of having everyone write their own queries, you provide TVFs that encode the correct business logic and access patterns.

```sql
-- TVF for getting active customer metrics
-- Encapsulates the definition of "active" and the correct metric calculations
CREATE OR REPLACE TABLE FUNCTION `my_project.my_dataset.active_customer_metrics`(
  as_of_date DATE,
  activity_window_days INT64
)
AS (
  SELECT
    c.customer_id,
    c.customer_name,
    c.region,
    c.signup_date,
    COUNT(DISTINCT o.order_id) AS orders_in_window,
    SUM(o.amount) AS revenue_in_window,
    MAX(o.order_date) AS last_order_date,
    DATE_DIFF(as_of_date, MAX(o.order_date), DAY) AS days_since_last_order
  FROM `my_project.my_dataset.customers` c
  JOIN `my_project.my_dataset.orders` o
    ON c.customer_id = o.customer_id
  WHERE o.order_date BETWEEN DATE_SUB(as_of_date, INTERVAL activity_window_days DAY) AND as_of_date
  GROUP BY c.customer_id, c.customer_name, c.region, c.signup_date
  HAVING COUNT(DISTINCT o.order_id) >= 1
);
```

```sql
-- Get active customers with a 90-day window as of today
SELECT *
FROM `my_project.my_dataset.active_customer_metrics`(CURRENT_DATE(), 90)
WHERE region = 'US-West'
ORDER BY revenue_in_window DESC;
```

## TVFs with Optional-Style Filtering

Since TVFs do not support default parameter values, you can use a pattern where NULL means "no filter".

```sql
-- TVF with optional filtering using NULL to mean "all"
CREATE OR REPLACE TABLE FUNCTION `my_project.my_dataset.search_events`(
  start_date DATE,
  end_date DATE,
  event_type_filter STRING,
  user_id_filter INT64
)
AS (
  SELECT
    event_id,
    user_id,
    event_type,
    event_date,
    event_timestamp,
    properties
  FROM `my_project.my_dataset.events`
  WHERE event_date BETWEEN start_date AND end_date
    AND (event_type_filter IS NULL OR event_type = event_type_filter)
    AND (user_id_filter IS NULL OR user_id = user_id_filter)
);
```

```sql
-- Search for all event types for a specific user
SELECT *
FROM `my_project.my_dataset.search_events`('2026-02-01', '2026-02-17', NULL, 12345);

-- Search for click events for all users
SELECT *
FROM `my_project.my_dataset.search_events`('2026-02-01', '2026-02-17', 'click', NULL);

-- Search for click events for a specific user
SELECT *
FROM `my_project.my_dataset.search_events`('2026-02-01', '2026-02-17', 'click', 12345);
```

## Nesting TVF Calls

You can use one TVF's output as input to another query or even nest TVF calls.

```sql
-- Use a TVF result in a subquery
SELECT
  region,
  AVG(revenue_in_window) AS avg_customer_revenue,
  COUNT(*) AS active_customer_count
FROM `my_project.my_dataset.active_customer_metrics`(CURRENT_DATE(), 30)
GROUP BY region
ORDER BY avg_customer_revenue DESC;
```

## Managing TVFs

List all TVFs in a dataset using INFORMATION_SCHEMA.

```sql
-- Find all table-valued functions in a dataset
SELECT
  routine_name,
  routine_type,
  routine_definition,
  created,
  last_altered
FROM `my_project.my_dataset.INFORMATION_SCHEMA.ROUTINES`
WHERE routine_type = 'TABLE_FUNCTION'
ORDER BY routine_name;
```

Drop a TVF when it is no longer needed.

```sql
-- Drop a table-valued function
DROP TABLE FUNCTION IF EXISTS `my_project.my_dataset.orders_summary`;
```

## Best Practices

1. **Use TVFs for parameterized access patterns**: If multiple queries share the same structure but different filter values, a TVF is the right abstraction.

2. **Keep partition columns as parameters**: When your base table is partitioned, make the partition column a TVF parameter. This ensures partition pruning works correctly.

3. **Document parameters in comments**: Add SQL comments explaining what each parameter does and what valid values look like.

4. **Test with EXPLAIN**: Check query plans to verify that partition pruning and other optimizations work through the TVF.

5. **Share via a common dataset**: Like regular UDFs, put shared TVFs in a dedicated dataset with appropriate permissions.

## Wrapping Up

Table-valued functions are one of the most underused features in BigQuery. They let you build a library of reusable, parameterized queries that your whole team can use. Instead of copying and modifying the same SQL over and over, you call a function with the right parameters. This reduces errors, ensures consistency, and makes it easier to update business logic in one place.

For monitoring the performance of your BigQuery queries and the pipelines that use TVFs, [OneUptime](https://oneuptime.com) provides observability tools to track query costs and execution times.
