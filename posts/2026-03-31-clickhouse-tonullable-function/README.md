# How to Use toNullable() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NULL Handling, Type Conversion, UNION ALL, Schema

Description: Learn how to use toNullable() in ClickHouse to convert non-nullable types to Nullable(T) for UNION ALL compatibility and nullable-aware functions.

---

`toNullable(x)` converts a non-nullable value or column to `Nullable(T)`. This is the reverse of `assumeNotNull()`. Its primary use is resolving type mismatches when combining nullable and non-nullable columns in `UNION ALL` queries, or when a function requires a `Nullable(T)` input but your column is a plain `T`.

## Basic Usage

```sql
-- Convert a non-nullable String to Nullable(String)
SELECT toNullable('hello') AS nullable_value;

-- Check the type transformation
SELECT
    toTypeName('hello')              AS original_type,
    toTypeName(toNullable('hello'))  AS nullable_type;
```

## Resolving UNION ALL Type Mismatches

One reason to use `toNullable()` is a `UNION ALL` between a table that has nullable columns and one that has non-nullable columns. ClickHouse automatically promotes non-nullable columns to `Nullable(T)` in `UNION ALL` when the base types are compatible, so `toNullable()` is not strictly required. However, using it makes the type conversion explicit and can improve readability.

```sql
-- ClickHouse auto-promotes amount to Nullable(Float64) in the result,
-- but toNullable() makes the intent explicit
SELECT
    order_id,
    amount,
    'recent' AS source
FROM recent_orders

UNION ALL

SELECT
    order_id,
    toNullable(amount) AS amount,  -- explicitly convert to Nullable(Float64)
    'archive' AS source
FROM archive_orders

ORDER BY order_id
LIMIT 20;
```

## Combining Nullable and Non-Nullable in Expressions

ClickHouse generally auto-promotes non-nullable types to nullable when needed in expressions. However, `toNullable()` can make the type alignment explicit.

```sql
-- Suppose col_a is String (non-nullable) and col_b is Nullable(String)
-- toNullable makes the type conversion explicit, though ClickHouse
-- would auto-promote col_a in this context
SELECT
    coalesce(toNullable(col_a), col_b) AS combined
FROM my_table
LIMIT 10;
```

## Using toNullable in Table Definitions

When inserting from a non-nullable source into a nullable column, the implicit conversion handles it. But when defining computed columns, `toNullable` makes the intent explicit.

```sql
CREATE TABLE nullable_demo
(
    id         UInt64,
    raw_value  UInt32,
    -- Explicitly nullable version for downstream joins
    null_value Nullable(UInt32) DEFAULT toNullable(raw_value)
)
ENGINE = MergeTree()
ORDER BY id;
```

## toNullable with Literals

Use `toNullable` with literals when you need a typed NULL or a nullable literal in an expression.

```sql
-- A nullable literal for use in conditional expressions
SELECT
    if(1 = 2, toNullable(42), NULL) AS conditional_null;
```

## Type Alignment for Array Functions

You can use `toNullable()` inside array lambdas to produce an `Array(Nullable(T))` when you need nullable elements — for example, when combining arrays that mix nullable and non-nullable element types.

```sql
-- Convert array elements to nullable
SELECT
    arrayMap(x -> toNullable(x), [1, 2, 3]) AS nullable_array;
```

## Checking Current Type

Always check the column type before using `toNullable()` - it is only needed when the column is currently non-nullable.

```sql
-- Check which columns in a table are already nullable
SELECT
    name,
    type,
    type LIKE 'Nullable%' AS is_nullable
FROM system.columns
WHERE table = 'my_table'
  AND database = currentDatabase()
ORDER BY name;
```

## toNullable vs Nullable Column Definition

```sql
-- At table definition time, declare nullable directly
CREATE TABLE example_a
(
    id    UInt64,
    value Nullable(String)   -- nullable from the start
)
ENGINE = MergeTree()
ORDER BY id;

-- At query time, convert a non-nullable to nullable
SELECT toNullable(non_nullable_col) AS converted
FROM example_a
LIMIT 5;
```

Declare columns as `Nullable(T)` in the schema when values are genuinely optional. Use `toNullable()` at query time only to resolve type conflicts in expressions or `UNION ALL`.

## Summary

`toNullable(x)` wraps a non-nullable type in `Nullable(T)`, making the type conversion explicit when working with nullable columns. While ClickHouse often auto-promotes non-nullable types to nullable where needed (e.g., in `UNION ALL` and expressions), `toNullable()` is useful for clarity and in edge cases where explicit conversion is required. It is the complement of `assumeNotNull()` - use `toNullable()` to widen a type (making it accept NULL), and `assumeNotNull()` to narrow it (asserting no NULLs exist).
