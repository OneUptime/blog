# How to Create a Materialized View in ClickHouse Step by Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Performance, Aggregation, Real-Time

Description: Step-by-step guide to creating materialized views in ClickHouse to pre-aggregate data and dramatically speed up analytical queries on large datasets.

---

## What Is a Materialized View in ClickHouse

A ClickHouse materialized view is a trigger that executes a SELECT query on new data as it is inserted and stores the results in a target table. Unlike traditional databases, ClickHouse materialized views are not snapshots - they are incremental transforms that run on every new INSERT.

The workflow is:
1. Data is inserted into the **source table**
2. The materialized view query runs on the new rows
3. Results are inserted into the **target table**
4. Queries read from the **target table** for fast pre-aggregated results

## Step 1: Create the Source Table

```sql
CREATE TABLE page_views (
    ts DateTime,
    user_id UInt64,
    page_url String,
    country LowCardinality(String),
    bytes_sent UInt32,
    status_code UInt16
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id);
```

## Step 2: Create the Target (Aggregation) Table

The target table stores the pre-aggregated results. Use `AggregatingMergeTree` for aggregation state storage:

```sql
CREATE TABLE page_views_hourly (
    hour DateTime,
    page_url String,
    country LowCardinality(String),
    -- AggregateFunction types for incremental aggregation
    views_count AggregateFunction(count),
    unique_users AggregateFunction(uniq, UInt64),
    total_bytes AggregateFunction(sum, UInt32),
    avg_bytes AggregateFunction(avg, UInt32)
) ENGINE = AggregatingMergeTree()
ORDER BY (hour, page_url, country);
```

## Step 3: Create the Materialized View

```sql
CREATE MATERIALIZED VIEW page_views_hourly_mv
TO page_views_hourly
AS SELECT
    toStartOfHour(ts) AS hour,
    page_url,
    country,
    countState() AS views_count,
    uniqState(user_id) AS unique_users,
    sumState(bytes_sent) AS total_bytes,
    avgState(bytes_sent) AS avg_bytes
FROM page_views
GROUP BY hour, page_url, country;
```

## Step 4: Backfill Existing Data

The materialized view only processes new inserts by default. To populate with existing data:

```sql
-- Insert existing data into the target through the source table's query
INSERT INTO page_views_hourly
SELECT
    toStartOfHour(ts) AS hour,
    page_url,
    country,
    countState() AS views_count,
    uniqState(user_id) AS unique_users,
    sumState(bytes_sent) AS total_bytes,
    avgState(bytes_sent) AS avg_bytes
FROM page_views
GROUP BY hour, page_url, country;
```

## Step 5: Query the Materialized View

Use the `-Merge` combinator to finalize aggregation states:

```sql
-- Query the pre-aggregated table
SELECT
    hour,
    page_url,
    country,
    countMerge(views_count) AS views,
    uniqMerge(unique_users) AS unique_users,
    sumMerge(total_bytes) AS total_bytes,
    round(avgMerge(avg_bytes), 0) AS avg_bytes
FROM page_views_hourly
WHERE hour >= now() - INTERVAL 24 HOUR
GROUP BY hour, page_url, country
ORDER BY views DESC
LIMIT 20;
```

## Simple Materialized View (Without AggregatingMergeTree)

For simpler transforms that don't need partial aggregation states:

```sql
-- Source table
CREATE TABLE raw_logs (
    ts DateTime,
    level String,
    message String,
    service String
) ENGINE = MergeTree()
ORDER BY ts;

-- Target table - errors only
CREATE TABLE error_logs (
    ts DateTime,
    service LowCardinality(String),
    message String
) ENGINE = MergeTree()
ORDER BY (ts, service);

-- Simple filter materialized view
CREATE MATERIALIZED VIEW error_logs_mv
TO error_logs
AS SELECT ts, service, message
FROM raw_logs
WHERE level = 'ERROR';
```

## Materialized View with SummingMergeTree

For simple SUM aggregations, `SummingMergeTree` is simpler:

```sql
CREATE TABLE daily_sales_summary (
    sale_date Date,
    product_id UInt32,
    total_revenue Float64,
    total_units UInt64
) ENGINE = SummingMergeTree((total_revenue, total_units))
ORDER BY (sale_date, product_id);

CREATE MATERIALIZED VIEW daily_sales_mv
TO daily_sales_summary
AS SELECT
    toDate(sale_time) AS sale_date,
    product_id,
    sum(price * quantity) AS total_revenue,
    sum(quantity) AS total_units
FROM sales
GROUP BY sale_date, product_id;
```

## Managing Materialized Views

```sql
-- List all materialized views
SELECT name, create_table_query
FROM system.tables
WHERE engine = 'MaterializedView'
  AND database = currentDatabase();

-- See the underlying structure
SHOW CREATE TABLE page_views_hourly_mv;

-- Drop a materialized view (does NOT drop the target table)
DROP VIEW page_views_hourly_mv;

-- To also drop the target table
DROP TABLE page_views_hourly;
```

## Debugging Materialized Views

```sql
-- Check for errors in materialized view processing
SELECT *
FROM system.query_log
WHERE query LIKE '%page_views_hourly%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;

-- Monitor target table size
SELECT
    table,
    formatReadableSize(sum(bytes_on_disk)) AS size,
    sum(rows) AS rows
FROM system.parts
WHERE database = currentDatabase()
  AND table = 'page_views_hourly'
  AND active = 1
GROUP BY table;
```

## Summary

Creating a materialized view in ClickHouse involves three steps: creating a source table where raw data is inserted, creating a target table (typically `AggregatingMergeTree` or `SummingMergeTree`) that stores pre-aggregated results, and creating the materialized view itself that defines the transform. The view runs automatically on every insert, enabling real-time pre-aggregation for dramatically faster analytical queries. Backfill historical data separately by running the same aggregation query directly into the target table.
