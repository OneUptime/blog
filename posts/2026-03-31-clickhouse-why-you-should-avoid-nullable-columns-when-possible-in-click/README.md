# Why You Should Avoid Nullable Columns When Possible in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Nullable, Performance, Schema Design, Optimization

Description: Understand why Nullable columns in ClickHouse hurt performance and storage efficiency, and learn alternatives for handling missing values.

---

## What Are Nullable Columns?

In ClickHouse, a `Nullable(T)` column can hold either a value of type `T` or `NULL`. Internally, ClickHouse stores Nullable columns as two separate files on disk:

1. The actual data values
2. A null map (one byte per row, stored as UInt8, indicating NULL or not)

This seemingly small addition has significant performance implications.

## Performance Impact of Nullable Columns

### Storage Overhead

```sql
-- Compare storage: Int32 vs Nullable(Int32)
CREATE TABLE test_nullable (
    id UInt64,
    val Int32,
    val_nullable Nullable(Int32)
)
ENGINE = MergeTree()
ORDER BY id;

-- val_nullable creates an extra .null.bin file per part
-- Check file sizes after inserting data
SELECT
    name,
    formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE table = 'test_nullable';
```

### Query Performance

```sql
-- Nullable columns prevent certain optimizations:
-- 1. Cannot use as ORDER BY key
-- 2. Cannot use in primary key
-- 3. Slower arithmetic/comparison (must check null map first)

-- Measure the difference
SELECT count() FROM events WHERE user_id > 0;           -- fast (non-nullable)
SELECT count() FROM events WHERE nullable_score > 0;    -- slower (null check overhead)
```

### No Primary Key Use

```sql
-- This will fail by default - Nullable columns cannot be in ORDER BY / primary key
-- unless the allow_nullable_key setting is enabled
CREATE TABLE bad_design (
    event_time DateTime,
    user_id Nullable(UInt64)  -- problematic
)
ENGINE = MergeTree()
ORDER BY (event_time, user_id);  -- ERROR (unless SET allow_nullable_key = 1)
```

## When NULL is Actually Needed

Despite the costs, there are legitimate use cases:

```sql
-- Optional foreign key (user may not be logged in)
CREATE TABLE analytics.events (
    event_id UInt64,
    session_id String,
    user_id Nullable(UInt64),  -- ok: genuinely optional
    event_type String,
    event_time DateTime
)
ENGINE = MergeTree()
ORDER BY (event_time, event_id);
-- user_id is NOT in the sort key, so Nullable is acceptable
```

## Alternatives to Nullable Columns

### Option 1 - Use Sentinel Values

Replace NULL with a domain-appropriate sentinel:

```sql
-- Use 0 for missing user_id (anonymous session)
user_id UInt64 DEFAULT 0,

-- Use empty string for optional text
referral_source String DEFAULT '',

-- Use -1 for missing numeric scores
quality_score Int16 DEFAULT -1,
```

Query with sentinel:

```sql
SELECT count()
FROM analytics.events
WHERE user_id != 0  -- excludes anonymous sessions
```

### Option 2 - Use Separate Columns for Presence

For complex optionality, track presence explicitly:

```sql
CREATE TABLE analytics.experiments (
    user_id UInt64,
    experiment_id UInt64,
    variant String,
    revenue Float64,
    has_revenue UInt8 DEFAULT 1  -- 0 if no purchase
)
ENGINE = MergeTree()
ORDER BY (user_id, experiment_id);

-- Query: only include users who made a purchase
SELECT experiment_id, avg(revenue)
FROM analytics.experiments
WHERE has_revenue = 1
GROUP BY experiment_id;
```

### Option 3 - Use Arrays for Sparse Data

For truly sparse optional data, store it in a map or array:

```sql
CREATE TABLE analytics.user_properties (
    user_id UInt64,
    properties Map(String, String)
)
ENGINE = MergeTree()
ORDER BY user_id;

-- Access optional property
SELECT user_id, properties['plan_type']
FROM analytics.user_properties;
```

## Checking Nullable Usage in Your Schema

```sql
-- Find all Nullable columns in your databases
SELECT
    database,
    table,
    name,
    type
FROM system.columns
WHERE type LIKE 'Nullable%'
  AND database NOT IN ('system', 'information_schema')
ORDER BY database, table, name;
```

## Migrating Away from Nullable Columns

```sql
-- Step 1: Add a new non-nullable column with default
ALTER TABLE analytics.events ADD COLUMN user_id_new UInt64 DEFAULT 0;

-- Step 2: Backfill with coalesced values
ALTER TABLE analytics.events
UPDATE user_id_new = coalesce(user_id, 0) WHERE 1;

-- Step 3: Drop old nullable column
ALTER TABLE analytics.events DROP COLUMN user_id;

-- Step 4: Rename new column
ALTER TABLE analytics.events RENAME COLUMN user_id_new TO user_id;
```

## Summary

Nullable columns in ClickHouse impose real costs: extra on-disk storage for null bitmaps, slower query execution due to null checks, and exclusion from primary and sort keys. Use sentinel values (0, '', -1) for most cases, explicitly separate presence flags for business-meaningful optionality, or Maps for truly sparse attributes. Reserve `Nullable(T)` for columns that are genuinely optional and not part of any key or frequently filtered column.
