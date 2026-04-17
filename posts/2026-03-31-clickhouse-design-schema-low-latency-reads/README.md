# How to Design a ClickHouse Schema for Low-Latency Reads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Design, Query Performance, MergeTree, Index

Description: Design a ClickHouse schema for low-latency reads using optimal ORDER BY keys, skip indexes, projections, and column type selection.

---

ClickHouse achieves sub-second query latency on billions of rows through columnar storage, sparse indexes, and vectorized execution. Getting the best read performance requires designing the schema around your query patterns from the start.

## Choose the ORDER BY Key Based on Query Patterns

The ORDER BY key is ClickHouse's primary index. It determines how quickly queries can prune data:

```sql
-- If most queries filter by (event_date, user_id):
CREATE TABLE events (
    event_date  Date,
    event_time  DateTime64(3),
    user_id     UInt64,
    event_type  LowCardinality(String),
    revenue     Decimal(18, 2)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id);
```

Rules for ORDER BY:
- Put low-cardinality columns first (date, region, status)
- Put high-cardinality columns last (user_id, session_id)
- Match the most common WHERE filter columns

## Add Skip Indexes for Secondary Filters

For columns not in ORDER BY, use skip indexes:

```sql
-- Bloom filter for string matching
ALTER TABLE events
ADD INDEX idx_event_type event_type TYPE bloom_filter(0.01) GRANULARITY 4;

-- Set index for IN queries
ALTER TABLE events
ADD INDEX idx_region region TYPE set(100) GRANULARITY 1;

-- MinMax for range queries
ALTER TABLE events
ADD INDEX idx_revenue revenue TYPE minmax GRANULARITY 4;
```

## Use Projections for Alternative Sort Orders

Projections maintain a pre-sorted copy of selected columns:

```sql
ALTER TABLE events
ADD PROJECTION proj_by_revenue (
    SELECT event_date, user_id, revenue
    ORDER BY (event_date, revenue)
);
ALTER TABLE events MATERIALIZE PROJECTION proj_by_revenue;
```

Queries sorted by revenue now use the projection:

```sql
SELECT user_id, revenue
FROM events
WHERE event_date = today()
ORDER BY revenue DESC
LIMIT 100;
```

## Use Aggregating Materialized Views

Pre-aggregate frequent queries:

```sql
CREATE MATERIALIZED VIEW daily_revenue_mv
ENGINE = SummingMergeTree()
ORDER BY (event_date, user_id)
AS
SELECT
    toDate(event_time)  AS event_date,
    user_id,
    sum(revenue)        AS total_revenue,
    count()             AS event_count
FROM events
GROUP BY event_date, user_id;
```

Queries against `daily_revenue_mv` are millisecond-fast.

## Avoid Wide Rows

Keep row sizes small. For user attributes, use a separate table:

```sql
-- Lean events table (fast reads)
CREATE TABLE events (
    event_date  Date,
    user_id     UInt64,
    event_type  LowCardinality(String),
    value       Float32
) ENGINE = MergeTree()
ORDER BY (event_date, user_id);

-- Separate user dimension table (enrichment joins)
CREATE TABLE users (
    user_id     UInt64,
    country     LowCardinality(String),
    plan        LowCardinality(String)
) ENGINE = ReplacingMergeTree()
ORDER BY user_id;
```

## Use Appropriate Data Types

```sql
-- Instead of String for known-value columns:
event_type   LowCardinality(String)  -- Dictionary-encoded, 4-10x smaller

-- Use UInt32 instead of UInt64 when values fit
user_segment UInt8  -- For 0-255 values (segment IDs, categories)

-- Use Date instead of DateTime when time is not needed
event_date   Date   -- 2 bytes vs 4 bytes for DateTime
```

## Summary

Low-latency reads in ClickHouse are achieved by matching the ORDER BY key to the most common query filters, adding skip indexes for secondary filter columns, using projections for alternative sort orders, and pre-aggregating with materialized views. Choose narrow data types like `LowCardinality`, `UInt32`, and `Date` to minimize storage and maximize CPU cache efficiency.
