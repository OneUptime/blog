# How to Monitor BigQuery BI Engine Cache Hit Rates and Acceleration Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, BI Engine, Monitoring, Performance, Dashboards

Description: Learn how to monitor BigQuery BI Engine cache hit rates, track acceleration status, and optimize memory reservations for dashboard performance.

---

Setting up a BigQuery BI Engine reservation is only the first step. To actually get the performance benefits you are paying for, you need to monitor whether BI Engine is accelerating your queries and how effectively it is using its memory allocation. Without monitoring, you might be paying for a reservation that is too small to be useful, or too large for your actual workload.

In this post, I will cover the key metrics to track, the queries you can run to check BI Engine performance, and how to set up ongoing monitoring and alerting.

## Understanding BI Engine Acceleration Modes

When a query runs against BigQuery with a BI Engine reservation active, the query can be processed in one of three modes. Full acceleration means BI Engine handled the entire query using its in-memory engine. This gives you the best performance. Partial acceleration means BI Engine could accelerate some parts of the query but had to fall back to standard BigQuery processing for others. You still get some benefit, but not the full sub-second experience. Disabled means BI Engine could not accelerate the query at all, typically because the query uses unsupported operations or the data is not cached.

Understanding which mode your queries are running in is the foundation of BI Engine monitoring.

## Querying BI Engine Statistics from INFORMATION_SCHEMA

The primary way to monitor BI Engine is through the INFORMATION_SCHEMA.JOBS view, which includes BI Engine statistics for each query.

This query shows BI Engine acceleration status for recent queries.

```sql
-- Check BI Engine acceleration status for queries in the last 24 hours
SELECT
  job_id,
  user_email,
  creation_time,
  total_bytes_processed,
  -- BI Engine specific fields
  bi_engine_statistics.bi_engine_mode AS acceleration_mode,
  -- Check for reasons why acceleration might be limited
  bi_engine_statistics.bi_engine_reasons AS acceleration_reasons
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND bi_engine_statistics IS NOT NULL
ORDER BY
  creation_time DESC
LIMIT 100;
```

The `bi_engine_reasons` field is particularly useful when acceleration mode is PARTIAL or DISABLED. It tells you exactly why BI Engine could not fully accelerate the query, such as unsupported SQL features, insufficient memory, or unsupported data types.

## Calculating Cache Hit Rates

To get an overall picture of how well BI Engine is performing, calculate the proportion of queries that are fully accelerated.

```sql
-- Calculate BI Engine acceleration rates over the last 7 days
SELECT
  DATE(creation_time) AS query_date,
  COUNT(*) AS total_queries,
  -- Count fully accelerated queries
  COUNTIF(bi_engine_statistics.bi_engine_mode = 'FULL') AS fully_accelerated,
  -- Count partially accelerated queries
  COUNTIF(bi_engine_statistics.bi_engine_mode = 'PARTIAL') AS partially_accelerated,
  -- Count queries where BI Engine was disabled
  COUNTIF(bi_engine_statistics.bi_engine_mode = 'DISABLED') AS not_accelerated,
  -- Calculate the full acceleration rate as a percentage
  ROUND(
    COUNTIF(bi_engine_statistics.bi_engine_mode = 'FULL') * 100.0 / COUNT(*),
    2
  ) AS full_acceleration_pct
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND bi_engine_statistics IS NOT NULL
GROUP BY
  query_date
ORDER BY
  query_date;
```

A healthy BI Engine setup should show full acceleration rates above 80%. If your rate is lower, the next step is investigating why queries are not being fully accelerated.

## Diagnosing Acceleration Issues

When queries are only partially accelerated or not accelerated at all, you need to understand the root causes. The BI Engine reasons provide this detail.

```sql
-- Find the most common reasons for non-full acceleration
SELECT
  reason.code AS reason_code,
  reason.message AS reason_message,
  COUNT(*) AS occurrence_count
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS,
  UNNEST(bi_engine_statistics.bi_engine_reasons) AS reason
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND bi_engine_statistics.bi_engine_mode != 'FULL'
GROUP BY
  reason_code, reason_message
ORDER BY
  occurrence_count DESC;
```

Common reasons include insufficient reservation size (the cache is too small for the queried data), unsupported SQL operations (like certain window functions or complex joins), and unsupported input types. Each reason suggests a different fix - increase the reservation, simplify the query, or pre-aggregate the data.

## Monitoring Memory Utilization

Understanding how much of your BI Engine reservation is actually being used helps with right-sizing.

```sql
-- Check BI Engine reservation utilization over time
SELECT
  TIMESTAMP_TRUNC(creation_time, HOUR) AS hour,
  -- Total bytes that BI Engine processed
  SUM(total_bytes_processed) AS total_bytes_processed,
  -- Average bytes per query
  AVG(total_bytes_processed) AS avg_bytes_per_query,
  -- Number of queries processed
  COUNT(*) AS query_count
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND bi_engine_statistics IS NOT NULL
  AND bi_engine_statistics.bi_engine_mode = 'FULL'
GROUP BY
  hour
ORDER BY
  hour;
```

