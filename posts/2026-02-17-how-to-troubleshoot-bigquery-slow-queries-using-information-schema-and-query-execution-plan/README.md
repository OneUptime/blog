# How to Troubleshoot BigQuery Slow Queries Using INFORMATION_SCHEMA and Query Execution Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Query Optimization, INFORMATION_SCHEMA, Execution Plan, Performance

Description: Use INFORMATION_SCHEMA views and query execution plans to diagnose and fix slow BigQuery queries, with practical examples and optimization techniques.

---

Your BigQuery query is slow. Maybe it takes 30 seconds when you expected 5. Maybe it has been running for 10 minutes and you are wondering if it will ever finish. Before you start randomly rewriting your query, you need to understand where the time is being spent. BigQuery gives you two powerful diagnostic tools: the INFORMATION_SCHEMA views and the query execution plan.

In this post, I will show you how to use both to pinpoint exactly what is making your query slow and how to fix it.

## Starting with INFORMATION_SCHEMA

The INFORMATION_SCHEMA views contain metadata about every job that runs in your BigQuery project. This is your first stop for understanding query performance patterns.

### Find Your Slowest Queries

```sql
-- Find the 20 slowest queries in the last 24 hours
SELECT
  job_id,
  user_email,
  TIMESTAMP_DIFF(end_time, start_time, SECOND) as duration_seconds,
  total_bytes_processed / (1024 * 1024 * 1024) as gb_processed,
  total_slot_ms / 1000 as total_slot_seconds,
  -- Calculate average slots used
  SAFE_DIVIDE(total_slot_ms, TIMESTAMP_DIFF(end_time, start_time, MILLISECOND)) as avg_slots_used,
  SUBSTR(query, 1, 200) as query_preview
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND error_result IS NULL
ORDER BY duration_seconds DESC
LIMIT 20;
```

This tells you which queries are consuming the most time. The `avg_slots_used` column is particularly useful - a query that runs for 60 seconds with 10 average slots is very different from one that runs for 60 seconds with 1000 average slots. The first is likely waiting on something; the second is doing a lot of work.

### Identify Resource-Heavy Queries

```sql
-- Find queries that consume the most slot time (compute resources)
SELECT
  job_id,
  user_email,
  total_slot_ms / 1000 / 60 as slot_minutes,
  total_bytes_processed / (1024 * 1024 * 1024) as gb_processed,
  total_bytes_billed / (1024 * 1024 * 1024) as gb_billed,
  SUBSTR(query, 1, 300) as query_preview,
  ARRAY_LENGTH(referenced_tables) as tables_referenced
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND job_type = 'QUERY'
  AND state = 'DONE'
ORDER BY total_slot_ms DESC
LIMIT 20;
```

### Track Query Performance Over Time

```sql
-- Track a specific query pattern performance over time
SELECT
  DATE(creation_time) as day,
  COUNT(*) as execution_count,
  AVG(TIMESTAMP_DIFF(end_time, start_time, SECOND)) as avg_duration_seconds,
  MAX(TIMESTAMP_DIFF(end_time, start_time, SECOND)) as max_duration_seconds,
  AVG(total_bytes_processed) / (1024 * 1024 * 1024) as avg_gb_processed
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND query LIKE '%my_important_table%'
GROUP BY day
ORDER BY day DESC;
```

## Reading the Query Execution Plan

Once you have identified a slow query, the execution plan shows exactly what BigQuery did to run it. You can access it in the Cloud Console by clicking on "Execution Details" after a query completes, or via the API.

```bash
# Get the execution plan for a specific job
bq show -j --format=prettyjson <job-id> | python3 -c "
import json, sys
job = json.load(sys.stdin)
stages = job.get('statistics', {}).get('query', {}).get('queryPlan', [])
for stage in stages:
    print(f\"Stage {stage['name']}:\")
    print(f\"  Status: {stage['status']}\")
    print(f\"  Slot ms: {stage.get('slotMs', 'N/A')}\")
    print(f\"  Records read: {stage.get('recordsRead', 'N/A')}\")
    print(f\"  Records written: {stage.get('recordsWritten', 'N/A')}\")
    print(f\"  Shuffle output bytes: {stage.get('shuffleOutputBytes', 'N/A')}\")
    print()
"
```

### Key Metrics in Each Stage

Each stage in the execution plan represents a phase of query processing. Here is what to look for.

**slotMs**: Total compute time for this stage. High values indicate compute-intensive stages.

**recordsRead vs recordsWritten**: A big difference between these (especially many reads but few writes) suggests filtering is happening, which is good. If both are very high, too much data is flowing through.

**shuffleOutputBytes**: Data transferred between stages. High shuffle output means data is being redistributed across slots, which is expensive.

**waitMsAvg**: Average time slots spent waiting. High wait times indicate slot contention - your query is waiting for compute resources.

## Common Slow Query Patterns and Fixes

### Pattern 1 - Full Table Scan on Partitioned Table

The execution plan shows a stage reading all partitions when it should only read a few.

