# How to Combine Partitioning and Clustering in BigQuery for Maximum Cost Savings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Partitioning, Clustering, Cost Optimization

Description: Learn how to combine partitioning and clustering in BigQuery to achieve maximum cost savings and the best possible query performance on large datasets.

---

If you are running large-scale analytics in BigQuery, you have probably explored partitioning and clustering separately. But the real magic happens when you combine them. Used together, they can cut your query costs by an order of magnitude or more - I have seen tables go from scanning hundreds of gigabytes down to a few hundred megabytes per query.

Let me walk through how to combine these two features effectively and share what I have learned from working with this in production.

## Quick Refresher on Partitioning and Clustering

Partitioning divides your table into segments based on a column's value. BigQuery supports time-unit partitioning (by DATE, TIMESTAMP, or DATETIME), ingestion-time partitioning, and integer-range partitioning. When you filter on the partition column, BigQuery skips entire partitions.

Clustering sorts the data within each partition by one to four columns. When you filter on clustered columns, BigQuery skips storage blocks that do not contain matching values.

Together, partitioning gives you coarse pruning and clustering gives you fine-grained pruning.

## The Combined Strategy

The general rule is: partition by your primary time or range dimension, and cluster by the columns you filter on most within each partition.

Here is a typical example for an events table.

```sql
-- Partition by event date for time-based access patterns
-- Cluster by user_id and event_type for common filter combinations
CREATE TABLE `my_project.my_dataset.events`
(
  event_id STRING,
  user_id INT64,
  event_type STRING,
  event_date DATE,
  properties JSON,
  session_id STRING,
  platform STRING
)
PARTITION BY event_date
CLUSTER BY user_id, event_type;
```

With this setup, a query like "show me all click events for user 12345 in the last 7 days" will first prune to just 7 daily partitions, then within each partition, BigQuery will skip blocks that do not contain user 12345 or click events.

## Choosing the Partition Column

Your partition column should be the dimension that most broadly divides your data and is present in most of your queries. For most analytics workloads, that is a date or timestamp column.

Here are the questions I ask when choosing:

1. Do most queries include a date range? If yes, partition by date.
2. Is there a natural integer range that splits the data evenly? If yes, consider integer-range partitioning.
3. How much data arrives per partition? Aim for at least 1 GB per partition. Too many tiny partitions create overhead without meaningful benefit.

```sql
-- Check data distribution across potential partition values
-- This helps you decide on the right partition granularity
SELECT
  event_date,
  COUNT(*) AS row_count,
  SUM(LENGTH(TO_JSON_STRING(properties))) AS estimated_bytes
FROM `my_project.my_dataset.events_raw`
WHERE event_date >= '2026-01-01'
GROUP BY event_date
ORDER BY event_date;
```

## Choosing Clustering Columns

After partitioning, look at your query workload and identify the columns that appear in WHERE clauses, JOIN conditions, and GROUP BY statements most often.

```sql
-- Analyze your query patterns from INFORMATION_SCHEMA
-- This reveals which columns are filtered on most
SELECT
  REGEXP_EXTRACT_ALL(query, r'WHERE\s+.*?(\w+)\s*=') AS filter_columns,
  COUNT(*) AS query_count,
  SUM(total_bytes_processed) AS total_bytes_scanned
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY filter_columns
ORDER BY total_bytes_scanned DESC
LIMIT 20;
```

Order your clustering columns from most frequently filtered to least. The first clustering column provides the most benefit.

## Real-World Examples

Here are three common patterns I use regularly.

**E-commerce orders table**: Partition by order date, cluster by customer ID and product category.

```sql
-- E-commerce pattern: time-based access with customer and category filtering
CREATE TABLE `my_project.my_dataset.orders`
(
  order_id STRING,
  customer_id INT64,
  product_category STRING,
  order_date DATE,
  amount NUMERIC,
  status STRING,
  region STRING
)
PARTITION BY order_date
CLUSTER BY customer_id, product_category, region;
```

**Application logs table**: Partition by log date, cluster by service name and severity.

