# How to Monitor BigQuery Slot Utilization with INFORMATION_SCHEMA.JOBS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Slots, Monitoring, INFORMATION_SCHEMA, Performance

Description: Learn how to use BigQuery INFORMATION_SCHEMA views to monitor slot utilization, identify resource-heavy queries, and optimize capacity.

---

If you are using BigQuery slots, whether through reservations or on-demand, understanding how those slots are being consumed is critical. Overprovisioned slots waste money, underprovisioned slots slow down queries, and a single runaway query can starve everything else. BigQuery exposes detailed job execution data through INFORMATION_SCHEMA views, and these are your primary tool for monitoring slot utilization.

In this post, I will show you how to query INFORMATION_SCHEMA.JOBS and INFORMATION_SCHEMA.JOBS_TIMELINE to understand slot consumption patterns, identify expensive queries, and make informed capacity decisions.

## The Two Key Views

BigQuery provides two main INFORMATION_SCHEMA views for job monitoring.

INFORMATION_SCHEMA.JOBS contains one row per completed job with summary statistics including total slot milliseconds consumed, bytes processed, and duration. INFORMATION_SCHEMA.JOBS_TIMELINE contains time-sliced data with one row per job per second, showing how many slot milliseconds each job consumed during each second of its execution. The timeline view is what you need for understanding concurrent slot usage over time.

Both views are available at the regional level using the `region-LOCATION` prefix.

## Checking Overall Slot Utilization

The most basic question is: how many slots am I using? This query shows total slot usage aggregated by hour.

```sql
-- Hourly slot utilization over the last 7 days
SELECT
  TIMESTAMP_TRUNC(period_start, HOUR) AS hour,
  -- Convert slot-milliseconds per second into slot count
  -- Each row in JOBS_TIMELINE covers a 1-second period
  SUM(period_slot_ms) / (1000 * 3600) AS total_slot_hours,
  -- Average concurrent slots used during this hour
  SUM(period_slot_ms) / (1000 * 3600) AS avg_slots_used,
  -- Count distinct jobs running during this hour
  COUNT(DISTINCT job_id) AS unique_jobs
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS_TIMELINE
WHERE
  period_start BETWEEN TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
    AND CURRENT_TIMESTAMP()
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY
  hour
ORDER BY
  hour;
```

If you have a 500-slot reservation and consistently see only 200 slots being used, you are overprovisioned. If usage regularly hits 500 and queries are queueing, you need more capacity.

## Identifying the Most Expensive Queries

Not all queries are created equal. A small number of queries often consume a disproportionate share of slots. Finding these is the first step toward optimization.

```sql
-- Top 20 most slot-intensive queries in the last 24 hours
SELECT
  job_id,
  user_email,
  query,
  creation_time,
  -- Total slot time consumed by this query
  total_slot_ms,
  -- Convert to slot-hours for easier understanding
  ROUND(total_slot_ms / (1000 * 3600), 2) AS slot_hours,
  -- Query duration in seconds
  TIMESTAMP_DIFF(end_time, start_time, SECOND) AS duration_seconds,
  -- Data scanned
  ROUND(total_bytes_processed / POW(1024, 3), 2) AS gb_processed,
  -- Reservation used
  reservation_id
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND job_type = 'QUERY'
  AND state = 'DONE'
ORDER BY
  total_slot_ms DESC
LIMIT 20;
```

This query surfaces the queries that are burning the most compute. Often you will find queries that scan entire tables when they should be using partition filters, or queries that run repeatedly when they could be materialized.

## Tracking Slot Usage by User

In a shared environment, knowing who is consuming the most slots helps with capacity planning and accountability.

```sql
-- Slot consumption by user over the last 7 days
SELECT
  user_email,
  COUNT(*) AS query_count,
  -- Total slot time in hours
  ROUND(SUM(total_slot_ms) / (1000 * 3600), 2) AS total_slot_hours,
  -- Average slot time per query
  ROUND(AVG(total_slot_ms) / 1000, 2) AS avg_slot_seconds_per_query,
  -- Total data processed in GB
  ROUND(SUM(total_bytes_processed) / POW(1024, 3), 2) AS total_gb_processed,
  -- Average query duration
  ROUND(AVG(TIMESTAMP_DIFF(end_time, start_time, SECOND)), 2) AS avg_duration_seconds
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY
  user_email
ORDER BY
  total_slot_hours DESC;
```

## Analyzing Slot Usage by Reservation

If you have multiple reservations, tracking utilization per reservation helps you balance capacity.

