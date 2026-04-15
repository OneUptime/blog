# How to Convert Between Data Types in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Type Conversion, CAST

Description: Learn how to convert between data types in ClickHouse using CAST, toInt32, toString, and accurateCast with practical examples.

---

Type conversion is a fundamental operation in any SQL database. ClickHouse offers several ways to convert values between types: the standard `CAST` operator, type-specific functions like `toInt32()` and `toString()`, and the safer `accurateCast()` variant that raises errors on overflow. Understanding when to use each approach helps you write correct, performant queries.

## Using CAST

The `CAST(x AS T)` syntax converts a value `x` to type `T`. It follows the same convention as standard SQL and is the most explicit form of type conversion in ClickHouse.

```sql
SELECT CAST(42 AS String);
-- Result: '42'

SELECT CAST('2024-01-15' AS Date);
-- Result: 2024-01-15

SELECT CAST(3.14 AS Int32);
-- Result: 3 (truncates, no error on truncation)
```

ClickHouse also supports the shorthand `::` cast operator:

```sql
SELECT 42::String;
SELECT '2024-01-15'::Date;
SELECT 3.14::Int32;
```

## Using Type-Specific Conversion Functions

ClickHouse provides a family of `toType()` functions for each built-in type. These are often more readable than `CAST` and behave identically for most use cases.

```sql
-- Numeric conversions
SELECT toInt8(127);
SELECT toInt32('42');
SELECT toUInt64(9999999999);
SELECT toFloat64('3.14159');

-- String conversion
SELECT toString(12345);
SELECT toString(3.14);
SELECT toString(toDate('2024-01-15'));

-- Date and time conversions
SELECT toDate('2024-01-15');
SELECT toDateTime('2024-01-15 10:30:00');
SELECT toDateTime64('2024-01-15 10:30:00.123', 3);
```

When the input cannot be converted, the base `toType()` functions throw an exception. Use the `OrNull` and `OrZero` variants for safe fallback behavior:

```sql
SELECT toInt32('not_a_number');
-- Exception: Cannot parse string 'not_a_number' as Int32

SELECT toInt32OrNull('not_a_number');
-- Result: NULL

SELECT toInt32OrZero('not_a_number');
-- Result: 0
```

The `OrNull` variant returns NULL on failure, while `OrZero` returns the default value for the target type (0 for numbers).

## Using accurateCast

`accurateCast(x, T)` behaves like `CAST` but throws an exception if the value overflows the target type. Use it when data integrity matters more than silent truncation.

```sql
-- This succeeds
SELECT accurateCast(127, 'Int8');
-- Result: 127

-- This raises an exception because 300 overflows Int8
SELECT accurateCast(300, 'Int8');
-- Exception: Value in column exceeds limit for type Int8
```

Compare this with the default behavior:

```sql
SELECT CAST(300 AS Int8);
-- Result: 44 (wraps around, no error)
```

Use `accurateCastOrNull` when you want NULL on overflow rather than an exception:

```sql
SELECT accurateCastOrNull(300, 'Int8');
-- Result: NULL
```

## Checking Types with toTypeName

Before or after conversion, use `toTypeName()` to inspect the actual type of an expression:

```sql
SELECT toTypeName(42);
-- Result: UInt8

SELECT toTypeName(42::Int32);
-- Result: Int32

SELECT toTypeName(now());
-- Result: DateTime

SELECT toTypeName(toNullable(42));
-- Result: Nullable(UInt8)
```

This is especially useful when debugging unexpected type coercion behavior in complex queries.

## Implicit Type Coercion Rules

ClickHouse performs implicit coercion in certain contexts, such as arithmetic between mixed numeric types. The result type is typically the larger or more precise type:

```sql
SELECT toTypeName(toInt8(1) + toInt32(2));
-- Result: Int64

SELECT toTypeName(toFloat32(1.0) + toFloat64(2.0));
-- Result: Float64

SELECT toTypeName(1 + 1.5);
-- Result: Float64
```

When comparing values of different types, ClickHouse attempts to coerce one side to match the other. Relying on implicit coercion in filter conditions can lead to unexpected index behavior - prefer explicit casts in WHERE clauses on indexed columns.

## Practical Example - ETL Type Normalization

A common pattern when ingesting raw data is normalizing string columns to their intended types:

```sql
SELECT
    toInt64OrNull(raw_user_id)       AS user_id,
    toFloat64OrNull(raw_price)       AS price,
    toDateOrNull(raw_event_date)     AS event_date,
    toString(status_code)            AS status_str
FROM raw_events
WHERE toInt64OrNull(raw_user_id) IS NOT NULL;
```

This approach lets you filter bad rows while preserving valid records.

## Summary

ClickHouse provides `CAST`, the `::` shorthand, and `toType()` functions for type conversion. Use `accurateCast()` when overflow should be an error, and `toTypeOrNull()` / `toTypeOrZero()` variants when you need safe fallbacks. Always use `toTypeName()` to verify the actual runtime type of an expression when debugging coercion issues.
