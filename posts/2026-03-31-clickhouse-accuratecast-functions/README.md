# How to Use accurateCast() and accurateCastOrNull() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Type Conversion, Safe Cast, Overflow, Type Safety

Description: Learn how to use accurateCast() and accurateCastOrNull() in ClickHouse for overflow-safe type downcasting with explicit out-of-range protection.

---

`accurateCast(x, 'type')` performs type conversion with overflow checking. Unlike `toInt32()` and the other `toIntN` functions, which silently wrap when a number is out of range for the target type, `accurateCast` throws an exception if the value does not fit. `accurateCastOrNull(x, 'type')` does the same but returns NULL instead of throwing. These functions are the safe choice whenever you are downcasting to a smaller integer type.

## The Problem: Silent Overflow in toIntN Functions

```sql
-- toIntN functions silently wrap for out-of-range values
SELECT toInt8(128);             -- returns -128 (wraps around, not an error)
SELECT toInt8(300);              -- also wraps silently

-- accurateCast throws an error instead:
-- SELECT accurateCast(300, 'Int8');  -- throws: value 300 is out of range for Int8
```

## accurateCast - Throw on Overflow

```sql
-- These succeed because the values fit in the target type
SELECT accurateCast(127, 'Int8')     AS int8_max;
SELECT accurateCast(255, 'UInt8')    AS uint8_max;
SELECT accurateCast(42.0, 'Int32')   AS float_to_int;
SELECT accurateCast('100', 'UInt16') AS str_to_uint;

-- This throws because 300 does not fit in Int8
-- SELECT accurateCast(300, 'Int8');
```

## accurateCastOrNull - Return NULL on Overflow

```sql
-- Returns NULL for out-of-range values instead of throwing
SELECT accurateCastOrNull(300, 'Int8')    AS overflow;    -- NULL
SELECT accurateCastOrNull(127, 'Int8')    AS valid;       -- 127
SELECT accurateCastOrNull(-1, 'UInt8')    AS negative;    -- NULL
SELECT accurateCastOrNull(0, 'UInt8')     AS zero;        -- 0
SELECT accurateCastOrNull(255, 'UInt8')   AS max_uint8;   -- 255
SELECT accurateCastOrNull(256, 'UInt8')   AS overflow2;   -- NULL
```

## Safe Downcasting in Data Pipelines

Use `accurateCastOrNull` when you want to detect out-of-range values in a dataset rather than having the query fail or silently corrupt data.

```sql
-- Detect values that do not fit in Int8 (range -128 to 127)
SELECT
    value,
    accurateCastOrNull(value, 'Int8') AS as_int8,
    accurateCastOrNull(value, 'Int8') IS NULL AS out_of_range
FROM (
    SELECT arrayJoin([50, 127, 128, 200, -100, -128, -129]) AS value
);
```

## Validating Column Ranges Before Downcasting

Before migrating a column from a larger to a smaller type, use `accurateCastOrNull` to audit the data.

```sql
-- Check if all values in a column fit in Int16 before migrating
SELECT
    count()                                           AS total_rows,
    countIf(accurateCastOrNull(score, 'Int16') IS NULL) AS out_of_range_count,
    min(score)                                        AS min_score,
    max(score)                                        AS max_score
FROM user_scores;

-- If out_of_range_count = 0, it is safe to downcast
```

## Schema Migration Safety Check

```sql
-- Before altering a column type, verify no rows would overflow
SELECT
    count()                                                       AS total,
    countIf(accurateCastOrNull(big_int_col, 'Int32') IS NULL)    AS would_overflow,
    countIf(accurateCastOrNull(big_int_col, 'Int32') IS NOT NULL) AS would_succeed
FROM production_table;
```

## Safe Integer Parsing with Range Enforcement

```sql
-- Parse and validate that the value fits in the target type
SELECT
    raw_input,
    toInt64OrNull(raw_input)                                  AS as_int64,
    accurateCastOrNull(toInt64OrNull(raw_input), 'Int16')     AS as_int16_safe
FROM string_inputs
LIMIT 10;
```

## Comparing accurateCast vs toInt32

```sql
-- All three approaches on in-range values produce the same result
SELECT
    CAST(100 AS Int32)          AS cast_100,
    toInt32(100)                AS toInt32_100,
    accurateCast(100, 'Int32')  AS accurate_100;

-- Behavior on overflow differs:
-- toInt32(9999999999) -> wraps silently to a defined but incorrect value
-- accurateCast(9999999999, 'Int32') -> throws exception
-- accurateCastOrNull(9999999999, 'Int32') -> NULL
```

## Handling Float-to-Integer Downcasting

```sql
-- Float with decimal part: decimal is truncated
SELECT accurateCast(3.9, 'Int32')    AS truncated;     -- returns 3

-- Float out of range for Int8
SELECT accurateCastOrNull(128.0, 'Int8')  AS overflow;  -- returns NULL
SELECT accurateCastOrNull(127.0, 'Int8')  AS valid;     -- returns 127
```

## Summary

`accurateCast(x, 'type')` converts values with overflow protection, throwing an exception when the value is out of range for the target type. `accurateCastOrNull(x, 'type')` returns NULL instead of throwing. Use these functions whenever you are downcasting to a smaller type (e.g., `Int64` to `Int8`) and want explicit protection against silent data corruption. They are especially valuable for validating column ranges before schema migrations and for safe parsing of user-supplied data.
