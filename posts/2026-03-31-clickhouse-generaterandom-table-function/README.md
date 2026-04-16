# How to Use generateRandom() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Table Function, Testing, SQL, Database, Performance

Description: Learn how to use the generateRandom() table function in ClickHouse to produce synthetic datasets for testing, benchmarking, and schema validation with configurable randomness.

---

The `generateRandom()` table function in ClickHouse generates rows of random data matching any schema you specify. It is the fastest way to create large synthetic datasets for benchmarks, query plan analysis, schema testing, and demonstrating ClickHouse performance without needing real data.

## What Is the generateRandom() Table Function?

`generateRandom()` produces rows where each column is filled with random values that conform to the declared data type. It supports a wide range of types including integers, floats, strings, dates, arrays, tuples, and nullable variants.

```sql
SELECT *
FROM generateRandom('id UInt32, name String, score Float64', 42, 10, 2)
LIMIT 5;
```

```text
┌─────────id─┬─name────────────────┬────────────────score─┐
│ 2823761841 │ iqXGmabKzj          │   0.4923812347961426 │
│ 3172894563 │ wVpQRts             │   0.8734219834289103 │
│  891234567 │ HkLmNoPqRs          │  -1.2938471029384756 │
│ 1049283746 │ TuVwXyZaB           │   2.1847392847391023 │
│ 3928374651 │ CdEfGhIjKl          │  -0.3948572938475829 │
└────────────┴─────────────────────┴──────────────────────┘
```

## Basic Syntax

```sql
generateRandom(structure [, random_seed [, max_string_length [, max_array_length]]])
```

| Parameter          | Default | Description |
|--------------------|---------|-------------|
| `structure`        | -       | Column schema string, same format as `input()` or `file()` |
| `random_seed`      | 0       | Seed for reproducible output; 0 means truly random |
| `max_string_length`| 10      | Maximum number of characters in String columns |
| `max_array_length` | 10      | Maximum number of elements in Array columns |

## Generating a Simple Dataset

```sql
SELECT *
FROM generateRandom(
    'user_id UInt32, username String, email String, score Float32, active UInt8',
    12345,  -- seed for reproducibility
    20,     -- max string length
    5       -- max array length
)
LIMIT 10;
```

## Populating a Table with Test Data

This is the most common use case - filling a MergeTree table with millions of rows to test query performance:

```sql
CREATE TABLE events_test
(
    event_id   UInt64,
    user_id    UInt32,
    event_type LowCardinality(String),
    properties String,
    ts         DateTime,
    value      Float64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id);

-- Insert 10 million random rows
INSERT INTO events_test
SELECT *
FROM generateRandom(
    'event_id UInt64, user_id UInt32, event_type String, properties String, ts DateTime, value Float64',
    0,   -- random seed
    15,  -- max string length
    1    -- max array length (not used here but required)
)
LIMIT 10000000;
```

## Benchmarking Query Performance

Generate a controlled dataset to measure query throughput:

```sql
-- Generate 100M rows for compression and aggregation benchmarks
CREATE TABLE benchmark_data
(
    ts      DateTime,
    host    String,
    metric  String,
    value   Float64,
    tags    Array(String)
)
ENGINE = MergeTree()
ORDER BY (ts, host);

INSERT INTO benchmark_data
SELECT *
FROM generateRandom('ts DateTime, host String, metric String, value Float64, tags Array(String)', 42, 12, 5)
LIMIT 100000000;

-- Now benchmark
SELECT
    toStartOfMinute(ts) AS minute,
    host,
    avg(value) AS avg_value
FROM benchmark_data
GROUP BY minute, host
ORDER BY minute, host
LIMIT 100;
```

## Generating Data with Complex Types

`generateRandom()` handles nested types out of the box:

```sql
-- Arrays
SELECT *
FROM generateRandom('id UInt32, tags Array(String), scores Array(Float32)', 1, 8, 4)
LIMIT 5;

-- Tuples
SELECT *
FROM generateRandom('id UInt32, geo Tuple(Float64, Float64), name String', 2, 10, 3)
LIMIT 5;

-- Nullable columns
SELECT *
FROM generateRandom('id UInt32, optional_name Nullable(String)', 3, 12, 1)
LIMIT 5;

-- Nested maps
SELECT *
FROM generateRandom('id UInt32, metadata Map(String, UInt32)', 4, 6, 4)
LIMIT 5;
```

## Using Fixed Seeds for Reproducible Tests

When you need deterministic test data across environments, set a non-zero seed:

```sql
-- Both queries produce identical rows
SELECT * FROM generateRandom('id UInt32, val Float64', 99999, 5, 1) LIMIT 3;
SELECT * FROM generateRandom('id UInt32, val Float64', 99999, 5, 1) LIMIT 3;
```

## Testing Schema Changes

`generateRandom()` is ideal for verifying that schema changes (e.g., adding a column, changing a type) do not break insert pipelines:

```sql
-- Old schema
CREATE TABLE logs_v1 (ts DateTime, message String, level UInt8) ENGINE = MergeTree() ORDER BY ts;
INSERT INTO logs_v1 SELECT * FROM generateRandom('ts DateTime, message String, level UInt8', 1, 50, 1) LIMIT 1000;

-- New schema with an extra column
CREATE TABLE logs_v2 (ts DateTime, message String, level UInt8, host String) ENGINE = MergeTree() ORDER BY ts;
INSERT INTO logs_v2 SELECT * FROM generateRandom('ts DateTime, message String, level UInt8, host String', 1, 50, 1) LIMIT 1000;

-- Verify row counts match
SELECT 'v1' AS version, count() FROM logs_v1
UNION ALL
SELECT 'v2',            count() FROM logs_v2;
```

## Generating Date Ranges

For time-series tests, use the `numbers()` table function for controlled timestamps:

```sql
SELECT
    now() - toIntervalSecond(number * 60) AS ts,
    rand() % 100 AS cpu_usage,
    rand() % 8192 AS mem_mb
FROM numbers(10000)
ORDER BY ts;
```

## Combining generateRandom() with Realistic Distributions

`generateRandom()` uses a uniform distribution. For more realistic tests, post-process the values:

```sql
SELECT
    user_id,
    -- Map a random UInt32 to a small set of event types
    ['click', 'view', 'purchase', 'signup'][1 + (rand() % 4)] AS event_type,
    -- Simulate timestamps within the last 30 days
    now() - toIntervalSecond(rand() % (30 * 86400)) AS ts,
    abs(randNormal(50, 15)) AS response_ms
FROM generateRandom('user_id UInt32', 0, 5, 1)
LIMIT 100000;
```

## Performance Notes

- `generateRandom()` is CPU-bound and very fast. Generating 10 million rows typically takes under a second.
- The output is streamed - you do not need to materialize all rows in memory before inserting.
- For very large inserts (hundreds of millions of rows), break the operation into batches to avoid creating oversized parts.

## Summary

The `generateRandom()` table function is an essential tool for any ClickHouse developer. Key points:

- Generate any volume of synthetic data matching any schema in seconds.
- Use a fixed seed for reproducible test datasets across environments.
- Tune `max_string_length` and `max_array_length` to control data size.
- Combine with SQL expressions for more realistic value distributions.
- The primary use cases are benchmarking, schema testing, and development seed data.
