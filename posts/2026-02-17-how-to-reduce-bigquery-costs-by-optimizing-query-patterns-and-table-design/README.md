# How to Reduce BigQuery Costs by Optimizing Query Patterns and Table Design

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Cost Optimization, Query Optimization, Table Design

Description: Learn practical techniques to reduce BigQuery costs through smarter query patterns, table partitioning, clustering, and data lifecycle management.

---

BigQuery costs can creep up fast if you are not paying attention to how your queries scan data and how your tables are structured. On-demand pricing charges per byte processed, so every unnecessary column selected or unfiltered partition scanned translates directly into higher bills. The good news is that most cost optimization in BigQuery comes down to a handful of patterns that are straightforward to implement.

In this post, I will cover the most impactful techniques for reducing BigQuery costs, from query-level optimizations to table design decisions.

## Stop Using SELECT *

This is the most obvious optimization, but it still catches people. BigQuery is a columnar storage system, which means it only reads the columns you reference in your query. When you write SELECT *, it reads every column in the table, even if you only need three of them.

```sql
-- Bad: Reads all columns, even the ones you do not need
SELECT * FROM `my_project.analytics.events`
WHERE DATE(timestamp) = '2026-02-15';

-- Good: Only reads the specific columns needed
SELECT
  user_id,
  event_type,
  timestamp
FROM `my_project.analytics.events`
WHERE DATE(timestamp) = '2026-02-15';
```

On a table with 50 columns where you only need 3, this can reduce the data scanned by 90% or more. Make it a habit to always specify column names explicitly.

## Use Partition Filters

If your tables are partitioned (and they should be), always include a filter on the partition column. Without a partition filter, BigQuery scans every partition, which is equivalent to scanning the entire table.

```sql
-- Bad: No partition filter, scans entire table
SELECT user_id, event_type
FROM `my_project.analytics.events`
WHERE event_type = 'purchase';

-- Good: Partition filter limits scan to relevant date range
SELECT user_id, event_type
FROM `my_project.analytics.events`
WHERE DATE(timestamp) = '2026-02-15'
  AND event_type = 'purchase';
```

You can enforce partition filters at the table level so that queries without them fail instead of running.

```sql
-- Create a table that requires partition filters
CREATE TABLE `my_project.analytics.events`
(
  user_id STRING,
  event_type STRING,
  timestamp TIMESTAMP
)
PARTITION BY DATE(timestamp)
OPTIONS(
  -- Queries without partition filter will be rejected
  require_partition_filter = TRUE
);
```

## Design Tables with Clustering

Clustering organizes data within each partition based on the values of specified columns. When you filter on clustered columns, BigQuery can skip blocks of data that do not match, reducing the amount scanned.

```sql
-- Create a partitioned and clustered table
CREATE OR REPLACE TABLE `my_project.analytics.events_optimized`
PARTITION BY DATE(timestamp)
-- Cluster by the columns you most frequently filter on
CLUSTER BY user_id, event_type
AS
SELECT * FROM `my_project.analytics.events`;
```

The order of clustering columns matters. Put the most frequently filtered column first. BigQuery clusters data left to right, so the first column gets the best clustering benefit.

## Use Materialized Views for Repeated Queries

If multiple dashboards or reports run similar aggregations on the same data, a materialized view computes the result once and serves it from cache.

```sql
-- Create a materialized view for a common aggregation
CREATE MATERIALIZED VIEW `my_project.analytics.daily_event_summary`
AS
SELECT
  DATE(timestamp) AS event_date,
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM
  `my_project.analytics.events`
GROUP BY
  event_date, event_type;
```

When a query matches the materialized view pattern, BigQuery automatically uses it instead of scanning the base table. The materialized view is refreshed incrementally as new data arrives, so you get fresh results without full re-computation.

## Avoid Repeated Subqueries with CTEs

Repeated subqueries cause BigQuery to scan the same data multiple times. Use CTEs (Common Table Expressions) to read data once and reference it multiple times.

