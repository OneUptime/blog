# How to Use toUInt8(), toUInt16(), toUInt32(), toUInt64() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Type Conversion, Unsigned Integer, Safe Parsing, Storage Optimization

Description: Learn how to use toUInt8/16/32/64 and their OrZero/OrNull variants in ClickHouse for unsigned integer conversion and storage-efficient type casting.

---

ClickHouse provides `toUInt8()`, `toUInt16()`, `toUInt32()`, and `toUInt64()` for converting values to unsigned integer types. Unsigned integers store only non-negative values but have twice the positive range of their signed equivalents. Each function has `OrZero` and `OrNull` variants for safe conversion. Use unsigned types for values that are semantically non-negative, such as counts, sizes, and IDs.

## Unsigned Integer Type Ranges

```text
toUInt8   -> UInt8   -> 0 to 255
toUInt16  -> UInt16  -> 0 to 65,535
toUInt32  -> UInt32  -> 0 to 4,294,967,295
toUInt64  -> UInt64  -> 0 to 18,446,744,073,709,551,615
```

## Basic Usage

```sql
-- Convert string to unsigned integer
SELECT toUInt32('42')     AS from_string;
SELECT toUInt64('999999') AS large_value;

-- Convert float to unsigned integer (truncates)
SELECT toUInt32(3.9) AS truncated;  -- returns 3

-- toUInt8 is ideal for small positive values
SELECT toUInt8('200') AS byte_value;   -- fits in UInt8 (0-255)
SELECT toUInt8('256') AS overflow;     -- throws: out of range
```

## OrZero Variants

```sql
-- Invalid strings return 0
SELECT toUInt32OrZero('abc') AS invalid;   -- returns 0
SELECT toUInt32OrZero('-5')  AS negative;  -- returns 0 (negative is invalid for UInt)
SELECT toUInt32OrZero('42')  AS valid;     -- returns 42

-- Safe parsing of potentially invalid column data
SELECT
    raw_value,
    toUInt32OrZero(raw_value) AS safe_uint
FROM raw_input
LIMIT 10;
```

## OrNull Variants

```sql
-- Invalid strings return NULL
SELECT toUInt32OrNull('abc')  AS invalid;   -- returns NULL
SELECT toUInt32OrNull('-5')   AS negative;  -- returns NULL
SELECT toUInt32OrNull('42')   AS valid;     -- returns 42

-- Filter and parse in one step
SELECT
    raw_value,
    toUInt64OrNull(raw_value) AS parsed
FROM raw_input
WHERE toUInt64OrNull(raw_value) IS NOT NULL
LIMIT 10;
```

## Parsing Positive Integers from String Data

```sql
-- Parse counts, sizes, and IDs from log strings
SELECT
    log_entry,
    toUInt32OrNull(extractAll(log_entry, 'count=(\d+)')[1]) AS event_count,
    toUInt64OrNull(extractAll(log_entry, 'bytes=(\d+)')[1]) AS byte_count
FROM access_logs
WHERE event_count IS NOT NULL
LIMIT 10;
```

## Storage Optimization with Small UInt Types

ClickHouse stores data in columnar format, so choosing the smallest sufficient type significantly reduces storage.

```sql
-- UInt8 for values 0-255 (e.g., HTTP response class, age, score)
SELECT
    user_id,
    toUInt8(age) AS age_uint8
FROM users
WHERE age >= 0 AND age <= 255
LIMIT 10;

-- UInt16 for values up to 65,535 (e.g., port numbers, zip codes)
SELECT
    toUInt16(port_number) AS port
FROM network_connections
LIMIT 10;

-- UInt32 for most counts and IDs that fit in 4 billion
SELECT
    toUInt32(visit_count) AS visits
FROM user_stats
LIMIT 10;
```

## Type Normalization in UNION ALL

```sql
-- Align types from different sources
SELECT
    event_id,
    toUInt64(count_value) AS event_count
FROM source_table_a

UNION ALL

SELECT
    event_id,
    toUInt64(count_value) AS event_count
FROM source_table_b
LIMIT 20;
```

## Unsigned vs Signed: When to Choose Each

```sql
-- Comparison: choose based on whether negative values are possible
SELECT
    'HTTP status code'   AS column_name, 'UInt16' AS recommended_type,
    'Valid range 100-599, never negative' AS reason
UNION ALL SELECT 'Temperature (Celsius)', 'Int16', 'Can be negative'
UNION ALL SELECT 'User ID', 'UInt64', 'Never negative, needs large range'
UNION ALL SELECT 'Balance (cents)', 'Int64', 'Can be negative (overdraft)';
```

## Negative Input Handling

Passing a negative string to a `toUInt` function throws an exception in the standard variant (e.g., `toUInt32('-1')`). Note that passing a negative numeric value (e.g., `toUInt32(-1)`) does not throw — it wraps around using unsigned integer semantics. Use `OrNull` or `OrZero` to handle string parsing safely.

```sql
-- A negative number is out of range for UInt
SELECT toUInt32OrZero('-1') AS negative_input;  -- returns 0
SELECT toUInt32OrNull('-1') AS negative_input;  -- returns NULL

-- Filter out negatives before converting
SELECT
    user_id,
    toUInt32(raw_score) AS score
FROM raw_scores
WHERE toInt64OrNull(raw_score) >= 0   -- ensure positive before UInt cast
  AND toInt64OrNull(raw_score) IS NOT NULL
LIMIT 10;
```

## Summary

`toUInt8()`, `toUInt16()`, `toUInt32()`, and `toUInt64()` convert values to unsigned integer types. Use unsigned types for values that are semantically non-negative (counts, sizes, IDs, ages). The `OrZero` variants return 0 on invalid or negative input; the `OrNull` variants return NULL. Choosing the smallest UInt type that fits your data range (e.g., `UInt8` for 0-255) directly reduces storage and improves query performance on large tables.
