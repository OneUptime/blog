# How to Enable Metadata Caching in BigLake for Faster Query Performance on External Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigLake, BigQuery, Metadata Caching, Query Performance

Description: Learn how to enable and configure metadata caching in BigLake to significantly improve query performance when querying external data in Cloud Storage.

---

Every time you query an external table in BigQuery without metadata caching, BigQuery has to list the files in Cloud Storage, read their footers to get schema and statistics, and then figure out which files to actually scan. For tables with thousands of files, this overhead adds several seconds to every query before it even starts processing data.

Metadata caching in BigLake solves this by storing file-level metadata - things like file paths, row counts, column statistics, and partition information - in BigQuery's internal cache. Instead of listing Cloud Storage on every query, BigQuery reads from this cache, which cuts query planning time dramatically. I have seen queries go from 15 seconds of planning overhead to under 2 seconds after enabling this feature.

## How Metadata Caching Works

When you enable metadata caching on a BigLake table, BigQuery periodically scans your Cloud Storage location and caches metadata about the files it finds. This includes file paths, sizes, row group statistics (min/max values per column), and partition information.

The cache has a staleness interval that you configure. If you set it to 30 minutes, BigQuery uses the cached metadata as long as it was refreshed within the last 30 minutes. If the cache is older than that, BigQuery refreshes it before running your query.

There are two cache modes available:
- AUTOMATIC: BigQuery refreshes the cache in the background at a system-determined interval
- MANUAL: You trigger cache refreshes yourself using a system procedure

## Setting Up a BigLake Table with Metadata Caching

If you are creating a new BigLake table, include the caching options at creation time.

```sql
-- Create a BigLake table with automatic metadata caching enabled
-- The max_staleness setting controls how fresh the cache must be
CREATE OR REPLACE EXTERNAL TABLE `my-project.analytics.web_logs`
WITH CONNECTION `my-project.US.my-biglake-connection`
OPTIONS (
  format = 'PARQUET',
  uris = ['gs://my-data-lake/web_logs/*.parquet'],
  -- Cache metadata automatically and allow up to 30 minutes staleness
  max_staleness = INTERVAL 30 MINUTE,
  metadata_cache_mode = 'AUTOMATIC'
);
```

The `max_staleness` parameter tells BigQuery how old the cached metadata can be before it needs a refresh. A 30-minute staleness means that if new files land in your Cloud Storage location, queries might not see them for up to 30 minutes. Choose a value that balances freshness with performance for your use case.

## Enabling Metadata Caching on Existing Tables

If you already have BigLake tables without caching, you can add it by altering the table options.

```sql
-- Add metadata caching to an existing BigLake table
-- This does not change the data, just enables caching behavior
ALTER TABLE `my-project.analytics.existing_external_table`
SET OPTIONS (
  max_staleness = INTERVAL 1 HOUR,
  metadata_cache_mode = 'AUTOMATIC'
);
```

You can also switch from automatic to manual mode or adjust the staleness interval:

```sql
-- Switch to manual cache mode for more control
ALTER TABLE `my-project.analytics.web_logs`
SET OPTIONS (
  max_staleness = INTERVAL 4 HOUR,
  metadata_cache_mode = 'MANUAL'
);
```

## Using Manual Cache Refresh

When you set the cache mode to MANUAL, you control when the cache gets updated. This is useful when you know exactly when new data arrives, like after a batch ETL job completes.

```sql
-- Manually refresh the metadata cache for a specific table
-- Run this after your ETL job finishes loading new files
CALL BQ.REFRESH_EXTERNAL_METADATA_CACHE(
  'my-project.analytics.web_logs'
);
```

You can automate manual refreshes using scheduled queries in BigQuery:

```sql
-- Create a scheduled query that refreshes the cache every hour
-- This gives you predictable refresh timing
-- Set this up in BigQuery Scheduled Queries with hourly schedule
CALL BQ.REFRESH_EXTERNAL_METADATA_CACHE(
  'my-project.analytics.web_logs'
);
```

Or trigger a refresh from your data pipeline after loading new files:

```python
from google.cloud import bigquery

# Initialize the BigQuery client
client = bigquery.Client(project="my-project")

def refresh_metadata_cache(table_id):
    """Refresh the BigLake metadata cache after loading new data."""
    query = f"CALL BQ.REFRESH_EXTERNAL_METADATA_CACHE('{table_id}')"
    job = client.query(query)
    job.result()  # Wait for completion
    print(f"Metadata cache refreshed for {table_id}")

# Call this after your data pipeline writes new files
refresh_metadata_cache("my-project.analytics.web_logs")
```