```sql
-- Logging pattern: time-range queries filtered by service and severity
CREATE TABLE `my_project.my_dataset.app_logs`
(
  log_id STRING,
  service_name STRING,
  severity STRING,
  message STRING,
  log_timestamp TIMESTAMP,
  log_date DATE,
  trace_id STRING
)
PARTITION BY log_date
CLUSTER BY service_name, severity;
```

**IoT sensor data**: Partition by reading date, cluster by device ID and sensor type.

```sql
-- IoT pattern: time-series data queried by device and sensor
CREATE TABLE `my_project.my_dataset.sensor_readings`
(
  reading_id STRING,
  device_id INT64,
  sensor_type STRING,
  reading_value FLOAT64,
  reading_timestamp TIMESTAMP,
  reading_date DATE,
  location STRING
)
PARTITION BY reading_date
CLUSTER BY device_id, sensor_type;
```

## Measuring the Impact

To see the combined effect, run the same query on both a regular table and a partitioned-clustered table, then compare bytes processed.

```sql
-- First, create the optimized table
CREATE TABLE `my_project.my_dataset.events_optimized`
PARTITION BY event_date
CLUSTER BY user_id, event_type
AS
SELECT * FROM `my_project.my_dataset.events_raw`;

-- Now compare: run the same query on both tables
-- Query on raw table (check bytes processed in job details)
SELECT COUNT(*) AS event_count
FROM `my_project.my_dataset.events_raw`
WHERE event_date BETWEEN '2026-01-01' AND '2026-01-31'
  AND user_id = 12345
  AND event_type = 'click';

-- Same query on optimized table (should scan far fewer bytes)
SELECT COUNT(*) AS event_count
FROM `my_project.my_dataset.events_optimized`
WHERE event_date BETWEEN '2026-01-01' AND '2026-01-31'
  AND user_id = 12345
  AND event_type = 'click';
```

In my experience, the combination typically reduces bytes scanned by 90-99% for well-targeted queries. On a 1 TB table, that can mean scanning just 1-10 GB instead of the full terabyte.

## Cost Savings Calculation

BigQuery on-demand pricing charges $5 per TB scanned (as of early 2026). Let us do some rough math.

Without optimization:
- 1 TB table, 100 queries per day = 100 TB scanned = $500/day

With partitioning only (30 daily partitions, query filters on one day):
- 1/30 of 1 TB per query = ~33 GB * 100 queries = 3.3 TB = $16.50/day

With partitioning and clustering (further 90% reduction):
- ~3.3 GB per query * 100 queries = 330 GB = $1.65/day

That is a drop from $500/day to $1.65/day. Over a month, you save roughly $15,000.

## Things to Watch Out For

**Partition granularity matters**: If you partition by day and your table gets 10 MB per day, each partition is tiny. BigQuery handles tiny partitions fine, but you are not getting meaningful partition pruning. Consider partitioning by month instead.

**Clustering order is permanent**: You cannot change the clustering column order without recreating the table. Plan your column order based on your most important queries.

**Streaming data affects clustering**: When you stream data in, it lands in an unclustered buffer first. BigQuery re-clusters it in the background, but there is a delay. For real-time queries on freshly streamed data, clustering benefits are reduced.

**Do not forget to filter**: Partitioning and clustering only help when your queries use the partition and clustering columns in WHERE clauses. A query without relevant filters still scans everything.

## Monitoring Your Savings

Set up a regular check on your query costs to make sure your optimization strategy is working.

```sql
-- Monitor bytes processed per query over time
-- Look for queries that scan more than expected
SELECT
  user_email,
  query,
  total_bytes_processed,
  total_bytes_billed,
  creation_time
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
  AND total_bytes_processed > 10737418240  -- more than 10 GB
ORDER BY total_bytes_processed DESC
LIMIT 50;
```

## Wrapping Up

Combining partitioning and clustering in BigQuery is the single most effective strategy for reducing costs on large tables. Partition by your primary access dimension (usually time), cluster by your most-filtered columns, and make sure your queries actually use those columns in their WHERE clauses. The savings compound as your data grows - what starts as a nice optimization becomes essential at scale.

For tracking the health and cost of your BigQuery pipelines over time, [OneUptime](https://oneuptime.com) provides monitoring dashboards that can alert you when query costs spike unexpectedly.
