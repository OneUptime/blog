# How to Optimize ORDER BY Key Selection in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, OrderBy, MergeTree, Index, Performance, Query

Description: Learn how to design optimal ORDER BY keys in ClickHouse MergeTree tables to maximize primary index effectiveness and minimize granules read for common queries.

---

The `ORDER BY` clause in a ClickHouse MergeTree table defines both the physical sort order of data on disk and the primary index used for query pruning. Getting this right is the single most impactful schema decision you can make. A poorly chosen key forces full table scans; the right key can reduce reads from billions of rows to thousands.

## How ORDER BY Affects Query Performance

Data in a MergeTree table is physically sorted by the `ORDER BY` columns. The sparse primary index stores one entry per 8192 rows (one granule). When a query filters on the leading columns of the `ORDER BY` key, ClickHouse performs a binary search on the index to find the relevant granules and skips everything else.

The more selective the filter, and the better it aligns with the key prefix, the fewer granules are read.

## The Cardinality Rule

Place columns in `ORDER BY` from highest to lowest cardinality of the columns you most frequently filter on:

```sql
-- Good: tenant_id (high cardinality) -> ts (always filtered by time)
ORDER BY (tenant_id, ts)

-- Bad: status (3 values) -> tenant_id -> ts
-- Low-cardinality first means the index barely prunes
ORDER BY (status, tenant_id, ts)
```

## Analyzing Your Query Patterns

Before choosing a key, catalog your most frequent queries:

```sql
SELECT
    query,
    count() AS frequency,
    avg(query_duration_ms) AS avg_ms,
    sum(read_rows) AS total_rows_read
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query NOT LIKE '%system%'
  AND event_time > now() - INTERVAL 7 DAY
GROUP BY query
ORDER BY frequency DESC
LIMIT 20;
```

Extract the `WHERE` clause columns that appear most often. Those are your candidate key columns.

## Single-Tenant SaaS: Optimize for Tenant + Time

```sql
CREATE TABLE events
(
    tenant_id  UInt32,
    user_id    UInt64,
    event_type String,
    ts         DateTime
)
ENGINE = MergeTree()
ORDER BY (tenant_id, ts);
```

Common queries:

```sql
-- Uses full primary key prefix - optimal
SELECT count()
FROM events
WHERE tenant_id = 42
  AND ts > now() - INTERVAL 1 DAY;

-- Uses only first column - still good
SELECT count()
FROM events
WHERE tenant_id = 42;
```

## Multi-Column Filters: Match the Prefix

If your most common query filters on `(region, service_id, ts)`, put those first:

```sql
CREATE TABLE service_metrics
(
    region      LowCardinality(String),
    service_id  UInt16,
    metric_name LowCardinality(String),
    value       Float32,
    ts          DateTime
)
ENGINE = MergeTree()
ORDER BY (region, service_id, ts);
```

Queries that provide `region` and `service_id` get maximum pruning. Queries that omit `region` still benefit from the `service_id` portion, but only within the region-sorted data.

## Handling Queries on Different Column Subsets

When different query patterns require different key orderings, use projections or separate tables:

```sql
CREATE TABLE http_logs
(
    domain   String,
    status   UInt16,
    url      String,
    bytes    UInt32,
    ts       DateTime,

    -- Projection for status-first queries
    PROJECTION proj_by_status
    (
        SELECT * ORDER BY (status, ts)
    )
)
ENGINE = MergeTree()
ORDER BY (domain, ts);
```

## Tradeoffs: More Key Columns vs Compression

Every additional column in `ORDER BY` increases CPU time during data ingestion (more columns to sort) and may reduce compression for non-key columns (the tighter sort order constrains how values in non-key columns are arranged):

```sql
-- Balanced: 3 columns cover common query patterns
ORDER BY (tenant_id, service_id, ts)

-- Over-specified: 6 columns, diminishing returns
ORDER BY (tenant_id, service_id, region, level, event_type, ts)
```

Test with real data: `EXPLAIN indexes = 1` shows how many granules each query reads.

## Verifying Key Effectiveness

```sql
-- After creating the table and inserting data
EXPLAIN indexes = 1
SELECT count()
FROM service_metrics
WHERE region = 'us-east-1'
  AND service_id = 42
  AND ts BETWEEN '2024-01-01' AND '2024-01-08';
```

Target: `Granules: <5% of total`. If you see more, your key order may not match the query filter pattern.

## Using PRIMARY KEY Separately from ORDER BY

You can specify a shorter `PRIMARY KEY` to keep the index small while sorting more precisely:

```sql
CREATE TABLE detailed_logs
(
    service_id  UInt16,
    ts          DateTime,
    level       UInt8,
    message     String
)
ENGINE = MergeTree()
PRIMARY KEY (service_id, ts)
ORDER BY (service_id, ts, level);
```

The primary index covers `(service_id, ts)`, using less memory. Data is sorted by `(service_id, ts, level)`, so queries filtering on `level` after providing `service_id` and `ts` still benefit from the sort order, even though `level` is not in the index.

## Altering ORDER BY on an Existing Table

You can add new columns to the end of the `ORDER BY` key using `ALTER TABLE`:

```sql
-- Add a column to the end of the existing sorting key
ALTER TABLE events MODIFY ORDER BY (tenant_id, ts, user_id);
```

However, you cannot remove columns or reorder existing ones. For a fundamentally different key order, you need to recreate the table:

```sql
-- Create a new table with the correct key
CREATE TABLE events_v2 AS events
ENGINE = MergeTree()
ORDER BY (tenant_id, ts, user_id);

-- Migrate data
INSERT INTO events_v2 SELECT * FROM events;

-- Rename tables
RENAME TABLE events TO events_old, events_v2 TO events;
```

## Key Selection Checklist

- List your top 5-10 most frequent query patterns
- Identify which columns appear in `WHERE` clauses
- Order by: (most selective filter column first) then time
- Verify with `EXPLAIN indexes = 1` after creating the table
- Keep the key to 2-4 columns for maintainability
- Use `PRIMARY KEY` subset if memory is a concern

## Summary

The `ORDER BY` key is the foundation of ClickHouse query performance. Design it around your actual query access patterns, not your intuition about data structure. Prioritize high-cardinality filter columns, always include a timestamp column, and validate effectiveness with `EXPLAIN indexes = 1`. Getting the key right can mean the difference between 10ms and 10-second queries on the same dataset.
