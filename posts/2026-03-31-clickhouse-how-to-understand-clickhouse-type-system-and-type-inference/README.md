# How to Understand ClickHouse Type System and Type Inference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Type System, Type Inference, Data Type, Schema Design

Description: Understand ClickHouse's type system, how automatic type inference works during data ingestion, and how to control type resolution for accurate schemas.

---

## ClickHouse Type System Overview

ClickHouse has a rich, strongly-typed system. Every column and every expression has a precise type. Understanding how the type system works is essential for schema design, query optimization, and debugging type errors.

The main type categories are:

| Category | Examples |
|----------|---------|
| Integer | `Int8`, `Int16`, `Int32`, `Int64`, `Int128`, `Int256` |
| Unsigned Integer | `UInt8`, `UInt16`, `UInt32`, `UInt64`, `UInt128`, `UInt256` |
| Float | `Float32`, `Float64` |
| Decimal | `Decimal(P, S)`, `Decimal32`, `Decimal64`, `Decimal128` |
| String | `String`, `FixedString(N)` |
| Date/Time | `Date`, `Date32`, `DateTime`, `DateTime64(precision)` |
| Boolean | `Bool` (alias for `UInt8`) |
| Composite | `Array(T)`, `Tuple(T1, T2, ...)`, `Map(K, V)` |
| Special | `UUID`, `IPv4`, `IPv6`, `Enum8`, `Enum16` |
| Nullable | `Nullable(T)` |
| Low cardinality | `LowCardinality(T)` |

## Checking Column Types

```sql
-- View types in a table
DESCRIBE TABLE my_table;

-- View types with all metadata
SELECT name, type, default_kind, default_expression
FROM system.columns
WHERE database = currentDatabase()
  AND table = 'my_table'
ORDER BY position;

-- Check the type of an expression
SELECT toTypeName(42);           -- UInt8
SELECT toTypeName(42.0);         -- Float64
SELECT toTypeName('hello');      -- String
SELECT toTypeName(now());        -- DateTime
SELECT toTypeName([1, 2, 3]);    -- Array(UInt8)
SELECT toTypeName((1, 'hi'));    -- Tuple(UInt8, String)
```

## Type Inference in SELECT Queries

ClickHouse infers types for literals and expressions:

```sql
-- Integer literals - ClickHouse uses the smallest fitting type
SELECT toTypeName(1);      -- UInt8 (0..255)
SELECT toTypeName(300);    -- UInt16 (0..65535)
SELECT toTypeName(100000); -- UInt32
SELECT toTypeName(-1);     -- Int8

-- Arithmetic promotes types
SELECT toTypeName(1 + 1.0);     -- Float64
SELECT toTypeName(toInt32(1) + toInt64(1)); -- Int64 (wider type wins)

-- NULL has type Nullable
SELECT toTypeName(NULL);  -- Nullable(Nothing)
```

## Type Inference from Files and External Data

When reading CSV, JSON, or Parquet files, ClickHouse can infer column types automatically:

```sql
-- Infer types from a CSV file
DESCRIBE TABLE file('data.csv', CSVWithNames);

-- Infer from JSON
DESCRIBE TABLE file('events.json', JSONEachRow);

-- Infer from Parquet
DESCRIBE TABLE file('data.parquet', Parquet);

-- Schema inference control
SELECT * FROM file('data.csv', CSVWithNames)
SETTINGS
    schema_inference_make_columns_nullable = 0,  -- don't use Nullable
    input_format_csv_detect_header = 1;
```

## Automatic Type Promotion Rules

When ClickHouse needs to unify types (e.g., in UNION ALL or when inserting mixed types), it follows promotion rules:

