# How to Use PREWHERE for Performance Optimization in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, SQL, Analytics, Database

Description: Learn how ClickHouse's PREWHERE clause filters rows before reading all columns, reducing I/O dramatically for selective queries on wide tables.

## Introduction

ClickHouse's `PREWHERE` clause is one of its most powerful and least-understood performance features. It instructs ClickHouse to evaluate a filter expression before reading the other columns listed in `SELECT`, `WHERE`, and `GROUP BY`. Only rows that pass the `PREWHERE` condition are used to read the remaining columns. When the filtering condition is highly selective, this dramatically reduces the amount of data read from disk.

For tables with many columns (wide tables), a selective `PREWHERE` on a small column can reduce data read by 90% or more compared to the same query using only `WHERE`.

## How PREWHERE Works

Normally, ClickHouse reads all projected columns for every granule selected by the primary key. With `PREWHERE`:

1. ClickHouse reads only the `PREWHERE` columns.
2. It evaluates the filter and marks rows that pass.
3. For passing rows only, it reads the remaining columns.

This is particularly effective when:
- The filter is selective (rejects many rows).
- The filtered column is small (integers, short strings, dates).
- The projected columns are large (long strings, arrays, nested structures).

## Basic PREWHERE Usage

```sql
-- Without PREWHERE: reads user_id and page_url for all rows in matching granules
SELECT user_id, page_url
FROM page_views
WHERE user_id = 12345;

-- With PREWHERE: reads only user_id first, then reads page_url only for matching rows
SELECT user_id, page_url
FROM page_views
PREWHERE user_id = 12345;
```

For a table with 1 billion rows where only 1,000 match `user_id = 12345`, `PREWHERE` reads 1,000 rows' worth of `page_url` instead of 1 billion rows' worth.

## Automatic PREWHERE Optimization

ClickHouse's query optimizer can automatically move conditions from `WHERE` to `PREWHERE` when it determines a condition is a good candidate. This is enabled by default.

```sql
-- ClickHouse may move status_code = 500 to PREWHERE automatically
-- because status_code is a small UInt16 column
SELECT
    url,
    response_time_ms,
    user_agent
FROM http_requests
WHERE status_code = 500
  AND response_time_ms > 1000;
```

Check whether automatic PREWHERE was applied using `EXPLAIN`:

```sql
EXPLAIN
SELECT url, response_time_ms, user_agent
FROM http_requests
WHERE status_code = 500
  AND response_time_ms > 1000;
```

Look for `Prewhere info` in the output. If conditions were moved automatically, you'll see them listed under `Prewhere filter`.

Disable automatic PREWHERE to compare:

```sql
SELECT url, response_time_ms
FROM http_requests
WHERE status_code = 500
SETTINGS optimize_move_to_prewhere = 0;
```

## Manual PREWHERE for Full Control

Automatic PREWHERE is good but does not always choose the optimal condition. Use explicit `PREWHERE` when you know which condition is most selective.

```sql
-- Manual PREWHERE: filter on is_error (1 byte UInt8) before reading large columns
SELECT
    request_id,
    url,
    request_body,    -- large String column
    response_body    -- large String column
FROM api_requests
PREWHERE is_error = 1
WHERE response_time_ms > 5000;
```

You can combine both `PREWHERE` and `WHERE` in one query. `PREWHERE` is applied first.

```sql
-- Two-stage filtering:
-- Stage 1: PREWHERE reads only 'error_code' (2 bytes)
-- Stage 2: WHERE reads remaining columns only for rows that passed stage 1
SELECT
    user_id,
    endpoint,
    error_message,
    stack_trace
FROM application_errors
PREWHERE error_code IN (500, 503, 504)
WHERE partition_date = today()
  AND retry_count > 3;
```

## Best Candidates for PREWHERE

Choose the `PREWHERE` condition based on these criteria:

1. **High selectivity** - the condition eliminates the most rows.
2. **Small column size** - integers, dates, enums, and `LowCardinality` strings.
3. **Not in the primary key** - columns already in the primary key get granule-level skipping from the sparse index; `PREWHERE` is more impactful on columns outside the primary key.

```sql
-- Good PREWHERE candidates:
PREWHERE is_bot = 0                   -- UInt8, 1 byte, eliminates bots (often 70%+ of traffic)
PREWHERE status = 'active'            -- LowCardinality(String), highly selective
PREWHERE event_type = 'purchase'      -- LowCardinality(String), 0.1% of events
PREWHERE error_code != 0              -- UInt16, 2 bytes

-- Poor PREWHERE candidates (large columns, low selectivity):
PREWHERE url LIKE '%checkout%'        -- full String, regex scan
PREWHERE description != ''            -- large TEXT column
```

## PREWHERE with Bloom Filter Skipping Indexes

Combine `PREWHERE` with a bloom filter index for maximum granule skipping on string columns.

```sql
-- Table with a bloom filter index on email
CREATE TABLE user_activity
(
    user_id     UInt64,
    email       String,
    event_type  LowCardinality(String),
    metadata    String,   -- large column
    event_time  DateTime,
    INDEX bf_email email TYPE bloom_filter(0.01) GRANULARITY 1
)
ENGINE = MergeTree()
ORDER BY (event_time, user_id);

-- Query uses bloom filter to skip granules, then PREWHERE reads email for remaining granules
-- before reading the large metadata column
SELECT user_id, event_type, metadata
FROM user_activity
PREWHERE email = 'alice@example.com'
WHERE event_time >= now() - INTERVAL 30 DAY;
```

## Measuring PREWHERE Impact

Compare rows read with and without `PREWHERE`:

```sql
-- Run both queries and compare in system.query_log
SELECT
    query,
    read_rows,
    read_bytes,
    formatReadableSize(read_bytes) AS readable_bytes,
    query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%api_requests%'
ORDER BY event_time DESC
LIMIT 4;
```

A successful `PREWHERE` optimization shows `read_rows` and `read_bytes` that are significantly smaller than the total table size.

## PREWHERE Limitations

- `PREWHERE` cannot reference columns computed by aliases defined in `SELECT`. Use the raw column names.
- The automatic `optimize_move_to_prewhere` heuristic will not move non-deterministic functions from `WHERE` to `PREWHERE`. You can still use them in explicit `PREWHERE`, but results may be unpredictable.
- If the `PREWHERE` column is part of the primary key, the sparse index already skips granules - `PREWHERE` adds little benefit for these columns.
- `PREWHERE` is evaluated per-granule, not per-partition. Partition pruning still happens first.
- Aggregate functions are not valid in `PREWHERE`.

## Summary

`PREWHERE` reduces I/O for selective queries on wide tables by reading only the filter column first, then fetching other columns only for rows that match. Use explicit `PREWHERE` on small, highly selective columns - booleans, status codes, enums, and low-cardinality strings. Let ClickHouse's automatic `optimize_move_to_prewhere` handle the rest, and validate with `EXPLAIN` and `system.query_log` to confirm that the optimization is active and effective.
