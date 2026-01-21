# How to Handle High-Cardinality Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, High Cardinality, Performance, Database, Analytics, Optimization, Schema Design

Description: Strategies for efficiently storing and querying high-cardinality dimensions in ClickHouse, including column encoding, schema design patterns, and query optimization techniques for columns with millions of unique values.

---

High-cardinality columns contain many unique values: user IDs, session IDs, IP addresses, UUIDs. These columns challenge any analytical database because traditional optimizations like dictionary encoding don't help when every value is unique. This guide covers strategies for handling high-cardinality data in ClickHouse.

## Understanding the Problem

Low-cardinality columns (like `country` or `event_type`) compress well and aggregate quickly. High-cardinality columns don't:

| Column Type | Example | Unique Values | Compression | GROUP BY Speed |
|-------------|---------|---------------|-------------|----------------|
| Low cardinality | country | ~200 | Excellent | Fast |
| Medium cardinality | city | ~100,000 | Good | Moderate |
| High cardinality | user_id | Millions | Poor | Slow |
| Ultra-high cardinality | session_id | Billions | Very Poor | Very Slow |

## Strategy 1: Don't Use LowCardinality

LowCardinality is great for columns with under 10,000 unique values. For high-cardinality columns, it hurts performance:

```sql
-- BAD: LowCardinality on high-cardinality column
CREATE TABLE events_bad
(
    user_id LowCardinality(String),  -- Millions of users = bad
    event_type LowCardinality(String)  -- Hundreds of types = good
)
ENGINE = MergeTree();

-- GOOD: Regular String or native type for high-cardinality
CREATE TABLE events_good
(
    user_id UInt64,  -- Native integer type
    event_type LowCardinality(String)
)
ENGINE = MergeTree();
```

Use native types when possible:
- UUIDs: Use `UUID` type instead of `String`
- User IDs: Use `UInt64` instead of `String`
- IP addresses: Use `IPv4`/`IPv6` instead of `String`

## Strategy 2: Choose the Right ORDER BY

The ORDER BY determines physical data layout. For high-cardinality lookups, include the column in ORDER BY:

```sql
-- If you frequently query by user_id:
CREATE TABLE user_events
(
    user_id UInt64,
    event_time DateTime,
    event_type LowCardinality(String)
)
ENGINE = MergeTree()
ORDER BY (user_id, event_time);

-- Now this query is fast:
SELECT * FROM user_events WHERE user_id = 12345;
```

But if you can't put the high-cardinality column first, use skip indexes:

```sql
CREATE TABLE events
(
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt64,

    -- Bloom filter helps find specific user_ids
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY (event_type, event_time);
```

## Strategy 3: Pre-Aggregate to Reduce Cardinality

Instead of storing every event, pre-aggregate by the high-cardinality dimension:

```sql
-- Raw events (high volume)
CREATE TABLE events_raw
(
    event_time DateTime,
    user_id UInt64,
    event_type String,
    duration_ms UInt32
)
ENGINE = MergeTree()
ORDER BY (event_time);

-- Pre-aggregated by user (much smaller)
CREATE TABLE user_daily_stats
(
    date Date,
    user_id UInt64,
    event_count UInt64,
    total_duration UInt64
)
ENGINE = SummingMergeTree()
ORDER BY (user_id, date);

-- Materialized view to auto-aggregate
CREATE MATERIALIZED VIEW user_daily_mv TO user_daily_stats AS
SELECT
    toDate(event_time) AS date,
    user_id,
    count() AS event_count,
    sum(duration_ms) AS total_duration
FROM events_raw
GROUP BY date, user_id;
```

## Strategy 4: Use Approximate Functions

Exact counts on high-cardinality columns are expensive. Use approximate functions:

```sql
-- SLOW: Exact unique count
SELECT count(DISTINCT user_id) FROM events;

-- FAST: Approximate unique count (typically < 2% error)
SELECT uniq(user_id) FROM events;

-- FASTER: Even more approximate (< 4% error, but faster)
SELECT uniqHLL12(user_id) FROM events;

-- For combining across time periods, use state functions
SELECT uniqMerge(user_count)
FROM (
    SELECT uniqState(user_id) AS user_count
    FROM events
    GROUP BY toDate(event_time)
);
```

## Strategy 5: Sampling for Large Aggregations

Sample data to speed up queries on high-cardinality columns:

```sql
-- Full scan: slow
SELECT
    user_id,
    count() AS events
FROM events
GROUP BY user_id
ORDER BY events DESC
LIMIT 100;

-- Sampled: fast but approximate
SELECT
    user_id,
    count() * 10 AS events  -- Scale up by sample factor
FROM events
SAMPLE 0.1  -- 10% sample
GROUP BY user_id
ORDER BY events DESC
LIMIT 100;
```

## Strategy 6: Probabilistic Data Structures

Use HyperLogLog for cardinality estimation:

```sql
-- Store pre-computed HLL sketches
CREATE TABLE daily_uniques
(
    date Date,
    segment LowCardinality(String),
    unique_users AggregateFunction(uniq, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (date, segment);

-- Populate with state function
INSERT INTO daily_uniques
SELECT
    toDate(event_time) AS date,
    segment,
    uniqState(user_id) AS unique_users
FROM events
GROUP BY date, segment;

-- Query merges HLL sketches (very fast)
SELECT
    segment,
    uniqMerge(unique_users) AS total_unique_users
FROM daily_uniques
WHERE date >= today() - 30
GROUP BY segment;
```

## Strategy 7: Hierarchical Aggregation

