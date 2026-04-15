# How to Design Schemas for Mixed Query Patterns in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Design, Query Pattern, Performance, Projection, Materialized View

Description: Learn how to design ClickHouse schemas that serve multiple conflicting query patterns using projections, materialized views, and tiered table architectures.

---

Most production ClickHouse deployments have diverse query patterns: time-range lookups, user-specific queries, aggregation dashboards, and full-table scans. A single ORDER BY key cannot optimize all of them. The solution is a combination of projections, materialized views, and schema tiering.

## Identifying Your Query Patterns

Start by cataloging your most frequent queries:

```sql
-- Find top query patterns
SELECT
    normalizeQuery(query) AS normalized_query,
    count() AS frequency,
    avg(query_duration_ms) AS avg_ms,
    sum(read_bytes) / count() AS avg_bytes_read
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date >= today() - 7
  AND query NOT LIKE '%system%'
GROUP BY normalized_query
ORDER BY frequency * avg_ms DESC
LIMIT 20;
```

## Pattern: Time-Range + User Lookup

Your data might have both time-range queries and per-user queries:

```sql
-- Query type A: time range (works well with ORDER BY event_time first)
SELECT count() FROM events WHERE event_time >= now() - INTERVAL 1 DAY;

-- Query type B: user lookup (works well with ORDER BY user_id first)
SELECT * FROM events WHERE user_id = 12345 ORDER BY event_time DESC LIMIT 100;
```

A single ORDER BY cannot be optimal for both. Use a projection to serve the user lookup:

```sql
CREATE TABLE events (
    event_time DateTime,
    user_id UInt64,
    event_type LowCardinality(String),
    value Float64,
    -- Projection for per-user queries
    PROJECTION user_events_proj (
        SELECT * ORDER BY user_id, event_time
    )
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time);
```

Now ClickHouse automatically uses the right index:

```sql
-- Uses main ORDER BY (event_type, event_time)
SELECT count() FROM events WHERE event_type = 'purchase' AND event_time >= today();

-- Uses projection (user_id, event_time)
SELECT * FROM events WHERE user_id = 12345 ORDER BY event_time DESC LIMIT 100;
```

## Pattern: Aggregation Dashboard + Raw Data

Use materialized views to serve aggregation dashboards without scanning raw data:

```sql
-- Raw events table
CREATE TABLE raw_events (
    event_time DateTime,
    event_type LowCardinality(String),
    country LowCardinality(String),
    value Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY event_time;

-- Pre-aggregated for dashboard
CREATE TABLE event_hourly_summary (
    event_hour DateTime,
    event_type LowCardinality(String),
    country LowCardinality(String),
    event_count UInt64,
    total_value Float64
) ENGINE = SummingMergeTree((event_count, total_value))
ORDER BY (event_hour, event_type, country);

CREATE MATERIALIZED VIEW event_hourly_mv
TO event_hourly_summary
AS SELECT
    toStartOfHour(event_time) AS event_hour,
    event_type,
    country,
    count() AS event_count,
    sum(value) AS total_value
FROM raw_events
GROUP BY event_hour, event_type, country;
```

Dashboard queries hit the summary table, raw access goes to the base table.

## Pattern: Hot and Cold Data with Tiering

Recent data is queried frequently, old data rarely. Use different storage tiers:

```sql
-- Hot tier: fast NVMe SSD
-- Cold tier: HDD or S3

ALTER TABLE events MODIFY SETTING
  storage_policy = 'hot_cold',
  merge_with_ttl_timeout = 300;

ALTER TABLE events MODIFY TTL
  event_time + INTERVAL 30 DAY TO DISK 'cold_disk',
  event_time + INTERVAL 365 DAY TO DISK 's3_disk';
```

## Pattern: Multiple GROUP BY Keys

For tables that support many different grouping combinations, use projections for each common pattern:

```sql
CREATE TABLE sales (
    sale_date Date,
    region LowCardinality(String),
    product_category LowCardinality(String),
    salesperson_id UInt32,
    amount Decimal(18, 2),
    PROJECTION by_region (
        SELECT region, sale_date, sum(amount) GROUP BY region, sale_date
    ),
    PROJECTION by_product (
        SELECT product_category, sale_date, sum(amount) GROUP BY product_category, sale_date
    )
) ENGINE = MergeTree()
ORDER BY (sale_date, salesperson_id);
```

## Monitoring Which Projections Are Used

```sql
SELECT
    projections AS projection_name,
    count() AS uses
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date >= today() - 7
  AND projections != ''
GROUP BY projection_name
ORDER BY uses DESC;
```

## Summary

Design ClickHouse schemas for mixed query patterns using projections for alternative sort orders, materialized views for pre-computed aggregations, and TTL-based storage tiering for hot/cold data separation. Start by profiling actual query patterns, identify the top 3-5 query templates, and ensure each has an appropriate index strategy - either in the main ORDER BY or via a projection.
