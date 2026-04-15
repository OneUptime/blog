# How to Use MergeTree Engine in ClickHouse - Complete Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Database, Engine, Performance, SQL

Description: A complete guide to the MergeTree table engine in ClickHouse, covering table creation, primary keys, partitioning, ordering, secondary indexes, and performance optimization.

---

MergeTree is the primary storage engine in ClickHouse. Almost every production ClickHouse table uses MergeTree or one of its variants (ReplicatedMergeTree, SummingMergeTree, etc.). Understanding how MergeTree works is essential to getting the most out of ClickHouse.

## What Is MergeTree?

MergeTree stores data in column-oriented format on disk, organized into immutable "parts." When you insert data, ClickHouse writes a new part. In the background, a merge process combines smaller parts into larger ones - giving the engine its name. This design enables:

- Extremely fast sequential reads for aggregations.
- Efficient data compression (each column compressed independently).
- Partition pruning for time-series workloads.
- Primary key index for range scans.

## Creating a MergeTree Table

```sql
CREATE TABLE events
(
    ts          DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    url         String,
    ip          IPv4,
    properties  String,
    date        Date MATERIALIZED toDate(ts)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id)
PRIMARY KEY (ts, user_id)
SETTINGS index_granularity = 8192;
```

## Key Clauses Explained

### ORDER BY

`ORDER BY` defines how data is sorted within each part. This is the most important setting:

- Data on disk is physically sorted by this key.
- ClickHouse uses the sorted order to skip data blocks during queries.
- All columns in `PRIMARY KEY` must be a prefix of `ORDER BY`.

```sql
-- Good: ts first (range queries on time are common)
ORDER BY (ts, user_id, event_type)

-- Bad: high-cardinality first without a good reason
ORDER BY (url, ts, user_id)
```

### PRIMARY KEY

If you omit `PRIMARY KEY`, it defaults to `ORDER BY`. You can specify a shorter prefix of `ORDER BY` as the primary key to reduce index memory:

```sql
ORDER BY (toDate(ts), user_id, session_id, event_type)
PRIMARY KEY (toDate(ts), user_id)
```

### PARTITION BY

Partitioning divides data into separate directories on disk. ClickHouse can skip entire partitions when the `WHERE` clause matches the partition expression:

```sql
-- Monthly partitions (common for time-series)
PARTITION BY toYYYYMM(ts)

-- Daily partitions (high-volume data)
PARTITION BY toDate(ts)

-- By category
PARTITION BY region
```

Avoid too many partitions (thousands) - each partition has overhead. Monthly or yearly partitions are usually the right granularity.

### SETTINGS

```sql
SETTINGS
    index_granularity = 8192,           -- rows per index mark
    index_granularity_bytes = 10485760, -- max bytes per mark (adaptive)
    min_bytes_for_wide_part = 10485760, -- threshold for wide vs compact parts
    merge_with_ttl_timeout = 86400;     -- TTL merge frequency (seconds)
```

## Complete Production-Ready Table Example

```sql
CREATE TABLE http_logs
(
    ts              DateTime,
    date            Date MATERIALIZED toDate(ts),
    host            LowCardinality(String),
    method          LowCardinality(String),
    path            String,
    status_code     UInt16,
    response_bytes  UInt32,
    duration_ms     UInt32,
    user_agent      String,
    referer         String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, host, status_code)
PRIMARY KEY (ts, host)
TTL ts + INTERVAL 1 YEAR
SETTINGS
    index_granularity = 8192,
    index_granularity_bytes = 10485760;
```

## How Parts Work

When you insert data, ClickHouse creates a new "data part":

```sql
-- Each INSERT creates a new part
INSERT INTO events VALUES (now(), 1, 'click', '/home', '1.2.3.4', '{}');
INSERT INTO events VALUES (now(), 2, 'view',  '/about','5.6.7.8', '{}');
```

View current parts:

```sql
SELECT
    table,
    partition,
    name,
    rows,
    formatReadableSize(data_compressed_bytes) AS compressed,
    formatReadableSize(data_uncompressed_bytes) AS uncompressed
FROM system.parts
WHERE table = 'events' AND active = 1
ORDER BY partition, name;
```

## Secondary (Data Skipping) Indexes

Add indexes on non-primary-key columns to speed up filtering:

```sql
-- Bloom filter for string equality lookups
ALTER TABLE events ADD INDEX idx_url url TYPE bloom_filter GRANULARITY 4;

-- MinMax index for range queries on numeric columns
ALTER TABLE events ADD INDEX idx_status status_code TYPE minmax GRANULARITY 1;

-- Set index for low-cardinality columns
ALTER TABLE events ADD INDEX idx_event event_type TYPE set(100) GRANULARITY 1;

-- N-gram bloom filter for substring search
ALTER TABLE events ADD INDEX idx_url_ngram url TYPE ngrambf_v1(4, 1024, 2, 0) GRANULARITY 4;
```

Materialize the index on existing data:

```sql
ALTER TABLE events MATERIALIZE INDEX idx_url;
```

## Inserting Data Efficiently

Always batch inserts - never insert one row at a time:

```sql
-- Good: one large batch
INSERT INTO events
SELECT * FROM generateRandom('ts DateTime, user_id UInt64, event_type String, url String, ip IPv4, properties String', 0, 20, 1)
LIMIT 100000;
```

## Forcing a Merge (for Testing)

```sql
OPTIMIZE TABLE events FINAL;
```

Use `FINAL` only in development. In production, let the background merger work automatically.

## Mutations: UPDATE and DELETE

MergeTree supports mutations for bulk updates and deletes:

```sql
-- Delete rows matching a condition
ALTER TABLE events DELETE WHERE ts < now() - INTERVAL 365 DAY;

-- Update a column value
ALTER TABLE events UPDATE event_type = 'interaction' WHERE event_type = 'click';
```

Mutations are heavy operations - they rewrite parts. Use TTL for routine data expiry instead.

## SAMPLE BY for Statistical Sampling

For very large tables, add a `SAMPLE BY` clause to enable probabilistic sampling:

```sql
CREATE TABLE events_sampled
(
    ts       DateTime,
    user_id  UInt64,
    event    String
)
ENGINE = MergeTree()
ORDER BY (ts, sipHash64(user_id))
SAMPLE BY sipHash64(user_id);

-- Query a 1% sample
SELECT count() / 0.01 AS estimated_total
FROM events_sampled
SAMPLE 0.01;
```

## Monitoring Table Health

```sql
-- Parts count and size
SELECT
    table,
    count()                                          AS parts,
    sum(rows)                                        AS total_rows,
    formatReadableSize(sum(data_compressed_bytes))   AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio
FROM system.parts
WHERE active AND database = 'default'
GROUP BY table
ORDER BY sum(data_compressed_bytes) DESC;

-- Merges in progress
SELECT database, table, elapsed, progress, num_parts
FROM system.merges
ORDER BY elapsed DESC;
```

## Common Mistakes to Avoid

**Too many parts:** Inserting very small batches creates many parts and slows down merges. Batch at least 10,000-100,000 rows per insert.

**Wrong ORDER BY:** Putting a high-cardinality column first that you never filter by wastes index space without speeding up queries.

**Overly fine partitioning:** Partitioning by hour or by user ID creates millions of partitions. Use coarse granularity (month, year).

**Using mutations for single-row updates:** Mutations rewrite entire parts. If you need frequent updates, consider `ReplacingMergeTree` instead.

## Summary

MergeTree is the backbone of ClickHouse performance. Key points:

- Choose `ORDER BY` to match your most common query patterns.
- Use `PARTITION BY` on a time column for efficient data pruning.
- Add secondary indexes for non-primary-key filter columns.
- Always insert data in large batches, not row by row.
- Monitor `system.parts` and `system.merges` for table health.
- Use TTL to automate data lifecycle management.
