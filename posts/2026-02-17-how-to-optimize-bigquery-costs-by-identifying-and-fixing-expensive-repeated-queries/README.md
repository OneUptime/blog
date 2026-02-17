# How to Optimize BigQuery Costs by Identifying and Fixing Expensive Repeated Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Cost Optimization, Query Optimization, INFORMATION_SCHEMA, FinOps

Description: Identify and fix expensive repeated BigQuery queries that drive up costs, using INFORMATION_SCHEMA analysis, caching strategies, and materialized views.

---

BigQuery on-demand pricing charges $6.25 per TB of data processed. That sounds reasonable until you realize that a single poorly written query scanning a 10 TB table costs $62.50, and if that query runs every hour, it costs $1,500 per day. The most impactful way to reduce your BigQuery bill is to find these expensive repeated queries and fix them.

I have helped teams cut their BigQuery costs by 50-80% just by identifying and optimizing their top 10 most expensive queries. Here is the exact process I follow.

## Step 1 - Find Your Most Expensive Queries

Start with INFORMATION_SCHEMA to identify which queries are costing you the most.

```sql
-- Top 20 most expensive queries in the last 30 days
SELECT
  user_email,
  SUBSTR(query, 1, 200) as query_preview,
  COUNT(*) as execution_count,
  SUM(total_bytes_billed) / POWER(1024, 4) as total_tb_billed,
  SUM(total_bytes_billed) / POWER(1024, 4) * 6.25 as estimated_cost_usd,
  AVG(total_bytes_billed) / POWER(1024, 3) as avg_gb_per_execution,
  AVG(TIMESTAMP_DIFF(end_time, start_time, SECOND)) as avg_duration_seconds
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND total_bytes_billed > 0
GROUP BY user_email, query_preview
ORDER BY total_tb_billed DESC
LIMIT 20;
```

This immediately shows you where the money is going. You might find that 5 queries account for 80% of your costs.

## Step 2 - Identify Repeated Queries

Many expensive queries are the same query running on a schedule or being triggered by a dashboard refresh.

```sql
-- Find queries that run frequently and process a lot of data
SELECT
  -- Normalize the query by removing whitespace and parameters
  REGEXP_REPLACE(SUBSTR(query, 1, 500), r'\s+', ' ') as normalized_query,
  COUNT(*) as run_count,
  SUM(total_bytes_billed) / POWER(1024, 4) as total_tb_billed,
  SUM(total_bytes_billed) / POWER(1024, 4) * 6.25 as estimated_cost_usd,
  MIN(creation_time) as first_run,
  MAX(creation_time) as last_run,
  ARRAY_AGG(DISTINCT user_email LIMIT 5) as users
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND total_bytes_billed > 0
GROUP BY normalized_query
HAVING run_count > 5
ORDER BY total_tb_billed DESC
LIMIT 20;
```

## Step 3 - Analyze Cost by User and Team

Understanding who is running expensive queries helps you target optimization efforts.

```sql
-- Cost breakdown by user over the last 30 days
SELECT
  user_email,
  COUNT(*) as query_count,
  SUM(total_bytes_billed) / POWER(1024, 4) as total_tb_billed,
  SUM(total_bytes_billed) / POWER(1024, 4) * 6.25 as estimated_cost_usd,
  AVG(total_bytes_billed) / POWER(1024, 3) as avg_gb_per_query,
  MAX(total_bytes_billed) / POWER(1024, 3) as max_gb_single_query
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY user_email
ORDER BY estimated_cost_usd DESC;
```

## Step 4 - Find Queries Without Partition Filters

Queries that scan entire tables without using partition filters are often the most expensive.

```sql
-- Find queries that scan large amounts of data without partition filters
SELECT
  job_id,
  user_email,
  total_bytes_billed / POWER(1024, 3) as gb_billed,
  SUBSTR(query, 1, 300) as query_preview,
  ARRAY(
    SELECT AS STRUCT t.table_id, t.dataset_id
    FROM UNNEST(referenced_tables) as t
  ) as tables_scanned
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND total_bytes_billed > 10 * POWER(1024, 3)  -- More than 10 GB
ORDER BY total_bytes_billed DESC
LIMIT 20;
```

## Fix 1 - Add Partition Filters

The single highest-impact optimization. If your tables are partitioned, always include partition-pruning filters.

```sql
-- Before: full table scan on a date-partitioned table ($62.50 for 10 TB)
SELECT user_id, COUNT(*) as events
FROM `my_dataset.events`
GROUP BY user_id;

-- After: scan only the last 30 days ($5.00 if recent data is ~800 GB)
SELECT user_id, COUNT(*) as events
FROM `my_dataset.events`
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY user_id;
```

You can enforce this at the table level to prevent full scans.

```sql
-- Require partition filters on a table
ALTER TABLE `my_dataset.events`
SET OPTIONS (require_partition_filter = true);
```

## Fix 2 - Use Materialized Views for Repeated Aggregations