```sql
-- Type promotion in UNION
SELECT toTypeName(x) FROM (
    SELECT 1 AS x
    UNION ALL
    SELECT 300 AS x
);
-- Result type: UInt16 (smallest type that fits both)

-- Nullable promotion
SELECT toTypeName(x) FROM (
    SELECT 1 AS x
    UNION ALL
    SELECT NULL AS x
);
-- Result type: Nullable(UInt8)

-- Float promotion
SELECT toTypeName(x) FROM (
    SELECT toInt32(1) AS x
    UNION ALL
    SELECT toFloat64(1.5) AS x
);
-- Result type: Float64
```

## Explicit Type Casting

```sql
-- CAST function
SELECT CAST(42, 'Float64');
SELECT CAST('2024-01-01', 'Date');

-- toType() functions
SELECT toFloat64(42);
SELECT toString(42);
SELECT toDate('2024-01-01');
SELECT toDateTime('2024-01-01 12:00:00');
SELECT toDecimal64(3.14, 2);

-- accurateCast - raises error on overflow (safer)
SELECT accurateCast(300, 'UInt8');  -- ERROR: 300 doesn't fit in UInt8

-- Regular cast - wraps/truncates silently
SELECT CAST(300 AS UInt8);  -- Returns 44 (300 mod 256)

-- OrNull and OrZero variants
SELECT toUInt32OrNull('not_a_number');  -- returns NULL
SELECT toUInt32OrZero('not_a_number');  -- returns 0
```

## Type System and Nullable

```sql
-- Nullable propagation in expressions
SELECT toTypeName(NULL + 1);  -- Nullable(UInt8) - NULL propagates
SELECT toTypeName(ifNull(NULL, 0));  -- UInt8 - NULL resolved

-- Functions that return Nullable
SELECT toTypeName(toNullable(42));  -- Nullable(UInt8)
SELECT toTypeName(nullIf(42, 42));  -- Nullable(UInt8)

-- Strip Nullable
SELECT toTypeName(assumeNotNull(toNullable(42)));  -- UInt8
```

## Type Inference Settings

```sql
-- Control how numbers are inferred from strings
SET input_format_try_infer_integers = 1;       -- "42" -> UInt64
SET input_format_try_infer_dates = 1;           -- "2024-01-01" -> Date
SET input_format_try_infer_datetimes = 1;       -- "2024-01-01 00:00:00" -> DateTime
SET input_format_json_try_infer_numbers_from_strings = 1;

-- Control nullable inference
SET schema_inference_make_columns_nullable = 1;  -- make all inferred nullable
```

## Practical Example: Schema Validation

```sql
-- Validate that a computed expression has the expected type
CREATE OR REPLACE VIEW type_checks AS
SELECT
    toTypeName(sum(views)) AS sum_views_type,
    toTypeName(avg(revenue)) AS avg_revenue_type,
    toTypeName(max(created_at)) AS max_ts_type,
    toTypeName(any(user_id)) AS any_uid_type
FROM some_table;

-- Use DESCRIBE to check view output types
DESCRIBE type_checks;
```

## Common Type Issues and Fixes

```sql
-- Issue 1: Comparing String and Integer
-- SELECT * FROM t WHERE string_col = 42;  -- implicit cast, can be slow
-- Fix: compare same types
SELECT * FROM t WHERE string_col = '42';

-- Issue 2: DateTime vs DateTime64 mismatch
-- DateTime has second precision, DateTime64 has subsecond
SELECT toTypeName(now());          -- DateTime (seconds)
SELECT toTypeName(now64());        -- DateTime64(3) (milliseconds by default)
SELECT now() = now64();            -- works via implicit cast, but rarely equal due to precision

-- Issue 3: Integer overflow
SELECT toUInt8(256);   -- wraps to 0, no error
SELECT accurateCastOrNull(256, 'UInt8');  -- returns NULL, safer
```

## Summary

ClickHouse's type system is strongly typed and comprehensive, covering integers, floats, decimals, strings, dates, composites, and special types. Type inference automatically determines types from literals, expressions, and file formats. Understanding type promotion rules, explicit casting functions, and the behavior of Nullable types helps you design accurate schemas, write correct queries, and avoid silent data corruption from overflow or type coercion.
