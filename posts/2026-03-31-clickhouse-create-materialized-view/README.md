# How to Create a Materialized View in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, Materialized View, Aggregation, Real-Time

Description: Learn how to create materialized views in ClickHouse using CREATE MATERIALIZED VIEW, including the TO table pattern, POPULATE, and real-time aggregation examples.

---

Materialized views in ClickHouse are trigger-based incremental transformations: every time a block of rows is inserted into a source table, ClickHouse automatically runs a SELECT against those new rows and inserts the result into a destination table. This makes them the primary mechanism for real-time pre-aggregation in ClickHouse - replacing expensive full-table scans on dashboards with reads of small, already-aggregated tables.

## Basic CREATE MATERIALIZED VIEW Syntax

```sql
CREATE MATERIALIZED VIEW [IF NOT EXISTS] [db.]view_name
[TO [db.]dest_table]
[ENGINE = engine]
[POPULATE]
AS SELECT ...;
```

There are two creation patterns: the implicit inner table pattern and the explicit `TO` table pattern.

## Pattern 1 - Implicit Inner Table

ClickHouse creates a hidden table to store the results. The view name is used for querying.

```sql
CREATE MATERIALIZED VIEW daily_event_counts
ENGINE = SummingMergeTree()
ORDER BY (event_date, event_type)
AS
SELECT
    toDate(event_time)          AS event_date,
    event_type,
    count()                     AS event_count
FROM raw_events
GROUP BY event_date, event_type;
```

The downside of the implicit pattern is that the storage table is named `.inner.daily_event_counts` internally and is harder to manage directly.

## Pattern 2 - Explicit TO Table (Recommended)

Create the destination table explicitly, then create the view pointing to it with `TO`. This is the recommended approach because you have full control over the destination table's engine and settings.

### Step 1 - Create the destination table

```sql
CREATE TABLE daily_event_counts_mv
(
    event_date   Date,
    event_type   LowCardinality(String),
    event_count  AggregateFunction(count)
)
ENGINE = AggregatingMergeTree()
ORDER BY (event_date, event_type);
```

### Step 2 - Create the materialized view pointing to it

```sql
CREATE MATERIALIZED VIEW daily_event_counts_view
TO daily_event_counts_mv
AS
SELECT
    toDate(event_time)          AS event_date,
    event_type,
    countState()                AS event_count
FROM raw_events
GROUP BY event_date, event_type;
```

### Step 3 - Query the destination table with merge combiners

```sql
SELECT
    event_date,
    event_type,
    countMerge(event_count) AS total_events
FROM daily_event_counts_mv
GROUP BY event_date, event_type
ORDER BY event_date, event_type;
```

The `-State` combiners (e.g., `countState`, `sumState`, `avgState`) store intermediate aggregation states. The `-Merge` combiners (e.g., `countMerge`, `sumMerge`, `avgMerge`) combine those states at query time.

## Populating Historical Data with POPULATE

By default, a materialized view only processes data inserted after its creation. Add `POPULATE` to backfill from existing data in the source table:

```sql
CREATE MATERIALIZED VIEW daily_event_counts_view
TO daily_event_counts_mv
POPULATE
AS
SELECT
    toDate(event_time)  AS event_date,
    event_type,
    countState()        AS event_count
FROM raw_events
GROUP BY event_date, event_type;
```

`POPULATE` reads the entire source table once during `CREATE`. Warning: any rows inserted into the source table while `POPULATE` is running may be missed. For critical pipelines, backfill manually after creation.

### Manual Backfill (safer than POPULATE)

```sql
-- 1. Create the view WITHOUT POPULATE
CREATE MATERIALIZED VIEW daily_event_counts_view
TO daily_event_counts_mv
AS
SELECT
    toDate(event_time)  AS event_date,
    event_type,
    countState()        AS event_count
FROM raw_events
GROUP BY event_date, event_type;

-- 2. Manually insert historical data
INSERT INTO daily_event_counts_mv
SELECT
    toDate(event_time)  AS event_date,
    event_type,
    countState()        AS event_count
FROM raw_events
WHERE event_time < now()
GROUP BY event_date, event_type;
```

## Chaining Materialized Views

Materialized views can feed other materialized views, creating multi-stage pipelines:

```sql
-- Stage 1: raw events -> per-minute counters
CREATE MATERIALIZED VIEW minute_counts_view
TO minute_counts
AS
SELECT
    toStartOfMinute(event_time) AS minute,
    event_type,
    countState()                AS cnt
FROM raw_events
GROUP BY minute, event_type;

-- Stage 2: per-minute counters -> hourly rollup
-- Note: the source is now the stage 1 destination table
CREATE MATERIALIZED VIEW hourly_counts_view
TO hourly_counts
AS
SELECT
    toStartOfHour(minute)   AS hour,
    event_type,
    countMerge(cnt)         AS cnt_merged
FROM minute_counts
GROUP BY hour, event_type;
```

## SummingMergeTree Example

For simple sums, `SummingMergeTree` is lighter than `AggregatingMergeTree`:

```sql
CREATE TABLE revenue_by_day
(
    event_date  Date,
    country     LowCardinality(String),
    revenue     Decimal(18,2)
)
ENGINE = SummingMergeTree((revenue))
ORDER BY (event_date, country);

CREATE MATERIALIZED VIEW revenue_by_day_view
TO revenue_by_day
AS
SELECT
    toDate(event_time)  AS event_date,
    country,
    sum(revenue)        AS revenue
FROM purchases
GROUP BY event_date, country;
```

Query the result (include `sum()` because parts may not be fully merged yet):

```sql
SELECT
    event_date,
    country,
    sum(revenue) AS total_revenue
FROM revenue_by_day
GROUP BY event_date, country
ORDER BY event_date, country;
```

## Inspecting and Managing Materialized Views

```sql
-- List materialized views
SELECT name, engine
FROM system.tables
WHERE database = 'my_db'
  AND engine = 'MaterializedView';

-- Show definition
SHOW CREATE TABLE daily_event_counts_view;

-- Drop a materialized view (does NOT drop the TO table)
DROP TABLE IF EXISTS daily_event_counts_view;
```

## Summary

Materialized views are ClickHouse's primary tool for real-time incremental aggregation. The `TO` table pattern gives you full control over destination storage and is preferred over implicit inner tables. Use `-State` and `-Merge` aggregate combiners with `AggregatingMergeTree` for flexible multi-step aggregations, or `SummingMergeTree` for straightforward numeric sums. Always consider whether to backfill historical data with `POPULATE` or via a separate `INSERT ... SELECT`.