You can also check the reservation itself through the API.

```bash
# Check current BI Engine reservation details including utilization
curl -s \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://bigqueryreservation.googleapis.com/v1/projects/my-project/locations/us-central1/biReservation" \
  | python3 -m json.tool
```

## Tracking Performance Improvements

To quantify the value BI Engine is providing, compare query latencies between accelerated and non-accelerated queries.

```sql
-- Compare query performance with and without BI Engine acceleration
SELECT
  bi_engine_statistics.bi_engine_mode AS acceleration_mode,
  COUNT(*) AS query_count,
  -- Median query duration in seconds
  APPROX_QUANTILES(
    TIMESTAMP_DIFF(end_time, start_time, MILLISECOND) / 1000.0, 100
  )[OFFSET(50)] AS median_duration_seconds,
  -- P95 query duration in seconds
  APPROX_QUANTILES(
    TIMESTAMP_DIFF(end_time, start_time, MILLISECOND) / 1000.0, 100
  )[OFFSET(95)] AS p95_duration_seconds,
  -- Average bytes scanned
  AVG(total_bytes_processed) AS avg_bytes_processed
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND bi_engine_statistics IS NOT NULL
GROUP BY
  acceleration_mode;
```

This gives you concrete numbers showing the latency difference between fully accelerated, partially accelerated, and non-accelerated queries. For typical dashboard queries, you should see fully accelerated queries completing in under a second while non-accelerated queries take multiple seconds.

## Setting Up Cloud Monitoring Alerts

For proactive monitoring, you can set up alerts in Cloud Monitoring that trigger when BI Engine acceleration rates drop below a threshold.

First, create a scheduled query that writes acceleration metrics to a table.

```sql
-- Scheduled query: Write hourly BI Engine metrics to a monitoring table
INSERT INTO `my_project.monitoring.bi_engine_metrics`
  (check_time, total_queries, full_acceleration_pct, reservation_size_gb)
SELECT
  CURRENT_TIMESTAMP() AS check_time,
  COUNT(*) AS total_queries,
  ROUND(
    COUNTIF(bi_engine_statistics.bi_engine_mode = 'FULL') * 100.0 / COUNT(*),
    2
  ) AS full_acceleration_pct,
  NULL AS reservation_size_gb  -- Populated separately
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  AND bi_engine_statistics IS NOT NULL;
```

Then create a Cloud Monitoring alert based on a log-based metric or a custom metric exported from this table.

```bash
# Create a log-based metric for BI Engine non-acceleration events
gcloud logging metrics create bi-engine-not-accelerated \
  --description="Count of queries not accelerated by BI Engine" \
  --log-filter='resource.type="bigquery_resource" AND jsonPayload.serviceData.jobCompletedEvent.job.jobStatistics.biEngineStatistics.biEngineMode!="FULL"'
```

```bash
# Create an alert policy that fires when too many queries miss acceleration
gcloud alpha monitoring policies create \
  --display-name="BI Engine Acceleration Drop" \
  --condition-display-name="Low acceleration rate" \
  --condition-filter='metric.type="logging.googleapis.com/user/bi-engine-not-accelerated"' \
  --condition-threshold-value=50 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=3600s \
  --notification-channels=CHANNEL_ID
```

## Building a BI Engine Monitoring Dashboard

Putting all these metrics together into a monitoring dashboard gives you a single place to track BI Engine health.

Here is a useful dashboard layout.

```
BI Engine Health Dashboard
--------------------------
Row 1: Full Acceleration Rate (%) over time | Query Count by Acceleration Mode
Row 2: Top Reasons for Non-Acceleration    | Median Query Latency by Mode
Row 3: Memory Utilization Trend            | Cost Savings Estimate
```

You can build this in Looker Studio or any BI tool, querying the INFORMATION_SCHEMA views and the monitoring table from the scheduled query. The irony of building a BI Engine monitoring dashboard that itself benefits from BI Engine acceleration is not lost on me.

## Optimization Recommendations

Based on your monitoring data, here are the most common optimizations. If many queries show insufficient reservation size, increase the reservation incrementally and watch the acceleration rate improve. If unsupported SQL features are the problem, consider pre-aggregating the data into materialized views that use simpler query patterns. If specific tables are not being cached, check that they are in the same project and region as the reservation. If query latency is still too high even with full acceleration, consider reducing the data volume by using partitioned tables and partition filters.

## Wrapping Up

Monitoring BI Engine is essential for ensuring you are getting the performance and value from your reservation. The INFORMATION_SCHEMA views give you everything you need to track acceleration rates, diagnose issues, and measure the latency improvements. Setting up regular monitoring and alerting means you will catch problems before your dashboard users start complaining about slow reports. The investment in monitoring pays for itself quickly by helping you right-size your reservation and fix query patterns that prevent full acceleration.
