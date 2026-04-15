# How to Use SummingMergeTree in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SummingMergeTree, Aggregation, Database, Engine, SQL, Performance

Description: Learn how to use the SummingMergeTree engine in ClickHouse to automatically sum numeric columns during background merges, enabling efficient pre-aggregated counters and metrics storage.

---

SummingMergeTree is a ClickHouse table engine that automatically sums numeric columns for rows with the same primary key during background merges. It is purpose-built for storing pre-aggregated counters, metrics, and event counts where you only need the total, not individual rows.

## What Is SummingMergeTree?

When ClickHouse merges parts in a SummingMergeTree table, it collapses rows that share the same `ORDER BY` key by summing their numeric columns. This keeps the table size small without requiring explicit `GROUP BY` queries to aggregate.

```sql
CREATE TABLE page_views
(
    date       Date,
    page       String,
    views      UInt64,
    unique_visits UInt64
)
ENGINE = SummingMergeTree()
ORDER BY (date, page);
```

Insert data, and ClickHouse will merge identical `(date, page)` combinations and sum `views` and `unique_visits`.

## Basic Syntax

```sql
ENGINE = SummingMergeTree([columns])
```

- Without `columns`: all numeric columns not in the `ORDER BY` key are summed.
- With `columns`: only the explicitly listed columns are summed. Non-listed numeric columns take the value from the first row in the group.

## Simple Counter Table Example

```sql
CREATE TABLE api_call_counts
(
    date        Date,
    endpoint    LowCardinality(String),
    status_code UInt16,
    call_count  UInt64,
    error_count UInt64,
    total_ms    UInt64
)
ENGINE = SummingMergeTree()
ORDER BY (date, endpoint, status_code);

-- Insert raw increments throughout the day
INSERT INTO api_call_counts VALUES ('2026-03-31', '/api/users', 200, 1, 0, 45);
INSERT INTO api_call_counts VALUES ('2026-03-31', '/api/users', 200, 1, 0, 52);
INSERT INTO api_call_counts VALUES ('2026-03-31', '/api/users', 500, 1, 1, 3000);

-- After merge, rows with identical keys are collapsed:
-- ('2026-03-31', '/api/users', 200) -> call_count=2, error_count=0, total_ms=97
-- ('2026-03-31', '/api/users', 500) -> call_count=1, error_count=1, total_ms=3000
```

## Querying with GROUP BY (Required for Correctness)

Merges happen in the background and are not guaranteed to be complete when you query. Always use `GROUP BY` with `sum()` to get correct results regardless of merge state:

```sql
-- Always use sum() in queries - merges may not be complete
SELECT
    date,
    endpoint,
    status_code,
    sum(call_count)             AS total_calls,
    sum(error_count)            AS total_errors,
    sum(total_ms) / sum(call_count) AS avg_ms
FROM api_call_counts
GROUP BY date, endpoint, status_code
ORDER BY date DESC, total_calls DESC;
```

This pattern - `INSERT` increments + `SELECT sum(...)` - is the canonical SummingMergeTree workflow.

## Selecting Specific Columns to Sum

When you want some numeric columns summed and others to retain the first encountered value:

```sql
CREATE TABLE product_sales
(
    date        Date,
    product_id  UInt32,
    product_name String,   -- non-summed: keeps first value
    units_sold  UInt64,    -- summed
    revenue     Float64    -- summed
)
ENGINE = SummingMergeTree(units_sold, revenue)
ORDER BY (date, product_id);
```

Here `product_name` is not summed - it takes the value from whatever row is processed first during the merge. Only `units_sold` and `revenue` are accumulated.

## Materialized View Pattern

The most common production use of SummingMergeTree is as the target of a materialized view that pre-aggregates a high-volume raw events table:

```sql
-- Raw events table (high-volume, short TTL)
CREATE TABLE raw_events
(
    ts         DateTime,
    user_id    UInt64,
    event_type LowCardinality(String),
    revenue    Float64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id)
TTL ts + INTERVAL 7 DAY;

-- Pre-aggregated summary table
CREATE TABLE daily_event_summary
(
    date       Date,
    event_type LowCardinality(String),
    event_count UInt64,
    total_revenue Float64,
    unique_users  UInt64
)
ENGINE = SummingMergeTree(event_count, total_revenue)
ORDER BY (date, event_type);

-- Materialized view to populate the summary
CREATE MATERIALIZED VIEW daily_event_summary_mv
TO daily_event_summary
AS
SELECT
    toDate(ts)   AS date,
    event_type,
    count()      AS event_count,
    sum(revenue) AS total_revenue,
    uniq(user_id) AS unique_users  -- NOTE: uniq is not summable correctly
FROM raw_events
GROUP BY date, event_type;
```

Note: `uniq()` is approximate and cannot be accurately summed across partial aggregations. Use `uniqState()` and `AggregatingMergeTree` for exact aggregations of complex functions.

## Using FINAL for Guaranteed Merge

To force ClickHouse to return fully collapsed results (at query time), use the `FINAL` modifier:

```sql
SELECT *
FROM api_call_counts FINAL
ORDER BY date DESC, endpoint;
```

`FINAL` is slower than `GROUP BY sum()` because it merges parts at query time. Use it only when row-level data is needed and a `GROUP BY` is not practical.

## Partition-Level Queries for Speed

For huge tables, restrict queries to specific partitions:

```sql
SELECT
    sum(call_count) AS total_calls,
    sum(error_count) AS total_errors
FROM api_call_counts
WHERE date >= toDate('2026-03-01') AND date < toDate('2026-04-01')
  AND endpoint = '/api/orders'
GROUP BY endpoint;
```

## Nested Columns in SummingMergeTree

SummingMergeTree has special support for `Nested` type columns whose name ends with `Map`. The first sub-column acts as a key, and the remaining numeric sub-columns are summed per matching key during merges:

```sql
CREATE TABLE region_metrics
(
    date   Date,
    region LowCardinality(String),
    metricsMap Nested
    (
        key   String,
        value Float64
    )
)
ENGINE = SummingMergeTree()
ORDER BY (date, region);
```

## Monitoring Merge Progress

```sql
-- Check how many parts are yet to be merged
SELECT
    table,
    count()                                        AS parts,
    sum(rows)                                      AS rows,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed
FROM system.parts
WHERE active AND table = 'api_call_counts'
GROUP BY table;
```

A high part count means merges are lagging - consider reducing insert frequency or increasing merge resources.

## When to Use SummingMergeTree

Use SummingMergeTree when:

- You need to store counters or cumulative metrics (requests, errors, revenue).
- The raw event volume is too high to store permanently.
- You always query with `sum()` aggregations - you never need individual row values.

Do NOT use SummingMergeTree when:

- You need to compute averages, percentiles, or other non-summable aggregations (use `AggregatingMergeTree`).
- You need to access individual events (use plain `MergeTree`).
- You need deduplication (use `ReplacingMergeTree`).

## Summary

SummingMergeTree is a highly efficient engine for pre-aggregated numeric data. Key points:

- Rows with identical `ORDER BY` keys have their numeric columns summed during background merges.
- Always query with `GROUP BY sum()` to handle partially merged state.
- Explicitly list columns to sum to avoid accidentally summing ID-like fields.
- Combine with materialized views for automatic real-time pre-aggregation.
- Use `FINAL` only when absolutely necessary - it is slower than `GROUP BY`.