If the same aggregation runs repeatedly, create a materialized view. BigQuery refreshes it automatically, and queries against it scan much less data.

```sql
-- Create a materialized view for a common dashboard query
CREATE MATERIALIZED VIEW `my_dataset.daily_user_stats`
OPTIONS (enable_refresh = true, refresh_interval_minutes = 60)
AS
SELECT
  DATE(event_timestamp) as day,
  user_segment,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as event_count,
  SUM(revenue) as total_revenue
FROM `my_dataset.events`
GROUP BY day, user_segment;

-- Dashboard queries now scan the small materialized view instead of the full table
SELECT * FROM `my_dataset.daily_user_stats`
WHERE day >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY);
```

## Fix 3 - Enable and Leverage Query Caching

BigQuery caches query results for 24 hours. If the same query runs multiple times with no changes to the underlying data, the cached result is returned at zero cost.

```sql
-- Check if queries are benefiting from the cache
SELECT
  cache_hit,
  COUNT(*) as query_count,
  SUM(total_bytes_billed) / POWER(1024, 4) as tb_billed,
  SUM(total_bytes_billed) / POWER(1024, 4) * 6.25 as cost_usd
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY cache_hit;
```

Caching is enabled by default, but it does not work when:
- The query uses non-deterministic functions like CURRENT_TIMESTAMP()
- The query is run with cache disabled
- The underlying table has changed since the last query

Fix non-deterministic queries by using explicit dates.

```sql
-- Bad: CURRENT_TIMESTAMP() prevents caching
SELECT * FROM `my_dataset.events`
WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR);

-- Better: use a fixed timestamp (refresh daily)
SELECT * FROM `my_dataset.events`
WHERE event_timestamp >= '2024-06-14 00:00:00 UTC';
```

## Fix 4 - Select Only Needed Columns

BigQuery is columnar - you only pay for the columns you read. Using SELECT * on a wide table is expensive.

```sql
-- Bad: SELECT * reads all 100 columns ($50 for a 10 TB table)
SELECT * FROM `my_dataset.wide_table`
WHERE created_at >= '2024-06-01';

-- Good: select only needed columns ($2 if the 4 columns are 400 GB total)
SELECT user_id, event_type, revenue, created_at
FROM `my_dataset.wide_table`
WHERE created_at >= '2024-06-01';
```

## Fix 5 - Use Clustered Tables

Clustering reduces the amount of data scanned when you filter on the cluster columns.

```sql
-- Create a clustered table
CREATE TABLE `my_dataset.events_clustered`
PARTITION BY DATE(event_timestamp)
CLUSTER BY user_id, event_type
AS SELECT * FROM `my_dataset.events`;

-- Queries filtering on cluster columns scan less data
SELECT COUNT(*)
FROM `my_dataset.events_clustered`
WHERE event_timestamp >= '2024-06-01'
  AND event_type = 'purchase';
```

## Fix 6 - Set Custom Quotas per User

Prevent individual users from running excessively expensive queries.

```bash
# Set a custom quota for a specific user (10 TB per day)
# This is configured through the Cloud Console or API
# Navigate to BigQuery > Admin > Quotas
```

You can also set project-level quotas.

```bash
# Request a quota adjustment for the project
gcloud alpha services quota update \
    --service=bigquery.googleapis.com \
    --consumer=project:my-project \
    --metric=bigquery.googleapis.com/quota/query/usage \
    --unit=1/d/{project} \
    --value=10995116277760  # 10 TB in bytes
```

## Fix 7 - Consider Flat-Rate Pricing

If your monthly on-demand costs exceed what flat-rate slots would cost, switching to reservations can save money and provide more predictable billing.

```sql
-- Estimate monthly costs to decide on pricing model
SELECT
  SUM(total_bytes_billed) / POWER(1024, 4) as total_tb_billed,
  SUM(total_bytes_billed) / POWER(1024, 4) * 6.25 as on_demand_cost
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE';
```

If your monthly on-demand cost exceeds $10,000-$15,000, flat-rate pricing is likely cheaper.

## Building a Cost Monitoring Dashboard

```sql
-- Daily cost trend for the last 30 days
SELECT
  DATE(creation_time) as day,
  COUNT(*) as query_count,
  SUM(total_bytes_billed) / POWER(1024, 4) as tb_billed,
  ROUND(SUM(total_bytes_billed) / POWER(1024, 4) * 6.25, 2) as estimated_cost_usd,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cached_queries,
  ROUND(SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as cache_hit_rate_pct
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY day
ORDER BY day DESC;
```

## Summary

The most effective way to reduce BigQuery costs is systematic: use INFORMATION_SCHEMA to find your most expensive and most frequent queries, then apply targeted fixes. The top optimizations - partition filters, column selection, materialized views, and query caching - can reduce costs by 50-80% in most organizations. Set up a regular cost monitoring query that runs weekly so you can catch expensive new queries before they blow up your bill.
