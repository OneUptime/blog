# How to Use BigQuery INFORMATION_SCHEMA to Monitor Table Metadata and Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, INFORMATION_SCHEMA, Monitoring, Data Governance

Description: Learn how to use BigQuery INFORMATION_SCHEMA views to monitor table metadata, track query usage, analyze costs, and manage your data warehouse effectively.

---

BigQuery's INFORMATION_SCHEMA is a goldmine of metadata about your tables, jobs, and usage patterns. Most teams underuse it, relying on the console for quick checks. But if you want to systematically monitor your BigQuery environment - track table growth, find expensive queries, identify unused tables, or audit access patterns - INFORMATION_SCHEMA is the tool.

I use INFORMATION_SCHEMA views daily for cost management and data governance. Let me walk through the most useful queries.

## Overview of INFORMATION_SCHEMA Views

BigQuery provides INFORMATION_SCHEMA views at different levels:

- **Dataset level**: `my_dataset.INFORMATION_SCHEMA.*` - metadata about tables in a specific dataset
- **Project level**: `region-us.INFORMATION_SCHEMA.*` - metadata about jobs across the project
- **Organization level**: Available for broader cross-project analysis

The most commonly used views are:

- `TABLES` - table metadata
- `COLUMNS` - column details
- `PARTITIONS` - partition information
- `TABLE_STORAGE` - storage usage
- `JOBS` / `JOBS_BY_PROJECT` - query execution history
- `ROUTINES` - UDFs and stored procedures

## Monitoring Table Sizes and Growth

Start with understanding how much storage each table consumes.

```sql
-- Get storage usage for all tables in a dataset
-- Sorted by total size to find the biggest consumers
SELECT
  table_name,
  table_type,
  ROUND(total_logical_bytes / POW(1024, 3), 2) AS logical_gb,
  ROUND(total_physical_bytes / POW(1024, 3), 2) AS physical_gb,
  ROUND(active_logical_bytes / POW(1024, 3), 2) AS active_gb,
  ROUND(long_term_logical_bytes / POW(1024, 3), 2) AS long_term_gb,
  total_rows,
  creation_time,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), creation_time, DAY) AS days_old
FROM `my_project.my_dataset.INFORMATION_SCHEMA.TABLE_STORAGE`
ORDER BY total_logical_bytes DESC;
```

Long-term storage (data older than 90 days that has not been modified) is billed at a lower rate, so the `long_term_logical_bytes` column tells you how much of your data gets the discount.

## Tracking Table Growth Over Time

To track growth, snapshot the storage info periodically.

```sql
-- Create a tracking table and populate it daily
CREATE TABLE IF NOT EXISTS `my_project.my_dataset.storage_tracking` (
  snapshot_date DATE,
  table_name STRING,
  total_logical_bytes INT64,
  total_rows INT64
);

-- Insert today's snapshot
INSERT INTO `my_project.my_dataset.storage_tracking`
SELECT
  CURRENT_DATE() AS snapshot_date,
  table_name,
  total_logical_bytes,
  total_rows
FROM `my_project.my_dataset.INFORMATION_SCHEMA.TABLE_STORAGE`;
```

Then query the tracking table to see growth trends.

```sql
-- Compare table sizes week over week
SELECT
  t1.table_name,
  t1.total_logical_bytes AS current_bytes,
  t2.total_logical_bytes AS week_ago_bytes,
  t1.total_logical_bytes - COALESCE(t2.total_logical_bytes, 0) AS bytes_added,
  ROUND((t1.total_logical_bytes - COALESCE(t2.total_logical_bytes, 0))
        / POW(1024, 3), 2) AS gb_added
FROM `my_project.my_dataset.storage_tracking` t1
LEFT JOIN `my_project.my_dataset.storage_tracking` t2
  ON t1.table_name = t2.table_name
  AND t2.snapshot_date = DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
WHERE t1.snapshot_date = CURRENT_DATE()
ORDER BY bytes_added DESC;
```

## Analyzing Column Metadata

Understanding your column schemas helps with data governance and documentation.

```sql
-- Get detailed column information for all tables in a dataset
SELECT
  table_name,
  column_name,
  ordinal_position,
  data_type,
  is_nullable,
  is_partitioning_column,
  clustering_ordinal_position
FROM `my_project.my_dataset.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'orders'
ORDER BY ordinal_position;
```

Find all partitioned and clustered tables.

```sql
-- List all partitioned and clustered columns across the dataset
SELECT
  table_name,
  column_name,
  CASE
    WHEN is_partitioning_column = 'YES' THEN 'PARTITION'
    WHEN clustering_ordinal_position IS NOT NULL THEN CONCAT('CLUSTER-', CAST(clustering_ordinal_position AS STRING))
  END AS optimization_type
FROM `my_project.my_dataset.INFORMATION_SCHEMA.COLUMNS`
WHERE is_partitioning_column = 'YES'
  OR clustering_ordinal_position IS NOT NULL
ORDER BY table_name, optimization_type;
```

## Monitoring Partition Health

Check partition distribution to identify skewed or empty partitions.

```sql
-- Analyze partition distribution for a specific table
SELECT
  partition_id,
  total_rows,
  ROUND(total_logical_bytes / POW(1024, 2), 2) AS size_mb,
  last_modified_time
FROM `my_project.my_dataset.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name = 'events'
  AND partition_id != '__NULL__'
ORDER BY partition_id DESC
LIMIT 30;
```

Find tables with partition skew.