```sql
-- Bad: Same subquery scanned twice
SELECT
  (SELECT COUNT(*) FROM `my_project.analytics.events`
   WHERE DATE(timestamp) = '2026-02-15') AS total_events,
  (SELECT COUNT(DISTINCT user_id) FROM `my_project.analytics.events`
   WHERE DATE(timestamp) = '2026-02-15') AS unique_users;

-- Good: CTE reads data once, used in multiple calculations
WITH daily_events AS (
  SELECT user_id, event_type
  FROM `my_project.analytics.events`
  WHERE DATE(timestamp) = '2026-02-15'
)
SELECT
  COUNT(*) AS total_events,
  COUNT(DISTINCT user_id) AS unique_users
FROM daily_events;
```

## Use Approximate Aggregation Functions

When exact counts are not necessary, approximate functions process significantly less data.

```sql
-- Exact distinct count - more expensive
SELECT COUNT(DISTINCT user_id) AS exact_unique_users
FROM `my_project.analytics.events`
WHERE DATE(timestamp) BETWEEN '2026-01-01' AND '2026-01-31';

-- Approximate distinct count - cheaper and usually close enough
SELECT APPROX_COUNT_DISTINCT(user_id) AS approx_unique_users
FROM `my_project.analytics.events`
WHERE DATE(timestamp) BETWEEN '2026-01-01' AND '2026-01-31';
```

APPROX_COUNT_DISTINCT is typically within 1-2% of the exact count and uses far less memory and compute.

## Set Table Expiration for Temporary Data

Staging tables, intermediate results, and test data should not live forever. Set expiration times so they are automatically cleaned up.

```sql
-- Create a table that expires after 7 days
CREATE TABLE `my_project.staging.temp_analysis`
OPTIONS(
  expiration_timestamp = TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
)
AS
SELECT * FROM `my_project.analytics.events`
WHERE DATE(timestamp) = '2026-02-15';
```

You can also set a default expiration on the entire dataset.

```bash
# Set default table expiration for a dataset to 30 days
bq update --default_table_expiration=2592000 my_project:staging
```

## Use Long-Term Storage Pricing

BigQuery automatically reduces the storage price for tables that have not been modified in 90 days. You do not need to do anything to enable this - it happens automatically. But you can take advantage of it by designing your data pipeline to append to tables rather than overwriting them, since modifications reset the 90-day clock.

```sql
-- Good: Append new data to existing table (preserves long-term pricing for old data)
INSERT INTO `my_project.analytics.events`
SELECT * FROM `my_project.staging.new_events`;

-- Avoid: Recreating the table resets long-term storage pricing
CREATE OR REPLACE TABLE `my_project.analytics.events` AS
SELECT * FROM `my_project.staging.combined_events`;
```

## Limit Data with WHERE Clauses Early

In complex queries with multiple joins, filter data as early as possible to reduce the amount of data flowing through the query.

```sql
-- Better: Filter early in each subquery before joining
WITH recent_events AS (
  SELECT user_id, event_type, timestamp
  FROM `my_project.analytics.events`
  -- Filter to reduce data volume before the join
  WHERE DATE(timestamp) = '2026-02-15'
),
active_users AS (
  SELECT user_id, subscription_tier
  FROM `my_project.analytics.users`
  -- Only get users we actually need
  WHERE status = 'active'
)
SELECT
  e.event_type,
  u.subscription_tier,
  COUNT(*) AS event_count
FROM recent_events e
JOIN active_users u ON e.user_id = u.user_id
GROUP BY e.event_type, u.subscription_tier;
```

## Monitor and Review Costs Regularly

Set up a regular cost review process using INFORMATION_SCHEMA.

```sql
-- Weekly cost summary by user and project
SELECT
  user_email,
  project_id,
  COUNT(*) AS query_count,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4), 4) AS tb_processed,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4) * 6.25, 2) AS estimated_cost_usd
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY
  user_email, project_id
ORDER BY
  estimated_cost_usd DESC;
```

## Wrapping Up

BigQuery cost optimization is not about any single technique but about building good habits across your team. Always specify columns, always use partition filters, design tables with partitioning and clustering, use materialized views for repeated queries, and clean up temporary data. These practices compound over time - a team that follows them consistently will spend a fraction of what a team that does not. The best part is that most of these optimizations also make queries faster, so you get better performance and lower costs simultaneously.
