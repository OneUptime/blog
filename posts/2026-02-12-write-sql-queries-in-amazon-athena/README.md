# How to Write SQL Queries in Amazon Athena

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Athena, SQL, Analytics, S3

Description: Practical guide to writing SQL queries in Amazon Athena, covering syntax, data types, joins, window functions, CTEs, and common query patterns.

---

Amazon Athena uses Trino (formerly Presto) as its SQL engine, which means you get a rich SQL dialect with some quirks that differ from what you might be used to in MySQL or PostgreSQL. If you've already got Athena set up and pointed at your S3 data, this guide will help you write effective queries.

If you haven't set up Athena yet, start with our [setup guide](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-athena-for-querying-s3-data/view) first.

## Basic Queries

The fundamentals work exactly like you'd expect:

```sql
-- Basic select with filtering and sorting
SELECT
    user_id,
    event_type,
    timestamp
FROM analytics.events
WHERE event_type = 'purchase'
    AND timestamp >= TIMESTAMP '2025-01-01 00:00:00'
ORDER BY timestamp DESC
LIMIT 100;
```

## Data Types to Know

Athena supports a range of data types, but some behave differently than other databases:

```sql
-- Working with different data types in Athena
SELECT
    CAST('2025-01-15' AS DATE) as date_value,
    CAST('2025-01-15 10:30:00' AS TIMESTAMP) as timestamp_value,
    CAST('123' AS INTEGER) as int_value,
    CAST('45.67' AS DOUBLE) as double_value,
    CAST('true' AS BOOLEAN) as bool_value;
```

**String operations** use single quotes for values. Double quotes are for identifiers (column or table names with special characters).

**Dates and timestamps** are particularly important since most analytical queries involve time ranges:

```sql
-- Date and timestamp functions
SELECT
    current_date as today,
    current_timestamp as now,
    date_add('day', -7, current_date) as week_ago,
    date_diff('hour', TIMESTAMP '2025-01-01', current_timestamp) as hours_since_newyear,
    date_trunc('month', current_date) as first_of_month,
    year(current_date) as current_year,
    month(current_date) as current_month,
    day_of_week(current_date) as weekday;
```

## Aggregations

Standard aggregation functions are all there:

```sql
-- Aggregation examples
SELECT
    product_category,
    COUNT(*) as total_orders,
    COUNT(DISTINCT customer_id) as unique_customers,
    SUM(order_total) as revenue,
    AVG(order_total) as avg_order_value,
    MIN(order_total) as min_order,
    MAX(order_total) as max_order,
    APPROX_DISTINCT(customer_id) as approx_unique_customers
FROM analytics.orders
WHERE order_date >= DATE '2025-01-01'
GROUP BY product_category
HAVING COUNT(*) > 100
ORDER BY revenue DESC;
```

Note `APPROX_DISTINCT` - it's much faster than `COUNT(DISTINCT)` on large datasets and is accurate to within about 2.3%. Use it when you need approximate counts and speed matters more than exact precision.

## String Functions

Athena has a solid set of string manipulation functions:

```sql
-- Common string operations
SELECT
    LOWER(email) as email_lower,
    UPPER(name) as name_upper,
    TRIM(address) as address_trimmed,
    LENGTH(description) as desc_length,
    SUBSTR(phone_number, 1, 3) as area_code,
    REPLACE(url, 'http://', 'https://') as secure_url,
    SPLIT(tags, ',') as tag_array,
    REGEXP_LIKE(email, '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$') as valid_email,
    REGEXP_EXTRACT(log_line, 'status=(\d+)', 1) as status_code
FROM analytics.users;
```

`REGEXP_EXTRACT` is particularly useful when parsing semi-structured data like log files.

## Working with JSON

If your data has JSON columns, Athena provides functions to extract values:

```sql
-- Extract values from JSON strings
SELECT
    json_extract_scalar(payload, '$.user.name') as user_name,
    json_extract_scalar(payload, '$.action') as action,
    CAST(json_extract_scalar(payload, '$.amount') AS DOUBLE) as amount,
    json_array_length(json_extract(payload, '$.items')) as item_count
FROM analytics.raw_events
WHERE json_extract_scalar(payload, '$.action') = 'purchase';
```

For nested arrays, use `UNNEST`:

```sql
-- Flatten a JSON array into rows
SELECT
    event_id,
    item.product_id,
    item.quantity
FROM analytics.orders
CROSS JOIN UNNEST(items) AS t(item);
```

## Joins

Athena supports all standard join types:

```sql
-- Join orders with customer data
SELECT
    o.order_id,
    o.order_date,
    o.total_amount,
    c.name as customer_name,
    c.email
FROM analytics.orders o
INNER JOIN analytics.customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= DATE '2025-01-01';
```

**Performance tip**: When joining large tables, make sure the join keys are the same data type. Implicit type casting during joins is slow. Also, put the larger table on the left side of the join.

```sql
-- Left join to find customers with no orders
SELECT
    c.customer_id,
    c.name,
    c.signup_date,
    COUNT(o.order_id) as order_count
FROM analytics.customers c
LEFT JOIN analytics.orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name, c.signup_date
HAVING COUNT(o.order_id) = 0;
```