## Caching with Hive-Partitioned Tables

Metadata caching is especially effective with Hive-partitioned data because it caches the partition structure along with file metadata.

```sql
-- Create a Hive-partitioned BigLake table with caching
-- The partition metadata is cached too, speeding up partition pruning
CREATE OR REPLACE EXTERNAL TABLE `my-project.analytics.partitioned_events`
WITH CONNECTION `my-project.US.my-biglake-connection`
OPTIONS (
  format = 'PARQUET',
  uris = ['gs://my-data-lake/events/*'],
  hive_partition_uri_prefix = 'gs://my-data-lake/events/',
  require_hive_partition_filter = true,
  -- Cache for 15 minutes since this data updates frequently
  max_staleness = INTERVAL 15 MINUTE,
  metadata_cache_mode = 'AUTOMATIC'
);
```

When you query with a partition filter, BigQuery uses the cached partition metadata to immediately identify the relevant Cloud Storage paths without listing the bucket:

```sql
-- This query uses cached partition metadata for fast pruning
-- No Cloud Storage listing needed to find the right files
SELECT
  event_type,
  COUNT(*) AS event_count,
  AVG(latency_ms) AS avg_latency
FROM `my-project.analytics.partitioned_events`
WHERE dt = '2026-02-17'
  AND region = 'us-east1'
GROUP BY event_type
ORDER BY event_count DESC;
```

## Measuring the Performance Impact

To understand how much metadata caching helps your queries, compare query execution details with and without caching.

```sql
-- Run a query and then check the job details
-- Look at the timeline to see planning time versus execution time
SELECT
  job_id,
  creation_time,
  start_time,
  end_time,
  -- Planning time is the difference between creation and start
  TIMESTAMP_DIFF(start_time, creation_time, MILLISECOND) AS planning_ms,
  -- Execution time is the difference between start and end
  TIMESTAMP_DIFF(end_time, start_time, MILLISECOND) AS execution_ms,
  total_bytes_processed,
  total_bytes_billed
FROM `my-project.region-us.INFORMATION_SCHEMA.JOBS`
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  AND referenced_tables IS NOT NULL
ORDER BY creation_time DESC
LIMIT 20;
```

You should see a significant reduction in planning time (the time before the query starts scanning data) after enabling metadata caching.

## Choosing the Right Staleness Interval

The staleness interval is a trade-off between query performance and data freshness. Here are some guidelines based on common scenarios.

For real-time dashboards where data freshness matters:

```sql
-- Low staleness for frequently updated data
ALTER TABLE `my-project.analytics.streaming_events`
SET OPTIONS (
  max_staleness = INTERVAL 5 MINUTE,
  metadata_cache_mode = 'AUTOMATIC'
);
```

For daily batch reports where data changes once a day:

```sql
-- Higher staleness for batch data - cache stays valid longer
ALTER TABLE `my-project.analytics.daily_reports`
SET OPTIONS (
  max_staleness = INTERVAL 6 HOUR,
  metadata_cache_mode = 'MANUAL'
);
```

For historical data that rarely changes:

```sql
-- Very high staleness for stable historical data
ALTER TABLE `my-project.analytics.historical_archive`
SET OPTIONS (
  max_staleness = INTERVAL 24 HOUR,
  metadata_cache_mode = 'MANUAL'
);
```

## Troubleshooting Cache Issues

If queries seem to be reading stale data, check whether the cache is being refreshed:

```sql
-- View cache refresh jobs in the job history
SELECT
  job_id,
  creation_time,
  state,
  error_result
FROM `my-project.region-us.INFORMATION_SCHEMA.JOBS`
WHERE job_type = 'QUERY'
  AND query LIKE '%REFRESH_EXTERNAL_METADATA_CACHE%'
ORDER BY creation_time DESC
LIMIT 10;
```

If you need to force a cache refresh right now regardless of the staleness interval:

```sql
-- Force an immediate cache refresh
CALL BQ.REFRESH_EXTERNAL_METADATA_CACHE(
  'my-project.analytics.web_logs'
);
```

## Summary

Metadata caching in BigLake is one of those features that takes five minutes to enable but can save significant time on every query against external data. The setup is straightforward - add `max_staleness` and `metadata_cache_mode` to your table options. Use AUTOMATIC mode for tables that are queried frequently, and MANUAL mode when you want to control refresh timing to align with your data loading schedule. The performance gain comes from eliminating the Cloud Storage file listing and metadata reading that happens on every query, which can easily add 5-15 seconds of overhead on tables with thousands of files.
