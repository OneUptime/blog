# How to Use Redshift Materialized Views

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Redshift, Data Warehouse, Performance

Description: Learn how to create and manage materialized views in Amazon Redshift to speed up expensive queries and simplify complex analytics pipelines.

---

If you're running the same expensive aggregation queries over and over, you're wasting compute. Materialized views store the precomputed results of a query and serve them instantly. Instead of scanning billions of rows every time someone asks for a daily revenue summary, Redshift reads from the materialized view in milliseconds.

## Materialized Views vs Regular Views

A regular view is just a saved query. Every time you select from it, Redshift runs the underlying query from scratch. A materialized view stores the actual results on disk. The tradeoff is freshness - materialized views need to be refreshed to pick up new data.

For dashboards, reports, and analytics that don't need real-time data, materialized views are a massive performance win.

## Creating a Basic Materialized View

Start with a simple aggregation that you query frequently.

Create a materialized view for daily sales metrics:

```sql
-- Precompute daily sales metrics
CREATE MATERIALIZED VIEW analytics.daily_sales AS
SELECT
    o.order_date,
    p.category,
    p.subcategory,
    COUNT(*) AS order_count,
    COUNT(DISTINCT o.customer_id) AS unique_customers,
    SUM(o.quantity) AS total_units,
    SUM(o.total_amount) AS total_revenue,
    AVG(o.total_amount) AS avg_order_value,
    MIN(o.total_amount) AS min_order_value,
    MAX(o.total_amount) AS max_order_value
FROM sales.orders o
JOIN sales.products p ON o.product_id = p.product_id
GROUP BY o.order_date, p.category, p.subcategory;
```

Now queries against `analytics.daily_sales` return instantly instead of scanning the entire orders table:

```sql
-- This runs in milliseconds instead of seconds/minutes
SELECT
    order_date,
    category,
    total_revenue,
    unique_customers
FROM analytics.daily_sales
WHERE order_date >= DATEADD(day, -30, CURRENT_DATE)
ORDER BY order_date DESC, total_revenue DESC;
```

## Auto-Refreshing Materialized Views

Redshift can automatically refresh materialized views when the underlying data changes:

```sql
-- Create with auto-refresh enabled
CREATE MATERIALIZED VIEW analytics.hourly_metrics
AUTO REFRESH YES
AS
SELECT
    DATE_TRUNC('hour', event_time) AS hour,
    event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users
FROM events.user_activity
GROUP BY DATE_TRUNC('hour', event_time), event_type;
```

Auto-refresh runs in the background when Redshift detects that the base tables have new data. It doesn't guarantee immediate freshness, but it keeps the view reasonably up to date without manual intervention.

## Manual Refresh

For more control, refresh manually or on a schedule:

```sql
-- Full refresh - recomputes the entire view
REFRESH MATERIALIZED VIEW analytics.daily_sales;

-- Check when the view was last refreshed
SELECT
    schema_name,
    mv_name,
    state,
    autorefresh,
    last_refresh_time
FROM svl_mv_refresh_status
WHERE mv_name = 'daily_sales'
ORDER BY last_refresh_time DESC
LIMIT 5;
```

## Incremental Refresh

Some materialized views support incremental refresh, which only processes new data instead of recomputing everything. This is much faster for large datasets.

Incremental refresh works automatically when:
- The view doesn't use certain operations (UNION, HAVING, external tables)
- The base tables have been loaded with COPY or INSERT

```sql
-- Check if a view supports incremental refresh
SELECT
    mv_name,
    is_incremental
FROM stv_mv_info
WHERE schema_name = 'analytics';
```

If `is_incremental` is true, REFRESH will only process the delta.

## Materialized View on Top of Materialized View

You can stack materialized views for multi-level aggregation:

```sql
-- Level 1: Daily metrics
CREATE MATERIALIZED VIEW analytics.daily_sales AS
SELECT
    order_date,
    product_id,
    SUM(total_amount) AS daily_revenue,
    COUNT(*) AS daily_orders
FROM sales.orders
GROUP BY order_date, product_id;

-- Level 2: Monthly rollup built on the daily view
CREATE MATERIALIZED VIEW analytics.monthly_sales AS
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(daily_revenue) AS monthly_revenue,
    SUM(daily_orders) AS monthly_orders,
    AVG(daily_revenue) AS avg_daily_revenue
FROM analytics.daily_sales
GROUP BY DATE_TRUNC('month', order_date);

-- Level 3: Yearly summary
CREATE MATERIALIZED VIEW analytics.yearly_sales AS
SELECT
    DATE_TRUNC('year', month) AS year,
    SUM(monthly_revenue) AS yearly_revenue,
    SUM(monthly_orders) AS yearly_orders
FROM analytics.monthly_sales
GROUP BY DATE_TRUNC('year', month);
```

When you refresh the daily view, the monthly and yearly views pick up the changes on their next refresh.

## Materialized Views for Dashboard Queries

Build materialized views specifically for your dashboard queries. This is one of the most practical use cases.

Create views that power a sales dashboard:

```sql
-- Revenue by region for the map widget
CREATE MATERIALIZED VIEW dashboard.revenue_by_region
AUTO REFRESH YES
AS
SELECT
    c.state,
    c.country,
    DATE_TRUNC('week', o.order_date) AS week,
    SUM(o.total_amount) AS revenue,
    COUNT(DISTINCT o.customer_id) AS customers
FROM sales.orders o
JOIN sales.customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= DATEADD(month, -6, CURRENT_DATE)
GROUP BY c.state, c.country, DATE_TRUNC('week', o.order_date);

-- Top products for the leaderboard widget
CREATE MATERIALIZED VIEW dashboard.top_products
AUTO REFRESH YES
AS
SELECT
    p.product_id,
    p.name,
    p.category,
    SUM(o.total_amount) AS total_revenue,
    SUM(o.quantity) AS total_units,
    COUNT(DISTINCT o.customer_id) AS buyer_count,
    RANK() OVER (ORDER BY SUM(o.total_amount) DESC) AS revenue_rank
FROM sales.orders o
JOIN sales.products p ON o.product_id = p.product_id
WHERE o.order_date >= DATEADD(day, -30, CURRENT_DATE)
GROUP BY p.product_id, p.name, p.category;

-- Customer cohort analysis
CREATE MATERIALIZED VIEW dashboard.customer_cohorts
AUTO REFRESH YES
AS
WITH first_purchase AS (
    SELECT
        customer_id,
        DATE_TRUNC('month', MIN(order_date)) AS cohort_month
    FROM sales.orders
    GROUP BY customer_id
)
SELECT
    fp.cohort_month,
    DATE_TRUNC('month', o.order_date) AS activity_month,
    DATEDIFF(month, fp.cohort_month, DATE_TRUNC('month', o.order_date)) AS months_since_first,
    COUNT(DISTINCT o.customer_id) AS active_customers,
    SUM(o.total_amount) AS revenue
FROM sales.orders o
JOIN first_purchase fp ON o.customer_id = fp.customer_id
GROUP BY fp.cohort_month, DATE_TRUNC('month', o.order_date);
```

## Performance Comparison

Let's look at the actual performance difference. This query takes 15 seconds on the raw table but returns in 200ms from the materialized view:

```sql
-- Without materialized view: ~15 seconds
EXPLAIN
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) AS orders,
    SUM(total_amount) AS revenue
FROM sales.orders
WHERE order_date >= '2025-01-01'
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;

-- With materialized view: ~200ms
EXPLAIN
SELECT month, monthly_orders, monthly_revenue
FROM analytics.monthly_sales
WHERE month >= '2025-01-01'
ORDER BY month;
```

## Managing Materialized Views

Useful operations for managing your views:

```sql
-- List all materialized views
SELECT
    schemaname,
    matviewname,
    matviewowner
FROM pg_matviews
ORDER BY schemaname, matviewname;

-- Check view definitions
SELECT
    schemaname,
    matviewname,
    definition
FROM pg_matviews
WHERE matviewname = 'daily_sales';

-- Drop a materialized view
DROP MATERIALIZED VIEW IF EXISTS analytics.daily_sales CASCADE;
-- CASCADE drops dependent views too

-- Alter auto-refresh setting
ALTER MATERIALIZED VIEW analytics.daily_sales
AUTO REFRESH YES;
```

## Scheduling Refresh

Use a stored procedure and the Redshift scheduler to refresh views on a schedule:

```sql
-- Create a procedure to refresh all analytics views
CREATE OR REPLACE PROCEDURE analytics.refresh_all_views()
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW analytics.daily_sales;
    REFRESH MATERIALIZED VIEW analytics.monthly_sales;
    REFRESH MATERIALIZED VIEW analytics.yearly_sales;
    REFRESH MATERIALIZED VIEW dashboard.revenue_by_region;
    REFRESH MATERIALIZED VIEW dashboard.top_products;
    RAISE INFO 'All materialized views refreshed';
END;
$$ LANGUAGE plpgsql;

-- Schedule it to run every hour
-- (Using Redshift Data API from a Lambda triggered by EventBridge)
```

Automate the refresh with a Lambda function:

```python
import boto3

redshift_data = boto3.client("redshift-data")


def lambda_handler(event, context):
    """Scheduled refresh of materialized views."""
    response = redshift_data.execute_statement(
        WorkgroupName="analytics-workgroup",
        Database="analytics_db",
        Sql="CALL analytics.refresh_all_views();",
    )

    print(f"Refresh started: {response['Id']}")
    return {"statement_id": response["Id"]}
```

## Limitations to Know

A few constraints to be aware of:

- Materialized views can't include external tables (Spectrum) in auto-refresh mode
- Some SQL features aren't supported: UNION, EXCEPT, INTERSECT, HAVING (with some exceptions)
- Interleaved sort keys aren't supported on materialized views
- Late binding views (`WITH NO SCHEMA BINDING`) can't be materialized
- Incremental refresh has its own restrictions on which SQL patterns are supported

For monitoring the performance of your materialized views and alerting on refresh failures, see our post on [data warehouse monitoring](https://oneuptime.com/blog/post/aws-cloudwatch-dashboards/view).

## Wrapping Up

Materialized views are one of the simplest ways to speed up your Redshift analytics. Create them for your most common aggregation queries, enable auto-refresh for convenience, and stack them for multi-level rollups. The performance improvement is dramatic - queries that took seconds drop to milliseconds. Just remember that the data isn't real-time; there's always a lag between the base table update and the next refresh.
