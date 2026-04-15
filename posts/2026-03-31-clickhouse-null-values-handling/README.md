# How to Handle NULL Values Efficiently in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, NULL, Nullable, Performance

Description: Learn how NULL works in ClickHouse, the cost of Nullable columns, isNull/ifNull/coalesce patterns, and how to avoid Nullable for better performance.

---

NULL handling in ClickHouse follows SQL semantics but comes with important performance implications that differ from most relational databases. `Nullable` columns carry a storage and computation overhead that can be significant at scale. Understanding when and how to use `Nullable`, what alternatives exist, and which functions to use for safe NULL handling helps you write efficient queries and design better schemas.

## How Nullable Works in ClickHouse

In ClickHouse, only columns explicitly declared as `Nullable(T)` can hold NULL values. Non-nullable columns always have a value - there is no implicit nullability. A `Nullable(T)` column is stored as two separate arrays: one for the actual values and one as a null mask (a UInt8 value per row indicating whether the value is null).

```sql
-- Non-nullable column: always has a value
CREATE TABLE events_no_null
(
    event_id  UInt64,
    user_id   UInt64,       -- 0 if unknown, not NULL
    duration  UInt32,       -- 0 if not measured
    label     String        -- '' if not set
)
ENGINE = MergeTree()
ORDER BY event_id;

-- Nullable column: can hold NULL
CREATE TABLE events_nullable
(
    event_id  UInt64,
    user_id   Nullable(UInt64),    -- NULL if anonymous
    duration  Nullable(UInt32),    -- NULL if not measured
    label     Nullable(String)     -- NULL if not set
)
ENGINE = MergeTree()
ORDER BY event_id;
```

## The Cost of Nullable

`Nullable(T)` adds overhead in several ways:

1. **Storage**: An extra null mask is stored (1 byte per row of overhead, before compression).
2. **CPU**: Every operation on a Nullable column must check the null bitmask, disabling some SIMD optimizations.
3. **Sorting keys**: `Nullable` columns cannot be used in `ORDER BY` keys or primary keys.
4. **Aggregations**: Aggregate functions skip NULLs (which is correct SQL behavior but requires null checks per row).
5. **Compression**: The separate null bitmask column adds minor compression overhead.

```sql
-- You CANNOT use Nullable in ORDER BY
-- This will fail:
-- CREATE TABLE t (id Nullable(UInt64)) ENGINE = MergeTree() ORDER BY id;

-- Use non-Nullable with a sentinel value instead
CREATE TABLE t (id UInt64) ENGINE = MergeTree() ORDER BY id;
```

## Checking for NULL: isNull and isNotNull

```sql
SELECT
    event_id,
    user_id,
    isNull(user_id)    AS is_anonymous,
    isNotNull(user_id) AS is_known_user
FROM events_nullable;
```

Use `isNull`/`isNotNull` rather than `= NULL` or `!= NULL` - SQL NULL comparisons with `=` always return NULL (never true or false):

```sql
-- WRONG: these return NULL (not true or false), so no rows pass the filter
SELECT * FROM events_nullable WHERE user_id = NULL;
SELECT * FROM events_nullable WHERE user_id != NULL;

-- CORRECT
SELECT * FROM events_nullable WHERE isNull(user_id);
SELECT * FROM events_nullable WHERE isNotNull(user_id);
```

## Replacing NULL: ifNull and coalesce

`ifNull(expr, default)` returns the default value when the expression is NULL:

```sql
SELECT
    event_id,
    ifNull(user_id, 0)          AS user_id_safe,
    ifNull(duration, 0)         AS duration_safe,
    ifNull(label, 'unlabeled')  AS label_safe
FROM events_nullable;
```

`coalesce(expr1, expr2, ...)` returns the first non-NULL value among its arguments:

```sql
SELECT
    event_id,
    coalesce(label, 'default_label')                  AS resolved_label,
    coalesce(duration, toUInt32(0))                   AS resolved_duration
FROM events_nullable;
```

`coalesce` is especially useful when you have multiple fallback columns:

```sql
SELECT
    user_id,
    coalesce(preferred_name, display_name, username, 'Anonymous') AS best_name
FROM user_profiles;
```

