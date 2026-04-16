# How to Use Nullable Data Type in ClickHouse and When to Avoid It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Type, Nullable, Performance, Schema Design

Description: Understand how to use Nullable types in ClickHouse, the performance trade-offs involved, and when to use alternative approaches instead.

---

## What Is the Nullable Type in ClickHouse

In ClickHouse, `Nullable(T)` is a wrapper that allows a column of type `T` to also store `NULL` values. Without this wrapper, ClickHouse columns cannot hold `NULL` - they always contain a default value (0 for numbers, empty string for strings).

```sql
CREATE TABLE user_profiles (
    user_id UInt64,
    name String,
    email Nullable(String),       -- can be NULL
    age Nullable(UInt8),          -- can be NULL
    phone Nullable(String),       -- can be NULL
    created_at DateTime
) ENGINE = MergeTree()
ORDER BY user_id;
```

## How Nullable Is Stored Internally

ClickHouse stores `Nullable(T)` using two files on disk:

- The actual data file (same as non-nullable T)
- A separate bitmask file tracking which rows are NULL

This means every `Nullable` column uses extra storage and requires an extra read during queries to load the NULL bitmask.

```sql
-- Insert with NULLs
INSERT INTO user_profiles VALUES
    (1, 'Alice', 'alice@example.com', 30, NULL, now()),
    (2, 'Bob', NULL, NULL, '+1-555-0100', now()),
    (3, 'Carol', 'carol@example.com', 25, NULL, now());

-- Query NULL values
SELECT user_id, name, email
FROM user_profiles
WHERE email IS NULL;

-- Using isNull() function
SELECT user_id, isNull(email) AS has_no_email
FROM user_profiles;

-- Using isNotNull()
SELECT user_id, email
FROM user_profiles
WHERE isNotNull(email);
```

## NULL Handling Functions

```sql
-- ifNull: return default when NULL
SELECT
    user_id,
    ifNull(email, 'no-email@example.com') AS contact_email
FROM user_profiles;

-- nullIf: return NULL when condition matches
SELECT
    user_id,
    nullIf(age, 0) AS valid_age  -- treat 0 as unknown
FROM user_profiles;

-- coalesce: return first non-NULL value
SELECT
    user_id,
    coalesce(email, phone, 'unknown') AS contact
FROM user_profiles;

-- assumeNotNull: strip Nullable wrapper (use carefully)
SELECT assumeNotNull(email) FROM user_profiles WHERE isNotNull(email);
```

## Performance Costs of Nullable

Nullable columns have real performance costs:

```sql
-- Compare query plans: Nullable vs non-Nullable
-- Nullable requires reading an extra bitmask file per block
EXPLAIN SELECT avg(age) FROM user_profiles;
-- vs
EXPLAIN SELECT avg(score) FROM events;  -- where score is UInt32, not Nullable
```

The costs include:
- Extra disk I/O for the NULL bitmask
- Extra CPU work to apply the bitmask during aggregation
- Some aggregate functions cannot be vectorized as efficiently
- `Nullable` columns cannot be used in primary keys or ordering keys

```sql
-- This is NOT allowed:
CREATE TABLE bad_table (
    id Nullable(UInt64),  -- ERROR: primary key cannot be Nullable
    val UInt32
) ENGINE = MergeTree()
ORDER BY id;  -- will fail
```

## When to Avoid Nullable

**Avoid Nullable for high-volume analytics columns.** For most OLAP use cases, use sentinel values instead:

```sql
-- Instead of Nullable(Float64) for a metric that might be unknown:
CREATE TABLE metrics (
    ts DateTime,
    cpu_usage Float64 DEFAULT -1,    -- -1 means "not recorded"
    memory_mb UInt32 DEFAULT 0,      -- 0 means "not available"
    error_count Int32 DEFAULT -1     -- -1 means "not measured"
) ENGINE = MergeTree()
ORDER BY ts;

-- Query with sentinel
SELECT avg(cpu_usage) FROM metrics WHERE cpu_usage >= 0;
```

**Avoid Nullable for ordering and partition keys** - ClickHouse will raise an error anyway.

**Avoid Nullable for join keys** - NULL never equals NULL, which causes silent data loss in joins.

## When Nullable Is Appropriate

Use `Nullable` when:
- The column is infrequently queried (metadata, optional annotations)
- NULL semantics are genuinely needed (e.g., a field truly absent vs. zero)
- The column is not part of any key or index
- Data comes from external systems with real NULLs (via JDBC, CSV, etc.)

```sql
-- Appropriate use: optional user annotation
CREATE TABLE articles (
    article_id UInt64,
    title String,
    published_at DateTime,
    editor_note Nullable(String),   -- rarely queried, optional field
    review_score Nullable(Float32)  -- meaningful distinction: 0 vs not reviewed
) ENGINE = MergeTree()
ORDER BY (published_at, article_id);
```

## Nullable in Aggregation

Most aggregate functions handle NULL correctly - they skip NULL values:

```sql
-- avg() ignores NULLs automatically
SELECT avg(age) FROM user_profiles;  -- skips NULL age rows

-- count() without argument counts all rows including NULLs
SELECT count() FROM user_profiles;

-- count(column) skips NULLs
SELECT count(email) FROM user_profiles;  -- only counts non-NULL emails

-- sum() also skips NULLs
SELECT sum(age) FROM user_profiles;
```

## Converting Between Nullable and Non-Nullable

```sql
-- Replace NULL with a value before stripping the Nullable wrapper.
-- CAST alone does NOT turn NULL into '' - you must handle NULLs explicitly.
SELECT CAST(ifNull(email, ''), 'String') FROM user_profiles;

-- Or use toNullable to add Nullable wrapper to non-Nullable
SELECT toNullable(created_at) FROM user_profiles;

-- Remove Nullable wrapper in schema. First backfill NULLs to a real value,
-- then change the column type.
ALTER TABLE user_profiles
    UPDATE email = '' WHERE email IS NULL;

ALTER TABLE user_profiles
    MODIFY COLUMN email String DEFAULT '';
```

## Summary

`Nullable(T)` in ClickHouse enables storing NULL values but comes with meaningful performance trade-offs including extra disk reads and CPU overhead. It cannot be used in primary keys or sorting keys. For high-throughput analytics columns, prefer sentinel values (like -1 or empty string) over Nullable. Reserve Nullable for optional metadata fields, rare annotation columns, or when true NULL semantics are required by your data model.
