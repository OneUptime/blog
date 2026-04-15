# How to Optimize UNION ALL Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UNION ALL, Performance, Query Optimization, Merge, Schema Design

Description: Learn how to optimize UNION ALL queries in ClickHouse by using Merge engine, query parallelization, and restructuring data to avoid unions altogether.

---

`UNION ALL` queries combine results from multiple SELECT statements. When overused, they cause redundant scans and increase query complexity. ClickHouse provides tools to optimize or eliminate UNION ALL patterns.

## How ClickHouse Executes UNION ALL

ClickHouse executes each branch of UNION ALL in parallel when `max_threads` allows it. The results are concatenated. Each branch runs as an independent query, so optimizations like primary key usage apply independently to each branch.

## When UNION ALL Is and Isn't Needed

Avoid UNION ALL when a single query with OR conditions works:

```sql
-- Unnecessary UNION ALL
SELECT user_id, 'purchase' AS type FROM purchases WHERE date = today()
UNION ALL
SELECT user_id, 'view' AS type FROM views WHERE date = today();

-- Better: single table with event_type column
SELECT user_id, event_type FROM events
WHERE event_date = today() AND event_type IN ('purchase', 'view');
```

## Using the Merge Engine

The `Merge` engine creates a virtual table that queries multiple real tables with UNION ALL semantics:

```sql
-- Monthly partitioned tables
CREATE TABLE events_2026_01 AS events ENGINE = MergeTree() ORDER BY event_time;
CREATE TABLE events_2026_02 AS events ENGINE = MergeTree() ORDER BY event_time;
CREATE TABLE events_2026_03 AS events ENGINE = MergeTree() ORDER BY event_time;

-- Merge engine to query all at once
CREATE TABLE events_all AS events
ENGINE = Merge(currentDatabase(), '^events_20');

-- Queries events_all scan all matching tables
SELECT count() FROM events_all WHERE event_type = 'purchase';
```

## Optimizing Multi-Source Aggregations

For aggregating across many tables, push aggregation into each branch:

```sql
-- Slow: union then aggregate
SELECT event_type, sum(count) AS total FROM (
    SELECT event_type, count() AS count FROM events_jan GROUP BY event_type
    UNION ALL
    SELECT event_type, count() AS count FROM events_feb GROUP BY event_type
    UNION ALL
    SELECT event_type, count() AS count FROM events_mar GROUP BY event_type
)
GROUP BY event_type;

-- Better: use the Merge engine
SELECT event_type, count() AS total
FROM events_all
GROUP BY event_type;
```

## Parallel UNION ALL Execution

Control parallelism for UNION ALL branches:

```sql
-- Each branch can use multiple threads
SET max_threads = 8;
SET union_default_mode = 'ALL';  -- Makes bare UNION behave as UNION ALL (default is '' which requires explicit ALL or DISTINCT)

-- Check that branches run in parallel
EXPLAIN PIPELINE
SELECT * FROM table_a WHERE id > 100
UNION ALL
SELECT * FROM table_b WHERE id > 100;
```

## Using UNION ALL for Incremental Loading

UNION ALL is useful when combining a historical table with a hot delta:

```sql
-- Historical data in cold storage, recent data in fast storage
SELECT * FROM historical_events
UNION ALL
SELECT * FROM recent_events
WHERE event_time >= today() - 7;
```

Consider using a Merge engine table with a tiered storage policy instead for cleaner access patterns.

## Avoiding UNION ALL with Table Functions

Use `merge()` table function for ad-hoc multi-table queries:

```sql
-- Query tables matching a pattern
SELECT count() FROM merge('analytics_db', '^events_202')
WHERE event_type = 'purchase';
```

## Checking UNION ALL Query Cost

```sql
SELECT
    query_duration_ms,
    read_rows,
    read_bytes,
    memory_usage
FROM system.query_log
WHERE query LIKE '%UNION ALL%'
  AND type = 'QueryFinish'
ORDER BY query_duration_ms DESC
LIMIT 10;
```

## Summary

Optimize UNION ALL in ClickHouse by consolidating separate tables into a unified schema where practical, using the `Merge` engine to create unified virtual views over multiple tables, pushing aggregations into each branch rather than aggregating the unioned result, and using `merge()` table function for ad-hoc multi-table queries. Reserve explicit UNION ALL for genuinely heterogeneous data sources.
