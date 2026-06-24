# How to Monitor BigQuery BI Engine Cache Hit Rates and Acceleration Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, BI Engine, Monitoring, Performance, Dashboard

Description: Learn how to monitor BigQuery BI Engine cache hit rates, track acceleration status, and optimize memory reservations for dashboard performance.

---

Setting up a BigQuery BI Engine reservation is only the first step. To actually get the performance benefits you are paying for, you need to monitor whether BI Engine is accelerating your queries and how effectively it is using its memory allocation. Without monitoring, you might be paying for a reservation that is too small to be useful, or too large for your actual workload.

In this post, I will cover the key metrics to track, the queries you can run to check BI Engine performance, and how to set up ongoing monitoring and alerting.

## Understanding BI Engine Acceleration Modes

When a query runs against BigQuery with BI Engine acceleration active, the query can be reported in one of four acceleration modes. `FULL_QUERY` means BI Engine handled the entire query using its in-memory engine. This gives you the best performance. `FULL_INPUT` means all input stages were accelerated, but later query processing might still use the BigQuery execution engine. `PARTIAL_INPUT` means BI Engine could accelerate some input stages but had to fall back to standard BigQuery processing for others. You still get some benefit, but not the full sub-second experience. `BI_ENGINE_DISABLED` means BI Engine acceleration was disabled for the query, typically because the query uses unsupported operations, no reservation is available, or the input is too large.

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
  bi_engine_statistics.acceleration_mode AS acceleration_mode,
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

The `bi_engine_reasons` field is particularly useful when acceleration mode is `PARTIAL_INPUT` or `BI_ENGINE_DISABLED`. It tells you why BI Engine could not fully accelerate the query, such as insufficient reservation memory, unsupported SQL text, or input that is too large.

## Calculating Acceleration Rates

To get an overall picture of how well BI Engine is performing, calculate the proportion of queries that are fully accelerated. This is different from the BigQuery `cache_hit` field, which refers to the query results cache.

```sql
-- Calculate BI Engine acceleration rates over the last 7 days
SELECT
  DATE(creation_time) AS query_date,
  COUNT(*) AS total_queries,
  -- Count fully accelerated queries
  COUNTIF(bi_engine_statistics.acceleration_mode = 'FULL_QUERY') AS fully_accelerated,
  -- Count queries where all input stages were accelerated
  COUNTIF(bi_engine_statistics.acceleration_mode = 'FULL_INPUT') AS fully_accelerated_inputs,
  -- Count partially accelerated queries
  COUNTIF(bi_engine_statistics.acceleration_mode = 'PARTIAL_INPUT') AS partially_accelerated,
  -- Count queries where BI Engine was disabled
  COUNTIF(bi_engine_statistics.acceleration_mode = 'BI_ENGINE_DISABLED') AS not_accelerated,
  -- Calculate the full acceleration rate as a percentage
  ROUND(
    SAFE_DIVIDE(COUNTIF(bi_engine_statistics.acceleration_mode = 'FULL_QUERY') * 100.0, COUNT(*)),
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
  AND bi_engine_statistics.acceleration_mode != 'FULL_QUERY'
GROUP BY
  reason_code, reason_message
ORDER BY
  occurrence_count DESC;
```

Common reasons include insufficient reservation size (the reservation does not have enough memory), unsupported SQL text, and input that is too large. Each reason suggests a different fix - increase the reservation, simplify the query, or pre-aggregate the data.

## Monitoring Memory Utilization

Understanding how much of your BI Engine reservation is actually being used helps with right-sizing.

```sql
-- Check the current BI Engine reservation size
SELECT
  project_id,
  bi_capacity_name,
  size / 1024.0 / 1024.0 / 1024.0 AS size_gib,
  preferred_tables
FROM
  `region-us-central1`.INFORMATION_SCHEMA.BI_CAPACITIES;
```

For actual utilization over time, use the Cloud Monitoring metrics `bigquerybiengine.googleapis.com/reservation/used_bytes` and `bigquerybiengine.googleapis.com/reservation/total_bytes`. You can also check the reservation itself through the API.

```bash
# Check current BI Engine reservation details

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
  bi_engine_statistics.acceleration_mode AS acceleration_mode,
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

For proactive monitoring, you can set up alerts in Cloud Monitoring that trigger when BI Engine acceleration rates drop below a threshold or reservation utilization exceeds a threshold.

First, create a scheduled query that writes acceleration metrics to a table.

```sql
-- Scheduled query: Write hourly BI Engine metrics to a monitoring table
INSERT INTO `my_project.monitoring.bi_engine_metrics`
  (check_time, total_queries, full_acceleration_pct, reservation_size_gb)
SELECT
  CURRENT_TIMESTAMP() AS check_time,
  COUNT(*) AS total_queries,
  ROUND(
    SAFE_DIVIDE(COUNTIF(bi_engine_statistics.acceleration_mode = 'FULL_QUERY') * 100.0, COUNT(*)),
    2
  ) AS full_acceleration_pct,
  NULL AS reservation_size_gb  -- Populated separately
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  AND bi_engine_statistics IS NOT NULL;
```

Then create a Cloud Monitoring alert based on a custom metric exported from this table. You can also alert directly on built-in BI Engine reservation metrics when you want to catch capacity pressure.

```bash
# Create an alert policy that fires when BI Engine reservation usage is high
gcloud monitoring policies create \
  --display-name="BI Engine Reservation Usage High" \
  --condition-display-name="High reservation usage" \
  --condition-filter='metric.type="bigquerybiengine.googleapis.com/reservation/used_bytes" AND resource.type="bigquery_project"' \
  --if='> 200000000000' \
  --duration=3600s \
  --notification-channels=CHANNEL_ID
```

## Building a BI Engine Monitoring Dashboard

Putting all these metrics together into a monitoring dashboard gives you a single place to track BI Engine health.

Here is a useful dashboard layout.

```text
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