```sql
-- Slow: EXTRACT does not enable partition pruning
SELECT * FROM `my_dataset.events`
WHERE EXTRACT(DATE FROM event_timestamp) = '2024-06-15';

-- Fast: direct comparison enables partition pruning
SELECT * FROM `my_dataset.events`
WHERE event_timestamp >= '2024-06-15'
  AND event_timestamp < '2024-06-16';
```

You can verify partition pruning is working by checking the `totalBytesProcessed` in the query plan. If it is scanning the entire table, your filter is not triggering partition pruning.

### Pattern 2 - Data Skew in Joins

The execution plan shows one or a few slots processing much more data than others. This happens when join keys have highly uneven distribution.

```sql
-- Check for data skew in your join key
SELECT
  join_key_column,
  COUNT(*) as row_count
FROM `my_dataset.large_table`
GROUP BY join_key_column
ORDER BY row_count DESC
LIMIT 20;
```

If one key has millions of rows while others have hundreds, that is skew. Fix it by filtering the skewed keys separately.

```sql
-- Handle skewed keys separately
WITH popular_keys AS (
  SELECT join_key FROM `my_dataset.large_table`
  GROUP BY join_key HAVING COUNT(*) > 1000000
)

-- Process non-skewed data normally
SELECT a.*, b.value
FROM `my_dataset.large_table` a
JOIN `my_dataset.lookup_table` b ON a.join_key = b.join_key
WHERE a.join_key NOT IN (SELECT join_key FROM popular_keys)

UNION ALL

-- Process skewed keys with a different strategy
SELECT a.*, b.value
FROM `my_dataset.large_table` a
JOIN `my_dataset.lookup_table` b ON a.join_key = b.join_key
WHERE a.join_key IN (SELECT join_key FROM popular_keys);
```

### Pattern 3 - Excessive Shuffling

High `shuffleOutputBytes` in the execution plan means data is being redistributed between slots. This is common with GROUP BY, ORDER BY, and JOIN operations.

```sql
-- Reduce shuffling by filtering before grouping
-- Slow: group all data then filter
SELECT region, COUNT(*) as order_count
FROM `my_dataset.orders`
GROUP BY region
HAVING order_count > 100;

-- Faster: filter first, reducing data that needs to be shuffled
SELECT region, COUNT(*) as order_count
FROM `my_dataset.orders`
WHERE order_date > '2024-01-01'  -- Reduce data before shuffle
GROUP BY region
HAVING order_count > 100;
```

### Pattern 4 - Too Many Stages

Overly complex queries with many CTEs and subqueries can create too many execution stages, each with overhead.

```sql
-- Instead of many nested CTEs, use intermediate tables
-- Break complex analytical queries into steps

-- Step 1: filtered base data
CREATE TEMP TABLE step1 AS
SELECT customer_id, order_date, total_amount
FROM `my_dataset.orders`
WHERE order_date > '2024-01-01';

-- Step 2: customer aggregation
CREATE TEMP TABLE step2 AS
SELECT customer_id, SUM(total_amount) as total_spent, COUNT(*) as order_count
FROM step1
GROUP BY customer_id;

-- Step 3: final analysis
SELECT s2.*, c.segment
FROM step2 s2
JOIN `my_dataset.customers` c ON s2.customer_id = c.customer_id
WHERE s2.order_count > 5;
```

## Using JOBS_TIMELINE for Detailed Analysis

The JOBS_TIMELINE view gives you per-second granularity of slot usage during query execution.

```sql
-- Analyze slot usage over time for a specific query
SELECT
  period_start,
  period_slot_ms / 1000 as slot_seconds,
  SAFE_DIVIDE(period_slot_ms, 1000) as slots_active
FROM `region-us`.INFORMATION_SCHEMA.JOBS_TIMELINE_BY_PROJECT
WHERE job_id = 'your-job-id'
ORDER BY period_start;
```

This helps you understand whether your query has a consistent slot usage pattern or spikes at certain stages.

## Building a Performance Dashboard

Combine INFORMATION_SCHEMA queries to create a comprehensive performance view.

```sql
-- Performance summary by user over the last 7 days
SELECT
  user_email,
  COUNT(*) as total_queries,
  SUM(total_bytes_processed) / POWER(1024, 4) as tb_processed,
  SUM(total_slot_ms) / 1000 / 3600 as slot_hours,
  AVG(TIMESTAMP_DIFF(end_time, start_time, SECOND)) as avg_duration_seconds,
  COUNTIF(error_result IS NOT NULL) as failed_queries
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
GROUP BY user_email
ORDER BY slot_hours DESC;
```

## Summary

Diagnosing slow BigQuery queries is systematic: use INFORMATION_SCHEMA to find the worst offenders, then use the execution plan to understand why they are slow. Look for full table scans (missing partition pruning), data skew in joins, excessive shuffling, and slot contention. Fix by adding proper filters, breaking complex queries into steps, handling skewed keys, and reducing data volume before expensive operations. Track performance over time to catch regressions early.
