# How to Transform Data with PIVOT and UNPIVOT in BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, SQL, PIVOT, Data Transformation

Description: Learn how to use PIVOT and UNPIVOT operators in BigQuery to reshape data between row-based and column-based formats for reporting and analysis.

---

Reshaping data between rows and columns is one of those tasks that comes up constantly in data analysis and reporting. You have sales data with one row per transaction and need it pivoted into columns by month. Or you have a wide table with separate columns for each metric and need to unpivot it into rows. BigQuery supports both PIVOT and UNPIVOT as native SQL operators, and they are far cleaner than the old approach of writing CASE statements by hand.

## The Problem PIVOT Solves

Consider a table with quarterly revenue by department:

```sql
-- Sample data: one row per department per quarter
-- We want to transform this into columns, one per quarter
SELECT * FROM UNNEST([
  STRUCT('Engineering' AS department, 'Q1' AS quarter, 500000 AS revenue),
  STRUCT('Engineering', 'Q2', 550000),
  STRUCT('Engineering', 'Q3', 600000),
  STRUCT('Engineering', 'Q4', 700000),
  STRUCT('Sales', 'Q1', 300000),
  STRUCT('Sales', 'Q2', 350000),
  STRUCT('Sales', 'Q3', 400000),
  STRUCT('Sales', 'Q4', 450000)
]);
```

This gives you 8 rows. But for a report, you probably want one row per department with columns for each quarter.

## Basic PIVOT

Here is how to pivot that data:

```sql
-- Pivot quarterly revenue into columns
-- Each quarter value becomes its own column
SELECT *
FROM (
  SELECT department, quarter, revenue
  FROM `my_project.finance.quarterly_revenue`
)
PIVOT (
  SUM(revenue)              -- Aggregation to apply
  FOR quarter               -- Column whose values become new column names
  IN ('Q1', 'Q2', 'Q3', 'Q4')  -- Specific values to pivot on
);
```

The result looks like:

| department  | Q1     | Q2     | Q3     | Q4     |
|-------------|--------|--------|--------|--------|
| Engineering | 500000 | 550000 | 600000 | 700000 |
| Sales       | 300000 | 350000 | 400000 | 450000 |

## PIVOT with Custom Column Names

You can rename the pivoted columns using aliases:

```sql
-- Pivot with custom column aliases for cleaner output
SELECT *
FROM (
  SELECT department, quarter, revenue
  FROM `my_project.finance.quarterly_revenue`
)
PIVOT (
  SUM(revenue)
  FOR quarter
  IN ('Q1' AS q1_revenue,
      'Q2' AS q2_revenue,
      'Q3' AS q3_revenue,
      'Q4' AS q4_revenue)
);
```

## PIVOT with Multiple Aggregations

You can apply multiple aggregation functions in a single PIVOT:

```sql
-- Pivot with both SUM and COUNT aggregations
-- Gives you total revenue and number of transactions per quarter
SELECT *
FROM (
  SELECT department, quarter, revenue, transaction_id
  FROM `my_project.finance.transactions`
)
PIVOT (
  SUM(revenue) AS total_rev,
  COUNT(transaction_id) AS num_transactions
  FOR quarter
  IN ('Q1', 'Q2', 'Q3', 'Q4')
);
```

This produces columns like `Q1_total_rev`, `Q1_num_transactions`, `Q2_total_rev`, and so on.

## The Old Way: PIVOT with CASE Statements

Before native PIVOT support, you had to write it manually. For comparison, here is the equivalent using CASE:

```sql
-- Manual pivot using CASE - works but verbose and error-prone
SELECT
  department,
  SUM(CASE WHEN quarter = 'Q1' THEN revenue END) AS Q1,
  SUM(CASE WHEN quarter = 'Q2' THEN revenue END) AS Q2,
  SUM(CASE WHEN quarter = 'Q3' THEN revenue END) AS Q3,
  SUM(CASE WHEN quarter = 'Q4' THEN revenue END) AS Q4
FROM `my_project.finance.quarterly_revenue`
GROUP BY department;
```

The PIVOT operator is more concise and less error-prone, especially when you have many values to pivot on.

## Basic UNPIVOT

UNPIVOT does the reverse - it transforms columns into rows. This is useful when you receive data in a wide format and need to normalize it.

```sql
-- Source: wide table with one column per metric
-- We want to normalize this into rows
SELECT *
FROM (
  SELECT
    server_name,
    cpu_usage,
    memory_usage,
    disk_usage
  FROM `my_project.monitoring.server_metrics_wide`
)
UNPIVOT (
  metric_value                    -- New column for the values
  FOR metric_name                 -- New column for the original column names
  IN (cpu_usage, memory_usage, disk_usage)  -- Columns to unpivot
);
```

The result transforms something like:

| server_name | cpu_usage | memory_usage | disk_usage |
|-------------|-----------|--------------|------------|

Into:

| server_name | metric_name  | metric_value |
|-------------|-------------|--------------|
| web-1       | cpu_usage   | 45.2         |
| web-1       | memory_usage| 72.1         |
| web-1       | disk_usage  | 55.0         |

## UNPIVOT with Custom Names

You can rename the unpivoted values:

```sql
-- Unpivot with renamed metric names for cleaner output
SELECT *
FROM (
  SELECT server_name, cpu_usage, memory_usage, disk_usage
  FROM `my_project.monitoring.server_metrics_wide`
)
UNPIVOT (
  value
  FOR metric
  IN (
    cpu_usage AS 'CPU',
    memory_usage AS 'Memory',
    disk_usage AS 'Disk'
  )
);
```

## UNPIVOT Multiple Column Groups

You can unpivot multiple related columns together:

```sql
-- Unpivot paired columns (value + timestamp) together
SELECT *
FROM (
  SELECT
    server_name,
    cpu_value, cpu_timestamp,
    memory_value, memory_timestamp,
    disk_value, disk_timestamp
  FROM `my_project.monitoring.detailed_metrics`
)
UNPIVOT (
  (metric_value, measured_at)      -- Multiple value columns
  FOR metric_name
  IN (
    (cpu_value, cpu_timestamp) AS 'CPU',
    (memory_value, memory_timestamp) AS 'Memory',
    (disk_value, disk_timestamp) AS 'Disk'
  )
);
```

## Practical Example: Monthly Report Generation

Here is a real-world scenario combining PIVOT with other operations to generate a monthly report:

```sql
-- Generate a monthly revenue report with pivoted columns
-- Each month becomes a column, showing revenue by product category
WITH monthly_data AS (
  SELECT
    product_category,
    FORMAT_DATE('%b', order_date) AS month_name,
    EXTRACT(MONTH FROM order_date) AS month_num,
    SUM(revenue) AS total_revenue
  FROM `my_project.sales.orders`
  WHERE EXTRACT(YEAR FROM order_date) = 2025
  GROUP BY product_category, month_name, month_num
)
SELECT *
FROM monthly_data
PIVOT (
  SUM(total_revenue)
  FOR month_name
  IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')
)
ORDER BY product_category;
```

## Practical Example: Normalizing Survey Data

Survey data often arrives in a wide format with one column per question:

```sql
-- Transform wide survey data into a normalized format
-- for easier analysis and aggregation
SELECT *
FROM (
  SELECT
    respondent_id,
    survey_date,
    q1_satisfaction,
    q2_likelihood_to_recommend,
    q3_ease_of_use,
    q4_value_for_money
  FROM `my_project.surveys.responses_wide`
)
UNPIVOT (
  score
  FOR question
  IN (
    q1_satisfaction AS 'Overall Satisfaction',
    q2_likelihood_to_recommend AS 'Likelihood to Recommend',
    q3_ease_of_use AS 'Ease of Use',
    q4_value_for_money AS 'Value for Money'
  )
);
```

## Handling NULLs in UNPIVOT

By default, UNPIVOT excludes rows where the value is NULL. If you want to include NULLs, you need a workaround:

```sql
-- UNPIVOT excludes NULLs by default
-- Use COALESCE to replace NULLs with a sentinel value before unpivoting
SELECT
  server_name,
  metric,
  NULLIF(value, -999) AS value  -- Convert sentinel back to NULL
FROM (
  SELECT
    server_name,
    COALESCE(cpu_usage, -999) AS cpu_usage,
    COALESCE(memory_usage, -999) AS memory_usage,
    COALESCE(disk_usage, -999) AS disk_usage
  FROM `my_project.monitoring.server_metrics_wide`
)
UNPIVOT (
  value FOR metric
  IN (cpu_usage AS 'CPU', memory_usage AS 'Memory', disk_usage AS 'Disk')
);
```

## Performance Considerations

PIVOT and UNPIVOT are syntactic transformations that BigQuery applies during query planning. They do not add significant overhead compared to manually writing the equivalent SQL. However, pivoting on columns with many distinct values can produce very wide result sets, which affect how much data BigQuery needs to shuffle.

For dynamic pivoting where you do not know the values in advance, BigQuery does not support dynamic PIVOT (you must list the values explicitly in the IN clause). If you need dynamic columns, consider generating the SQL programmatically using a scripting language or BigQuery scripting.

PIVOT and UNPIVOT are essential tools for data transformation in BigQuery. They replace verbose CASE-based approaches with clean, readable syntax that makes your data reshaping intentions clear. Once you get comfortable with the syntax, you will find yourself reaching for them in reporting queries, ETL pipelines, and ad-hoc analysis alike.