## nullIf: Converting Sentinel Values Back to NULL

`nullIf(x, y)` returns NULL when `x = y`, and `x` otherwise. Useful for converting sentinel values to NULL for aggregation:

```sql
-- Treat duration of 0 as NULL for average calculation
SELECT
    avg(nullIf(duration, 0))  AS avg_real_duration
FROM events_no_null;

-- Treat empty string as NULL
SELECT
    countIf(nullIf(label, '') IS NOT NULL) AS labeled_count
FROM events_no_null;
```

## Aggregations and NULL Behavior

All standard aggregate functions in ClickHouse skip NULL values, matching SQL standard behavior:

```sql
INSERT INTO events_nullable VALUES
    (1, 100, 250,  'click'),
    (2, NULL, 180, 'view'),
    (3, 200,  NULL,'click'),
    (4, NULL, 300, NULL);

SELECT
    count()                AS total_rows,
    count(user_id)         AS non_null_user_count,
    count(duration)        AS non_null_duration_count,
    avg(duration)          AS avg_duration,     -- skips NULL row 3
    sum(duration)          AS sum_duration,     -- skips NULL row 3
    min(duration)          AS min_duration
FROM events_nullable;
```

## Avoiding Nullable: Using Default Values

For performance-critical tables, avoid `Nullable` by choosing appropriate sentinel values:

```sql
CREATE TABLE high_performance_events
(
    event_id        UInt64,
    user_id         UInt64    DEFAULT 0,        -- 0 = anonymous
    session_id      UInt64    DEFAULT 0,        -- 0 = no session
    duration_ms     UInt32    DEFAULT 0,        -- 0 = not measured
    status          UInt8     DEFAULT 255,      -- 255 = unknown
    label           String    DEFAULT '',       -- '' = no label
    category_id     UInt16    DEFAULT 0         -- 0 = uncategorized
)
ENGINE = MergeTree()
ORDER BY (event_id);
```

With sentinel values, filter unknown rows explicitly:

```sql
-- Get only events with a known user
SELECT count() FROM high_performance_events WHERE user_id != 0;

-- Average duration only where measured
SELECT avg(duration_ms) FROM high_performance_events WHERE duration_ms != 0;
```

## When Nullable is Appropriate

Despite the overhead, `Nullable` is the right choice when:
- NULL and the zero/empty value have different semantic meaning in your domain.
- You are ingesting data from external systems that distinguish NULL from zero.
- You need SQL-standard NULL propagation in calculations.
- The column has low cardinality or is accessed infrequently.

```sql
-- Nullable makes sense here: NULL = "measurement not taken"
-- vs 0.0 = "temperature was measured and was 0 degrees"
CREATE TABLE sensor_data
(
    device_id     UInt32,
    temperature   Nullable(Float32),   -- NULL = sensor offline
    humidity      Nullable(Float32),   -- NULL = sensor offline
    timestamp     DateTime
)
ENGINE = MergeTree()
ORDER BY (device_id, timestamp);
```

## NULL in JOIN Operations

NULL values in join keys cause rows not to match (NULL != NULL in JOIN conditions). This is standard SQL behavior:

```sql
-- Rows with NULL user_id in events_nullable will NOT join to any user
SELECT
    e.event_id,
    u.username
FROM events_nullable AS e
LEFT JOIN users AS u ON e.user_id = u.user_id
-- Rows where e.user_id IS NULL will have NULL username in result
;
```

Handle this with `ifNull` before joining:

```sql
SELECT
    e.event_id,
    u.username
FROM events_nullable AS e
LEFT JOIN users AS u ON ifNull(e.user_id, 0) = u.user_id
WHERE u.user_id != 0;
```

## Summary

ClickHouse's `Nullable(T)` type provides correct SQL NULL semantics but at a real performance cost - avoid it in sorting keys and high-frequency numeric columns where a sentinel value works equally well. Use `isNull`/`isNotNull` for null checks, `ifNull`/`coalesce` for substitution, and `nullIf` for converting sentinel values back to NULL in aggregations. When in doubt, prefer a non-nullable column with a well-defined default over a nullable one to keep queries fast and schema logic simpler.