Build aggregation hierarchies that reduce cardinality at each level:

```sql
-- Level 1: Raw events (billions of rows)
CREATE TABLE events (...);

-- Level 2: Per-user hourly (millions of rows)
CREATE TABLE user_hourly
(
    hour DateTime,
    user_id UInt64,
    event_count UInt32,
    ...
)
ENGINE = SummingMergeTree()
ORDER BY (user_id, hour);

-- Level 3: Per-user daily (smaller)
CREATE TABLE user_daily
(
    date Date,
    user_id UInt64,
    event_count UInt32,
    ...
)
ENGINE = SummingMergeTree()
ORDER BY (user_id, date);

-- Level 4: Per-segment daily (much smaller)
CREATE TABLE segment_daily
(
    date Date,
    segment LowCardinality(String),
    unique_users AggregateFunction(uniq, UInt64),
    total_events UInt64
)
ENGINE = AggregatingMergeTree()
ORDER BY (date, segment);
```

Query the appropriate level:
- User-specific queries: Use `user_hourly` or `user_daily`
- Segment-level dashboards: Use `segment_daily`
- Raw event analysis: Use `events` with sampling

## Strategy 8: Bitmap Indexes for Set Operations

Use bitmaps for efficient set operations on high-cardinality integer columns:

```sql
-- Store user sets as bitmaps
CREATE TABLE daily_active_users
(
    date Date,
    segment LowCardinality(String),
    user_bitmap AggregateFunction(groupBitmap, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (date, segment);

-- Populate with bitmap aggregation
INSERT INTO daily_active_users
SELECT
    toDate(event_time) AS date,
    segment,
    groupBitmapState(user_id) AS user_bitmap
FROM events
GROUP BY date, segment;

-- Query: Count users active in multiple days
SELECT
    segment,
    bitmapCardinality(
        bitmapAnd(
            groupBitmapMergeState(user_bitmap),
            -- Compare with another day's bitmap
        )
    ) AS retained_users
FROM daily_active_users
WHERE date IN ('2024-01-01', '2024-01-08')
GROUP BY segment;
```

## Strategy 9: External Dictionaries for Lookups

Move high-cardinality dimension data to dictionaries:

```sql
-- Instead of joining large user table
SELECT e.*, u.name, u.country
FROM events e
JOIN users u ON e.user_id = u.user_id;

-- Use dictionary lookup (much faster)
SELECT
    e.*,
    dictGet('users_dict', 'name', user_id) AS name,
    dictGet('users_dict', 'country', user_id) AS country
FROM events e;
```

Dictionary definition:
```xml
<dictionary>
    <name>users_dict</name>
    <source>
        <clickhouse>
            <table>users</table>
        </clickhouse>
    </source>
    <layout>
        <hashed/>
    </layout>
    <structure>
        <id>
            <name>user_id</name>
        </id>
        <attribute>
            <name>name</name>
            <type>String</type>
        </attribute>
        <attribute>
            <name>country</name>
            <type>String</type>
        </attribute>
    </structure>
    <lifetime>
        <min>300</min>
        <max>360</max>
    </lifetime>
</dictionary>
```

## Strategy 10: Partition by High-Cardinality Prefix

For very large tables, partition by a hash of the high-cardinality column:

```sql
CREATE TABLE events
(
    event_time DateTime,
    user_id UInt64,
    event_type String
)
ENGINE = MergeTree()
PARTITION BY (toYYYYMM(event_time), user_id % 100)
ORDER BY (user_id, event_time);
```

This creates 100 sub-partitions per month, allowing parallel processing and better pruning for user-specific queries.

## Query Optimization Tips

### Use LIMIT Early

```sql
-- BAD: Sorts all results then limits
SELECT user_id, count() AS cnt
FROM events
GROUP BY user_id
ORDER BY cnt DESC
LIMIT 100;

-- BETTER: Use LIMIT BY for approximate top-N
SELECT user_id, count() AS cnt
FROM events
GROUP BY user_id
ORDER BY cnt DESC
LIMIT 100
SETTINGS max_rows_to_group_by = 1000000, group_by_overflow_mode = 'any';
```

### Filter Before Aggregating

```sql
-- BAD: Aggregates all users, then filters
SELECT user_id, count() AS events
FROM events
GROUP BY user_id
HAVING events > 100;

-- BETTER: Pre-filter if possible
SELECT user_id, count() AS events
FROM events
WHERE user_id IN (SELECT user_id FROM active_users)
GROUP BY user_id;
```

### Use Projection for Common Patterns

```sql
-- Add projection for user-centric queries
ALTER TABLE events ADD PROJECTION user_events_proj
(
    SELECT *
    ORDER BY user_id, event_time
);

ALTER TABLE events MATERIALIZE PROJECTION user_events_proj;
```

## Monitoring Cardinality

Track cardinality to identify problematic columns:

```sql
-- Check column cardinality
SELECT
    'user_id' AS column,
    uniq(user_id) AS cardinality,
    count() AS total_rows,
    cardinality / total_rows AS cardinality_ratio
FROM events

UNION ALL

SELECT
    'event_type' AS column,
    uniq(event_type),
    count(),
    uniq(event_type) / count()
FROM events;
```

---

High-cardinality columns require different strategies than low-cardinality ones. Use native types instead of LowCardinality, include high-cardinality columns in ORDER BY when they're frequently filtered, pre-aggregate to reduce cardinality, and use approximate functions when exact counts aren't needed. The key is matching your storage and query patterns to how the data will actually be used.
