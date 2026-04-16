# How to Optimize Nullable Column Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Nullable, Performance, Data Type, Optimization

Description: Learn how to minimize the performance impact of Nullable columns in ClickHouse by understanding their overhead and applying design strategies to avoid them where possible.

---

## Why Nullable Columns Have Overhead

In ClickHouse, a `Nullable(T)` column stores two separate files for each column:
1. The actual values stored as type `T`
2. A null map (one byte per row) indicating which values are NULL

This means every read must process both files, leading to:
- Higher memory usage
- Slower GROUP BY and aggregations
- Additional overhead when combined with `LowCardinality` (use `LowCardinality(Nullable(T))`, not `Nullable(LowCardinality(T))`)
- Reduced compression efficiency

## Checking Which Columns Are Nullable

```sql
SELECT
    column,
    type
FROM system.columns
WHERE database = 'default'
  AND table = 'events'
  AND type LIKE 'Nullable%'
ORDER BY column;
```

## Strategy 1 - Use Sentinel Values Instead of NULL

Replace NULL with a domain-specific sentinel value:

```sql
-- Instead of:
CREATE TABLE events (
    user_id     UInt64,
    referrer    Nullable(String),    -- NULL if no referrer
    session_dur Nullable(Float32)   -- NULL if unknown
) ENGINE = MergeTree() ORDER BY user_id;

-- Do this:
CREATE TABLE events (
    user_id     UInt64,
    referrer    String DEFAULT '',   -- Empty string = no referrer
    session_dur Float32 DEFAULT 0    -- 0 = unknown duration
) ENGINE = MergeTree() ORDER BY user_id;
```

Update queries to use sentinel checks:

```sql
-- Instead of: WHERE referrer IS NOT NULL
SELECT count() FROM events WHERE referrer != '';

-- Instead of: WHERE session_dur IS NOT NULL
SELECT avg(session_dur) FROM events WHERE session_dur > 0;
```

## Strategy 2 - Remove Nullable from Existing Columns

If a column has been defined as `Nullable` but rarely has NULL values:

```sql
-- Check how many NULLs exist
SELECT countIf(email IS NULL) AS nulls, count() AS total
FROM customers;

-- Important: converting Nullable to Non-Nullable will cause read errors
-- if any NULL values remain. Always replace NULLs first:
ALTER TABLE customers
    UPDATE email = '' WHERE email IS NULL;

-- Wait for the mutation to complete, then modify the column type:
ALTER TABLE customers
    MODIFY COLUMN email String DEFAULT '';
```

## Strategy 3 - Use assumeNotNull for Performance

When you know a Nullable column will never be NULL at query time, use `assumeNotNull()` to skip null checks:

```sql
-- Normal query with Nullable overhead
SELECT avg(response_time_ms) FROM requests WHERE response_time_ms IS NOT NULL;

-- Faster: tell ClickHouse to skip null checks
SELECT avg(assumeNotNull(response_time_ms)) FROM requests;
```

## Strategy 4 - Use ifNull for Aggregations

For aggregations where NULL should be treated as zero or empty:

```sql
SELECT
    user_id,
    sum(ifNull(amount, 0)) AS total_spent,
    avg(ifNull(rating, 3.0)) AS avg_rating
FROM orders
GROUP BY user_id;
```

## Benchmarking Nullable vs Non-Nullable

```sql
CREATE TABLE test_nullable (
    id      UInt64,
    value   Nullable(Float64)
) ENGINE = MergeTree() ORDER BY id;

CREATE TABLE test_non_nullable (
    id      UInt64,
    value   Float64 DEFAULT 0
) ENGINE = MergeTree() ORDER BY id;

-- Insert same data (with no NULLs)
INSERT INTO test_nullable SELECT number, if(rand() % 10 = 0, NULL, rand()) FROM numbers(10000000);
INSERT INTO test_non_nullable SELECT number, if(rand() % 10 = 0, 0, rand()) FROM numbers(10000000);

-- Compare GROUP BY performance
SELECT avg(value) FROM test_nullable;
SELECT avg(value) FROM test_non_nullable;
```

## When Nullable IS Appropriate

Nullable columns make sense when:
- A missing value has semantically different meaning from zero or empty string
- You need to distinguish "not recorded" from "zero"
- You're consuming external data that may have genuine NULLs

```sql
-- Acceptable Nullable usage: optional measurement that was genuinely not taken
CREATE TABLE sensor_readings (
    sensor_id       UInt32,
    ts              DateTime,
    temperature_c   Nullable(Float32),  -- Not measured vs 0 degrees are different
    humidity_pct    Nullable(Float32)
) ENGINE = MergeTree() ORDER BY (sensor_id, ts);
```

## Checking Aggregation Performance Improvement

```sql
-- Query plan shows null checks in Nullable columns
EXPLAIN
SELECT avg(value) FROM test_nullable;

-- Compare with non-nullable
EXPLAIN
SELECT avg(value) FROM test_non_nullable;
```

## Summary

Nullable columns in ClickHouse carry real overhead - an extra null bitmap array that must be read and checked on every operation. Minimize their use by replacing NULL with sentinel values (empty string, 0) when semantics allow, use `assumeNotNull()` in performance-critical queries when NULLs are guaranteed absent, and use `ifNull()` in aggregations. Reserve `Nullable(T)` for genuinely optional measurements where NULL and the default value have different meanings.