## Common Table Expressions (CTEs)

CTEs make complex queries readable. They're essentially named subqueries:

```sql
-- Use CTEs to break down a complex analysis
WITH monthly_revenue AS (
    SELECT
        date_trunc('month', order_date) as month,
        SUM(total_amount) as revenue
    FROM analytics.orders
    WHERE order_date >= DATE '2024-01-01'
    GROUP BY date_trunc('month', order_date)
),
revenue_with_growth AS (
    SELECT
        month,
        revenue,
        LAG(revenue) OVER (ORDER BY month) as prev_month_revenue
    FROM monthly_revenue
)
SELECT
    month,
    revenue,
    prev_month_revenue,
    ROUND((revenue - prev_month_revenue) / prev_month_revenue * 100, 2) as growth_pct
FROM revenue_with_growth
WHERE prev_month_revenue IS NOT NULL
ORDER BY month;
```

## Window Functions

Window functions are incredibly powerful for analytics:

```sql
-- Window functions for running totals and rankings
SELECT
    order_date,
    customer_id,
    total_amount,
    -- Running total per customer
    SUM(total_amount) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
    ) as cumulative_spend,
    -- Rank within each customer's orders
    ROW_NUMBER() OVER (
        PARTITION BY customer_id
        ORDER BY total_amount DESC
    ) as order_rank,
    -- Moving average over last 7 days
    AVG(total_amount) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_7d
FROM analytics.orders
ORDER BY customer_id, order_date;
```

Common window functions:
- `ROW_NUMBER()` - Sequential number within a partition
- `RANK()` / `DENSE_RANK()` - Ranking with/without gaps
- `LAG()` / `LEAD()` - Access previous/next row values
- `FIRST_VALUE()` / `LAST_VALUE()` - First/last value in a window
- `NTILE(n)` - Divide rows into n equal groups

## CASE Expressions

```sql
-- Categorize data with CASE expressions
SELECT
    order_id,
    total_amount,
    CASE
        WHEN total_amount >= 500 THEN 'high_value'
        WHEN total_amount >= 100 THEN 'medium_value'
        ELSE 'low_value'
    END as order_tier,
    CASE status
        WHEN 'delivered' THEN 'complete'
        WHEN 'shipped' THEN 'in_transit'
        WHEN 'processing' THEN 'pending'
        ELSE 'unknown'
    END as status_group
FROM analytics.orders;
```

## Creating Views

Views save query definitions so you don't have to rewrite them:

```sql
-- Create a view for frequently used aggregation
CREATE OR REPLACE VIEW analytics.daily_sales_summary AS
SELECT
    DATE(order_date) as sale_date,
    COUNT(*) as order_count,
    COUNT(DISTINCT customer_id) as unique_customers,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value
FROM analytics.orders
GROUP BY DATE(order_date);
```

Then query the view like a table:

```sql
-- Query the view
SELECT * FROM analytics.daily_sales_summary
WHERE sale_date >= DATE '2025-01-01'
ORDER BY sale_date;
```

## CTAS - Creating Tables from Query Results

Create Table As Select (CTAS) lets you materialize query results as a new table:

```sql
-- Create a new table from query results in Parquet format
CREATE TABLE analytics.high_value_customers
WITH (
    format = 'PARQUET',
    external_location = 's3://my-data-bucket/derived/high_value_customers/'
) AS
SELECT
    customer_id,
    COUNT(*) as total_orders,
    SUM(total_amount) as lifetime_value,
    MIN(order_date) as first_order,
    MAX(order_date) as last_order
FROM analytics.orders
GROUP BY customer_id
HAVING SUM(total_amount) > 1000;
```

This is incredibly useful for creating optimized derived datasets. The output is written to S3 in Parquet format, which subsequent queries can scan efficiently.

## INSERT INTO

Append data to existing tables:

```sql
-- Append query results to an existing table
INSERT INTO analytics.daily_metrics
SELECT
    current_date as report_date,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users
FROM analytics.events
WHERE DATE(event_time) = current_date - INTERVAL '1' DAY;
```

## Performance Tips

1. **Always filter on partition columns** when your table is partitioned
2. **Select only needed columns** - never use `SELECT *` on large datasets
3. **Use approximate functions** (`APPROX_DISTINCT`, `APPROX_PERCENTILE`) for large-scale analysis
4. **Avoid `ORDER BY` without `LIMIT`** on large result sets
5. **Use CTAS to pre-aggregate** frequently queried data

For detailed performance optimization, check out our guides on [partitioning](https://oneuptime.com/blog/post/2026-02-12-optimize-athena-query-performance-with-partitioning/view) and [columnar formats](https://oneuptime.com/blog/post/2026-02-12-optimize-athena-queries-with-column-formats-parquet-orc/view).

## Wrapping Up

Athena's SQL dialect is powerful and covers most analytical needs. The key differences from traditional databases are the schema-on-read approach, the importance of data organization for performance, and the pay-per-scan pricing model that rewards efficient queries. Master the basics, learn the window functions, and keep an eye on how much data your queries scan. That's the formula for effective Athena usage.
