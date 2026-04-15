# How to Optimize ORDER BY with LIMIT in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ORDER BY, Limit, Performance, Query Optimization, TopK

Description: Learn how to optimize ORDER BY with LIMIT queries in ClickHouse to get top-N results efficiently using partial sorting, index alignment, and pre-aggregation.

---

`ORDER BY ... LIMIT N` (top-N queries) are common in dashboards and reports. ClickHouse can optimize these significantly when the ORDER BY matches the table's primary key or when you use the right settings and engine choices.

## How ClickHouse Handles ORDER BY LIMIT

Without optimization, ClickHouse reads all matching rows, sorts them, then returns the top N. With a matching primary key, it can use a sorted read and stop early. Understanding this distinction is key to optimization.

## Aligning ORDER BY with Primary Key

When the ORDER BY in your query matches the table's ORDER BY key, ClickHouse can use a sorted stream and find top-N without a full sort:

```sql
-- Table ordered by (event_time, user_id)
CREATE TABLE events (
    event_time DateTime,
    user_id UInt64,
    event_type String
) ENGINE = MergeTree()
ORDER BY (event_time, user_id);

-- Efficient: ClickHouse can read in reverse order when ORDER BY is opposite to the key
SELECT event_time, user_id, event_type
FROM events
ORDER BY event_time DESC
LIMIT 100;
```

## Using LIMIT BY for Per-Group Top-N

`LIMIT BY` returns top N rows per group efficiently:

```sql
-- Top 5 events per user by event_time
SELECT user_id, event_time, event_type
FROM events
ORDER BY user_id, event_time DESC
LIMIT 5 BY user_id;
```

## Using argMax/argMin for Latest Value Per Group

Instead of ORDER BY with LIMIT, use `argMax` for the latest value per group:

```sql
-- Slow: full sort + LIMIT 1 per user
SELECT user_id, event_type
FROM (
    SELECT user_id, event_type,
           row_number() OVER (PARTITION BY user_id ORDER BY event_time DESC) AS rn
    FROM events
)
WHERE rn = 1;

-- Fast: argMax aggregation
SELECT user_id, argMax(event_type, event_time) AS latest_event
FROM events
GROUP BY user_id;
```

## Using topK for Approximate Top-N

For approximate results (very fast), use the `topK` aggregate function:

```sql
-- Approximate top 10 most common event types
SELECT topK(10)(event_type)
FROM events
WHERE toDate(event_time) = today();

-- Returns array: ['purchase', 'view', 'click', ...]
```

## Optimize Partial Sorting

Enable partial result sorting to reduce memory for ORDER BY LIMIT:

```sql
-- Use read_in_order optimization
SET optimize_read_in_order = 1;

-- Check if it's being used
EXPLAIN
SELECT event_time, user_id
FROM events
ORDER BY event_time DESC
LIMIT 1000;
-- Look for "ReadType: InOrder" in output
```

## Pre-Aggregating for Dashboard Leaderboards

For recurring top-N queries (leaderboards, hot pages), maintain a pre-aggregated table:

```sql
CREATE TABLE top_pages_hourly (
    event_hour DateTime,
    page_url String,
    view_count UInt64
) ENGINE = SummingMergeTree(view_count)
ORDER BY (event_hour, page_url);

-- Fast top-10 pages for current hour
SELECT page_url, sum(view_count) AS views
FROM top_pages_hourly
WHERE event_hour = toStartOfHour(now())
GROUP BY page_url
ORDER BY views DESC
LIMIT 10;
```

## Tuning Sort Buffer Size

For large ORDER BY operations, tune memory allocation:

```sql
SET max_bytes_before_external_sort = 5000000000;  -- spill sort to disk at 5 GB
SET max_memory_usage = 20000000000;               -- overall query limit
```

## Checking Sort Performance

Measure sort overhead:

```sql
SELECT
    query_duration_ms,
    ProfileEvents['ExternalSortWritePart'] AS external_sort_spills,
    memory_usage
FROM system.query_log
WHERE query LIKE '%ORDER BY%LIMIT%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

If `ExternalSortWritePart > 0`, your sort is spilling to disk - increase memory or add a pre-sorted index.

## Summary

Optimize ORDER BY LIMIT in ClickHouse by aligning your query ORDER BY with the table's primary key, using `argMax`/`argMin` for latest-per-group queries instead of sorting, applying `topK` for approximate top-N results, maintaining pre-sorted pre-aggregated tables for dashboards, and enabling `optimize_read_in_order` to exploit sorted reads.
