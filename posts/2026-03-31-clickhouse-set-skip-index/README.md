# How to Use Set Skip Index in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Index, SkipIndex, Database, Performance, Query

Description: Learn how to use the Set skip index in ClickHouse to speed up equality and IN queries on low-cardinality columns that are not part of the primary key.

---

The Set skip index stores up to N distinct values for a column within each skip index block. When a query filters with `=` or `IN`, ClickHouse checks each block's stored value set and skips any block that does not contain the target value. It is the most effective skip index for low-cardinality columns like status codes, event types, or environment labels.

## How Set Works

For a column with values `['info', 'warn', 'error']`:

```text
Block 0: set = {'info', 'warn'}
Block 1: set = {'error', 'warn'}
Block 2: set = {'info'}
```

A query `WHERE level = 'error'` skips blocks 0 and 2, because 'error' is not in their sets. Only block 1 needs to be read.

If a block contains more distinct values than the configured limit N, the set overflows and the entire block is marked "may match anything". The index stops being useful for that block.

## Creating a Set Index

```sql
CREATE TABLE application_logs
(
    service_id  UInt16,
    level       LowCardinality(String),
    env         LowCardinality(String),
    region      LowCardinality(String),
    message     String,
    ts          DateTime,

    INDEX idx_level  level  TYPE set(10)  GRANULARITY 4,
    INDEX idx_env    env    TYPE set(5)   GRANULARITY 4,
    INDEX idx_region region TYPE set(20)  GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY (service_id, ts);
```

## Choosing N (Max Set Size)

The N in `set(N)` must be at least as large as the maximum number of distinct values that can appear in any single skip index block:

- `set(0)` stores an unlimited number of distinct values (use carefully, can be large)
- `set(10)` overflows if a block contains more than 10 distinct values
- `set(100)` appropriate for columns with up to 100 distinct values per block

```sql
-- Check the overall number of distinct values for the column
SELECT countDistinct(level) AS distinct_values
FROM application_logs;
```

## Queries That Benefit from Set Index

```sql
-- Equality filter
SELECT count()
FROM application_logs
WHERE level = 'error';

-- IN filter
SELECT service_id, count()
FROM application_logs
WHERE level IN ('error', 'warn')
GROUP BY service_id
ORDER BY count() DESC;

-- Equality with other conditions
SELECT message, ts
FROM application_logs
WHERE env = 'production'
  AND level = 'error'
  AND ts > now() - INTERVAL 1 HOUR;
```

## Verifying Set Index Usage

```sql
EXPLAIN indexes = 1
SELECT count()
FROM application_logs
WHERE level = 'error';
```

Output example:

```text
Skip
  Name: idx_level
  Description: set GRANULARITY 4
  Granules: 12/200
```

Twelve granules out of 200 need to be read, meaning 94% are skipped.

## Adding a Set Index to an Existing Table

```sql
ALTER TABLE application_logs
    ADD INDEX idx_status_code status_code TYPE set(50) GRANULARITY 4;

ALTER TABLE application_logs
    MATERIALIZE INDEX idx_status_code;
```

## Set Index Overflow Behavior

When a block contains more distinct values than N allows, the index stores an empty marker indicating "all values present". ClickHouse cannot skip the block:

```sql
-- This index will overflow frequently on a column with 1000 distinct values
INDEX idx_overflow high_cardinality_col TYPE set(5) GRANULARITY 4

-- Use a larger N or switch to bloom_filter
INDEX idx_better high_cardinality_col TYPE bloom_filter(0.01) GRANULARITY 4
```

## Set Index with LowCardinality Columns

Combining `LowCardinality` dictionary encoding with a Set index provides a double benefit: dictionary encoding compresses the column, and the Set index prunes granules at query time:

```sql
CREATE TABLE events
(
    event_type LowCardinality(String),
    source     LowCardinality(String),
    ts         DateTime,

    INDEX idx_event_type event_type TYPE set(20) GRANULARITY 4,
    INDEX idx_source     source     TYPE set(50) GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY ts;
```

## Benchmarking Set Index

```sql
-- Without index
CREATE TABLE logs_no_index
(
    level   String,
    message String,
    ts      DateTime
)
ENGINE = MergeTree()
ORDER BY ts;

-- With set index
CREATE TABLE logs_set_index
(
    level   String,
    message String,
    ts      DateTime,

    INDEX idx_level level TYPE set(10) GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY ts;

INSERT INTO logs_no_index
SELECT ['info','warn','error'][1 + rand() % 3], randomString(100), now() - rand() % 86400
FROM numbers(10000000);

INSERT INTO logs_set_index
SELECT ['info','warn','error'][1 + rand() % 3], randomString(100), now() - rand() % 86400
FROM numbers(10000000);

-- Compare read_rows
SELECT count() FROM logs_no_index WHERE level = 'error';
SELECT count() FROM logs_set_index WHERE level = 'error';
```

Check `system.query_log` for `read_rows` difference.

## Set Index Memory Footprint

```sql
SELECT
    name,
    type,
    formatReadableSize(data_compressed_bytes) AS index_size
FROM system.data_skipping_indices
WHERE table = 'application_logs'
  AND database = currentDatabase();
```

## Summary

The Set skip index is the most precise skip index for equality and IN filters on low-cardinality columns. Choose N to match the maximum distinct values in a block. For columns with more than a few hundred distinct values, switch to `bloom_filter`. Always verify effectiveness with `EXPLAIN indexes = 1` and tune `GRANULARITY` based on your selectivity requirements.