```sql
-- Slot utilization by reservation over the last 24 hours
SELECT
  reservation_id,
  TIMESTAMP_TRUNC(period_start, HOUR) AS hour,
  -- Average slots used during this hour
  ROUND(SUM(period_slot_ms) / (1000 * 3600), 2) AS avg_slots_used,
  -- Number of jobs using this reservation
  COUNT(DISTINCT job_id) AS job_count
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS_TIMELINE
WHERE
  period_start > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND reservation_id IS NOT NULL
GROUP BY
  reservation_id, hour
ORDER BY
  reservation_id, hour;
```

## Detecting Slot Contention

Slot contention happens when queries compete for limited slots, causing them to run slower than they would with dedicated resources. You can detect this by looking for queries whose slot time is much higher than their wall-clock time would suggest.

```sql
-- Find queries that might be experiencing slot contention
-- High slot_ms relative to duration suggests the query ran slowly
SELECT
  job_id,
  user_email,
  creation_time,
  TIMESTAMP_DIFF(end_time, start_time, SECOND) AS duration_seconds,
  total_slot_ms,
  -- Effective parallelism: how many slots the query averaged
  ROUND(total_slot_ms / NULLIF(TIMESTAMP_DIFF(end_time, start_time, MILLISECOND), 0), 2) AS avg_slots,
  -- If avg_slots is very low compared to what is available,
  -- the query was likely throttled by contention
  reservation_id
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  -- Focus on queries that took a while
  AND TIMESTAMP_DIFF(end_time, start_time, SECOND) > 30
ORDER BY
  duration_seconds DESC
LIMIT 50;
```

Queries with low average slots relative to your reservation size are likely experiencing contention. This is a signal to either increase capacity or distribute load more evenly.

## Minute-by-Minute Slot Usage

For fine-grained analysis, look at slot consumption at minute or even second granularity using the JOBS_TIMELINE view.

```sql
-- Minute-by-minute slot usage for the last 2 hours
SELECT
  TIMESTAMP_TRUNC(period_start, MINUTE) AS minute,
  -- Total slots consumed per minute across all jobs
  SUM(period_slot_ms) / (1000 * 60) AS slots_used,
  -- Count of concurrent jobs
  COUNT(DISTINCT job_id) AS concurrent_jobs
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS_TIMELINE
WHERE
  period_start > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR)
GROUP BY
  minute
ORDER BY
  minute;
```

This granularity is useful for spotting burst patterns. Maybe your ETL pipeline runs every hour on the hour, causing a spike. Or a set of scheduled queries all fire at midnight. These patterns inform how you configure autoscaling.

## Setting Up Automated Monitoring

For ongoing monitoring, create a scheduled query that writes slot utilization metrics to a dedicated table.

```sql
-- Scheduled query: Write hourly slot metrics to a monitoring table
INSERT INTO `my_project.monitoring.slot_utilization_hourly`
  (hour, reservation_id, avg_slots, peak_slots, job_count, total_slot_hours)
SELECT
  TIMESTAMP_TRUNC(period_start, HOUR) AS hour,
  COALESCE(reservation_id, 'ON_DEMAND') AS reservation_id,
  ROUND(SUM(period_slot_ms) / (1000 * 3600), 2) AS avg_slots,
  ROUND(MAX(period_slot_ms) / 1000, 2) AS peak_slots,
  COUNT(DISTINCT job_id) AS job_count,
  ROUND(SUM(period_slot_ms) / (1000 * 3600), 2) AS total_slot_hours
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS_TIMELINE
WHERE
  period_start BETWEEN TIMESTAMP_TRUNC(
    TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR), HOUR)
  AND TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), HOUR)
GROUP BY
  hour, reservation_id;
```

You can then build dashboards on this table and set up Cloud Monitoring alerts for when utilization exceeds thresholds.

## Practical Patterns to Watch For

There are several patterns that commonly show up in slot monitoring data. The midnight spike is when all scheduled queries and ETL jobs run at the same time - spread them out to reduce peak demand. The runaway query is a single query consuming hundreds of slots for hours, usually a poorly written ad-hoc query - use custom quotas to limit per-user slot consumption. The idle reservation is when a reservation consistently uses less than 50% of its allocated slots - either reduce the allocation or enable idle slot sharing. The consistently maxed reservation is when a reservation is always at 100% utilization - queries are likely queueing, so increase capacity or optimize the queries using those slots.

## Wrapping Up

INFORMATION_SCHEMA views are the most powerful tool you have for understanding BigQuery slot utilization. Regular monitoring helps you right-size reservations, identify expensive queries that need optimization, and detect contention before it impacts users. The investment in setting up a monitoring pipeline pays back quickly in cost savings and performance improvements. Start with the basic utilization queries, then build up to automated monitoring and alerting as your BigQuery usage grows.
