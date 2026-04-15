# How to Use toNullable() and assumeNotNull() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Nullable, Type Conversion, NULL Handling, Query Pattern

Description: Learn how toNullable() lifts a non-nullable value into a Nullable type and assumeNotNull() strips the Nullable wrapper in ClickHouse for type-safe NULL handling workflows.

---

`toNullable(value)` wraps a non-nullable value in a `Nullable(T)` type without changing the underlying data. `assumeNotNull(nullable_value)` does the opposite: it strips the `Nullable(T)` wrapper and returns the underlying `T` type, asserting to the query planner that the value is not NULL. If the value is actually NULL, the result of `assumeNotNull` is arbitrary according to the official documentation (in practice it often returns the default value for the type, but this is not guaranteed). These functions are used to bridge between nullable and non-nullable type contexts.

## toNullable() - Lifting a Value into Nullable Type

```sql
-- toNullable promotes a non-nullable value to Nullable(T)
SELECT
    toTypeName(42)                AS original_type,
    toTypeName(toNullable(42))    AS nullable_type;
```

```text
original_type  nullable_type
UInt8          Nullable(UInt8)
```

```sql
-- String example
SELECT
    toTypeName('hello')                AS str_type,
    toTypeName(toNullable('hello'))    AS nullable_str_type;
```

```text
str_type  nullable_str_type
String    Nullable(String)
```

## assumeNotNull() - Removing the Nullable Wrapper

```sql
CREATE TABLE nullable_scores
(
    user_id UInt64,
    score   Nullable(Float64)
)
ENGINE = MergeTree()
ORDER BY user_id;
```

```sql
INSERT INTO nullable_scores VALUES
    (1, 9.5),
    (2, NULL),
    (3, 7.2),
    (4, NULL),
    (5, 8.8);
```

```sql
-- assumeNotNull strips Nullable wrapper; NULL produces an arbitrary result (often 0.0 in practice)
SELECT
    user_id,
    score,
    assumeNotNull(score)      AS non_nullable_score,
    toTypeName(score)          AS type_before,
    toTypeName(assumeNotNull(score)) AS type_after
FROM nullable_scores
ORDER BY user_id;
```

```text
user_id  score  non_nullable_score  type_before       type_after
1        9.5    9.5                 Nullable(Float64)  Float64
2        NULL   0.0                 Nullable(Float64)  Float64
3        7.2    7.2                 Nullable(Float64)  Float64
4        NULL   0.0                 Nullable(Float64)  Float64
5        8.8    8.8                 Nullable(Float64)  Float64
```

The NULL rows show `0.0` here, but the official documentation states that `assumeNotNull` on a NULL value produces an arbitrary result — the output is not guaranteed to be the type default. Only use `assumeNotNull` when you have verified (or can guarantee) that the column has no NULLs.

## Practical Use of assumeNotNull: Enabling Array Functions

Many ClickHouse array and higher-order functions do not accept `Nullable(T)` elements. `assumeNotNull` allows you to pass nullable column values into these functions.

```sql
-- Collect non-null scores into an array (groupArray skips NULLs for Nullable columns)
SELECT
    groupArray(assumeNotNull(score)) AS scores_array,
    arraySum(groupArray(assumeNotNull(score))) AS total_score
FROM nullable_scores
WHERE score IS NOT NULL;
```

```text
scores_array      total_score
[9.5, 7.2, 8.8]  25.5
```

## toNullable() for Building Uniform UNION ALL Branches

When one branch of a `UNION ALL` returns a non-nullable column and another returns a nullable column, use `toNullable` to make types consistent.

```sql
-- Branch 1: non-nullable source
SELECT user_id, toNullable(score_int) AS score
FROM (SELECT 1 AS user_id, 90 AS score_int)

UNION ALL

-- Branch 2: already nullable source
SELECT user_id, score
FROM nullable_scores
WHERE score IS NOT NULL;
```

## Filling NULLs Before Using assumeNotNull

The safe pattern is to replace NULLs first, then call `assumeNotNull`.

```sql
-- Safe pattern: replace NULL with a sentinel, then strip Nullable
SELECT
    user_id,
    assumeNotNull(ifNull(score, -1.0)) AS safe_score
FROM nullable_scores
ORDER BY user_id;
```

```text
user_id  safe_score
1        9.5
2        -1.0
3        7.2
4        -1.0
5        8.8
```

## Type Coercion in Materialized Views

`assumeNotNull` is commonly used in materialized views when the target table has non-nullable columns but the source has nullable ones.

```sql
CREATE TABLE scores_materialized
(
    user_id UInt64,
    score   Float64  -- non-nullable target
)
ENGINE = MergeTree()
ORDER BY user_id;
```

```sql
-- Populate with NULL replaced by 0.0
INSERT INTO scores_materialized
SELECT
    user_id,
    assumeNotNull(ifNull(score, 0.0))
FROM nullable_scores;
```

## Checking Types Interactively

```sql
SELECT
    toTypeName(toNullable(1))                  AS promoted,
    toTypeName(assumeNotNull(toNullable(1)))   AS demoted,
    toTypeName(ifNull(toNullable(NULL::Nullable(UInt8)), toUInt8(0))) AS fallback;
```

```text
promoted         demoted  fallback
Nullable(UInt8)  UInt8    UInt8
```

## When toNullable is Needed

ClickHouse automatically handles comparisons between nullable and non-nullable columns, so `toNullable` is not required for basic comparisons. It is primarily needed for type-consistent `UNION ALL` branches (shown above) and for explicit type alignment when passing values to functions that require `Nullable(T)` input.

```sql
-- ClickHouse handles this comparison automatically (no toNullable needed)
-- Rows where score IS NULL produce NULL from the comparison, which is treated as false in WHERE
SELECT
    user_id,
    score
FROM nullable_scores
WHERE toFloat64(user_id) != score
ORDER BY user_id;
```

## Summary

`toNullable(value)` promotes any non-nullable value to its `Nullable(T)` equivalent without changing the data, useful for type-consistent `UNION ALL` branches and explicit type alignment. `assumeNotNull(value)` removes the `Nullable(T)` wrapper and returns the raw `T`, but if the value is actually NULL the result is arbitrary (undefined behavior per the documentation). Only call `assumeNotNull` when you have verified there are no NULLs, or after replacing NULLs with `ifNull`. Together these functions let you move values cleanly between nullable and non-nullable contexts, which is often necessary when bridging raw ingestion tables with strict analytics schemas.