```sql
-- Identify tables with highly skewed partitions
SELECT
  table_name,
  COUNT(*) AS partition_count,
  MIN(total_rows) AS min_rows,
  MAX(total_rows) AS max_rows,
  AVG(total_rows) AS avg_rows,
  ROUND(STDDEV(total_rows) / NULLIF(AVG(total_rows), 0), 2) AS coefficient_of_variation
FROM `my_project.my_dataset.INFORMATION_SCHEMA.PARTITIONS`
WHERE partition_id NOT IN ('__NULL__', '__UNPARTITIONED__')
  AND total_rows > 0
GROUP BY table_name
HAVING COUNT(*) > 1
ORDER BY coefficient_of_variation DESC;
```

## Analyzing Query Costs and Performance

The JOBS views are incredibly useful for cost management.

```sql
-- Find the most expensive queries in the last 7 days
SELECT
  job_id,
  user_email,
  query,
  total_bytes_processed,
  ROUND(total_bytes_processed / POW(1024, 4), 4) AS tb_processed,
  ROUND(total_bytes_processed / POW(1024, 4) * 5, 2) AS estimated_cost_usd,
  total_slot_ms,
  creation_time,
  TIMESTAMP_DIFF(end_time, start_time, SECOND) AS duration_seconds
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND total_bytes_processed > 0
ORDER BY total_bytes_processed DESC
LIMIT 20;
```

## Cost by User

See who is spending the most.

```sql
-- Aggregate query costs by user over the last 30 days
SELECT
  user_email,
  COUNT(*) AS query_count,
  SUM(total_bytes_processed) AS total_bytes,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4), 2) AS total_tb,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4) * 5, 2) AS estimated_cost_usd,
  ROUND(AVG(total_bytes_processed) / POW(1024, 3), 2) AS avg_gb_per_query,
  MAX(creation_time) AS last_query_time
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
ORDER BY total_bytes DESC;
```

## Finding Unused Tables

Identify tables that nobody queries, candidates for archival or deletion.

```sql
-- Find tables that have not been queried in the last 90 days
WITH queried_tables AS (
  SELECT DISTINCT
    referenced_table.project_id,
    referenced_table.dataset_id,
    referenced_table.table_id
  FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT,
  UNNEST(referenced_tables) AS referenced_table
  WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
    AND job_type = 'QUERY'
)
SELECT
  ts.table_name,
  ts.creation_time,
  ROUND(ts.total_logical_bytes / POW(1024, 3), 2) AS size_gb,
  ts.total_rows
FROM `my_project.my_dataset.INFORMATION_SCHEMA.TABLE_STORAGE` ts
LEFT JOIN queried_tables qt
  ON qt.table_id = ts.table_name
  AND qt.dataset_id = 'my_dataset'
WHERE qt.table_id IS NULL
ORDER BY ts.total_logical_bytes DESC;
```

## Monitoring Query Patterns by Table

Understand which tables are queried most and how.

```sql
-- Query frequency and cost by table over the last 30 days
SELECT
  referenced_table.table_id AS table_name,
  COUNT(*) AS query_count,
  COUNT(DISTINCT user_email) AS unique_users,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4), 4) AS total_tb_scanned,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4) * 5, 2) AS total_cost_usd
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT,
UNNEST(referenced_tables) AS referenced_table
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND referenced_table.dataset_id = 'my_dataset'
GROUP BY table_name
ORDER BY total_cost_usd DESC;
```

## Finding Queries Without Partition Filters

Identify queries that scan entire partitioned tables.

```sql
-- Find queries on partitioned tables that do not use partition filters
-- These are candidates for optimization
SELECT
  job_id,
  user_email,
  query,
  ROUND(total_bytes_processed / POW(1024, 3), 2) AS gb_processed,
  creation_time
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND total_bytes_processed > 10737418240  -- More than 10 GB
  AND query LIKE '%my_dataset.events%'
ORDER BY total_bytes_processed DESC
LIMIT 20;
```

## Building a Monitoring Dashboard Query

Combine multiple metrics into a single dashboard-style query.

```sql
-- Comprehensive dataset health dashboard
SELECT
  'Total Tables' AS metric, CAST(COUNT(*) AS STRING) AS value
FROM `my_project.my_dataset.INFORMATION_SCHEMA.TABLES`
WHERE table_type = 'BASE TABLE'

UNION ALL

SELECT
  'Total Storage (GB)',
  CAST(ROUND(SUM(total_logical_bytes) / POW(1024, 3), 2) AS STRING)
FROM `my_project.my_dataset.INFORMATION_SCHEMA.TABLE_STORAGE`

UNION ALL

SELECT
  'Queries Today',
  CAST(COUNT(*) AS STRING)
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time >= TIMESTAMP(CURRENT_DATE())
  AND job_type = 'QUERY'

UNION ALL

SELECT
  'Estimated Cost Today (USD)',
  CAST(ROUND(SUM(total_bytes_processed) / POW(1024, 4) * 5, 2) AS STRING)
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time >= TIMESTAMP(CURRENT_DATE())
  AND job_type = 'QUERY'
  AND state = 'DONE';
```

## Wrapping Up

BigQuery INFORMATION_SCHEMA views give you everything you need to monitor, optimize, and govern your data warehouse. Regular use of these views helps you catch runaway costs, identify optimization opportunities, and keep your datasets clean. Schedule the key monitoring queries to run daily and pipe the results into a dashboard or alerting system.

For a complete monitoring solution that covers BigQuery alongside your other GCP services, [OneUptime](https://oneuptime.com) offers unified dashboards and alerting to help you stay on top of your infrastructure health.
