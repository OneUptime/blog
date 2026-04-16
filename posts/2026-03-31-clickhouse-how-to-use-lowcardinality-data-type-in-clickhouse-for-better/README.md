# How to Use LowCardinality Data Type in ClickHouse for Better Compression

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Type, Compression, Performance, Optimization

Description: Learn how to use the LowCardinality data type in ClickHouse to dramatically reduce storage and improve query performance for low-cardinality string columns.

---

## What Is LowCardinality in ClickHouse

`LowCardinality` is a ClickHouse wrapper type that transforms any column into a dictionary-encoded representation. Instead of storing the full string value for every row, ClickHouse maintains a dictionary of unique values and stores integer indices per row.

This is most effective when a column has a small number of distinct values relative to total row count - for example, status codes, country names, log levels, or HTTP methods.

```sql
-- Regular String column
CREATE TABLE events_regular (
    id UInt64,
    status String,
    country String
) ENGINE = MergeTree()
ORDER BY id;

-- With LowCardinality
CREATE TABLE events_lc (
    id UInt64,
    status LowCardinality(String),
    country LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY id;
```

## When to Use LowCardinality

The rule of thumb: use `LowCardinality` when a column has fewer than 10,000 distinct values across the entire table. It is especially beneficial for:

- Status fields (`active`, `inactive`, `pending`)
- Log levels (`INFO`, `WARN`, `ERROR`, `DEBUG`)
- Country or region codes
- HTTP methods (`GET`, `POST`, `PUT`, `DELETE`)
- Environment names (`production`, `staging`, `development`)

```sql
-- Check cardinality before deciding
SELECT
    uniq(status) AS distinct_statuses,
    uniq(user_agent) AS distinct_user_agents,
    count() AS total_rows
FROM access_logs;
```

## Supported Base Types

`LowCardinality` works with several base types:

```sql
CREATE TABLE lc_examples (
    -- Strings
    log_level LowCardinality(String),
    -- Fixed strings
    country_code LowCardinality(FixedString(2)),
    -- Nullable strings
    region LowCardinality(Nullable(String)),
    -- Numbers (less common but supported)
    http_status LowCardinality(UInt16),
    -- Dates
    event_date LowCardinality(Date)
) ENGINE = MergeTree()
ORDER BY log_level;
```

## Compression Comparison

Here is a practical demonstration of the storage savings:

```sql
-- Insert test data
INSERT INTO events_regular
SELECT
    number AS id,
    ['active', 'inactive', 'pending', 'suspended'][rand() % 4 + 1] AS status,
    ['US', 'UK', 'DE', 'FR', 'JP', 'AU', 'CA', 'BR'][rand() % 8 + 1] AS country
FROM numbers(10000000);

INSERT INTO events_lc
SELECT * FROM events_regular;

-- Compare sizes
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed
FROM system.columns
WHERE database = currentDatabase()
  AND table IN ('events_regular', 'events_lc')
  AND name IN ('status', 'country')
GROUP BY table;
```

Typical results show `LowCardinality(String)` using 60-90% less storage than plain `String` for low-cardinality columns.

## Query Performance Benefits

`LowCardinality` columns benefit from vectorized processing and SIMD instructions because comparisons operate on dictionary indices (integers) rather than strings:

```sql
-- This runs faster on LowCardinality(String) than String
SELECT count()
FROM events_lc
WHERE status = 'active' AND country = 'US';

-- GROUP BY also benefits - dictionary deduplication is pre-built
SELECT status, count() AS cnt
FROM events_lc
GROUP BY status
ORDER BY cnt DESC;
```

## Using LowCardinality with ORDER BY

When using a `LowCardinality` column in `ORDER BY`, ClickHouse sorts by the dictionary index, not the string value. This is usually fine but worth understanding:

```sql
-- The sort order is by dictionary position, not alphabetical
-- To sort alphabetically, cast to String
SELECT status
FROM events_lc
ORDER BY toString(status);
```

## ALTER TABLE to Add LowCardinality

You can convert an existing column to `LowCardinality` without dropping it:

```sql
ALTER TABLE events_regular
    MODIFY COLUMN status LowCardinality(String);
```

This triggers a background mutation. Monitor progress:

```sql
SELECT *
FROM system.mutations
WHERE table = 'events_regular' AND is_done = 0;
```

## Settings That Affect LowCardinality

```sql
-- Allow LowCardinality with fixed-size types of 8 bytes or less
-- (numeric types, small FixedString). Disabled by default (0)
-- because using LowCardinality for small fixed values is usually inefficient.
SET allow_suspicious_low_cardinality_types = 1;

-- Max dictionary size (default 8192)
-- When a dictionary overflows, a new one is created for subsequent values.
SET low_cardinality_max_dictionary_size = 8192;

-- Force a single dictionary per data part instead of creating new ones
-- when the size limit is exceeded. Default 0.
SET low_cardinality_use_single_dictionary_for_part = 1;
```

## Common Pitfalls

```sql
-- Pitfall 1: Too many distinct values
-- If cardinality > 8192, extra values overflow to inline storage
-- Check before using:
SELECT uniqExact(user_id) FROM events;  -- if high, don't use LowCardinality

-- Pitfall 2: JOINs between LowCardinality and regular String
-- ClickHouse handles this automatically but implicit casting can affect performance
SELECT a.status, count()
FROM events_lc a
JOIN other_table b ON toString(a.status) = b.status_str
GROUP BY a.status;

-- Pitfall 3: Inserting high-cardinality data into LowCardinality column
-- Values beyond the dictionary limit are stored without compression benefit
```

## Practical Example: Web Server Log Analysis

```sql
CREATE TABLE web_logs (
    timestamp DateTime,
    method LowCardinality(String),
    status_code LowCardinality(UInt16),
    path String,  -- high cardinality, don't use LowCardinality
    user_agent LowCardinality(String),  -- limited UA strings in practice
    bytes_sent UInt64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (method, status_code, timestamp);

-- Query benefits from dictionary-based filtering
SELECT
    method,
    status_code,
    count() AS requests,
    avg(bytes_sent) AS avg_bytes
FROM web_logs
WHERE method IN ('GET', 'POST')
  AND status_code BETWEEN 400 AND 499
GROUP BY method, status_code
ORDER BY requests DESC;
```

## Summary

`LowCardinality` is one of the most impactful optimizations available in ClickHouse for string-heavy workloads. It uses dictionary encoding to compress low-cardinality columns by up to 90%, while also accelerating filtering and grouping through integer-based comparisons. Apply it to any column with fewer than 10,000 distinct values, such as status fields, log levels, or country codes, and monitor cardinality to ensure the dictionary size limit is not exceeded.
