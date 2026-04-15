# How to Understand ClickHouse Type System and Inference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Type System, Type Inference

Description: Learn how ClickHouse infers types from literals, promotes types in expressions, and how to inspect types using toTypeName with examples.

---

ClickHouse has a strong static type system where every expression has a concrete type determined at query parse and planning time. Unlike loosely typed databases that coerce silently and extensively, ClickHouse is explicit: types are inferred from literals, promoted in mixed-type expressions, and inspectable at any point. Understanding the rules governing this system helps you write queries that behave predictably and avoid surprising runtime errors.

## How ClickHouse Infers Types from Literals

When you write a literal value in a query, ClickHouse assigns the narrowest type that can represent it:

```sql
SELECT toTypeName(1);
-- Result: UInt8  (fits in one byte)

SELECT toTypeName(256);
-- Result: UInt16  (too large for UInt8)

SELECT toTypeName(70000);
-- Result: UInt32

SELECT toTypeName(-1);
-- Result: Int8  (signed, fits in one byte)

SELECT toTypeName(3.14);
-- Result: Float64

SELECT toTypeName('hello');
-- Result: String

SELECT toTypeName(true);
-- Result: Bool  (Boolean literal, internally stored as UInt8)

SELECT toTypeName(NULL);
-- Result: Nullable(Nothing)
```

This narrowest-type inference minimizes storage during query processing and intermediate result allocation.

## Type Promotion in Arithmetic Expressions

When two values of different types are combined in an arithmetic expression, ClickHouse promotes to the common supertype - the smallest type that can represent both operands without loss:

```sql
-- Mixing Int8 and Int32 promotes to Int64 (next bigger type after Int32)
SELECT toTypeName(toInt8(1) + toInt32(2));
-- Result: Int64

-- Mixing UInt32 and Int32: signed wins, result is Int64
SELECT toTypeName(toUInt32(1) + toInt32(2));
-- Result: Int64

-- Mixing Float32 and Float64 promotes to Float64
SELECT toTypeName(toFloat32(1.0) + toFloat64(2.0));
-- Result: Float64

-- Mixing integer and float promotes to float
SELECT toTypeName(toInt32(1) + 1.5);
-- Result: Float64
```

The general promotion hierarchy is:
- Integers: result is the next bigger type after the wider operand to prevent overflow
- Signed vs unsigned of same width: result is the next wider signed type
- Integer + Float: result is Float
- Float32 + Float64: result is Float64

## Nullable Type Propagation

When any operand is `Nullable`, the result of an expression is also `Nullable`:

```sql
SELECT toTypeName(toNullable(1) + 1);
-- Result: Nullable(UInt16)

SELECT toTypeName(toNullable('x') || 'y');
-- Result: Nullable(String)
```

This propagation ensures that `NULL` values flow correctly through calculations. To strip nullability when you are certain a value is not NULL, use `assumeNotNull()`:

```sql
SELECT toTypeName(assumeNotNull(toNullable(42)));
-- Result: UInt8
```

## Type Compatibility in Comparisons

ClickHouse coerces types in comparison expressions following the same promotion rules. However, comparing types of very different families (String vs Int) can produce unexpected behavior:

```sql
-- Comparing String to Int: the string is cast to Int
SELECT '42' = 42;
-- Result: 1 (true, '42' cast to UInt8)

SELECT 'abc' = 0;
-- Result: 1 (true - 'abc' fails cast to Int, becomes 0 which equals 0)
```

This implicit coercion in filters can bypass index usage on indexed columns. For index-efficient queries, ensure the comparison operands are the same type:

```sql
-- If user_id is UInt64, compare with a UInt64 literal
SELECT * FROM users WHERE user_id = 12345;  -- literal inferred as UInt64-compatible

-- Avoid mixing types in index keys
-- BAD: may not use primary key index if types differ
SELECT * FROM users WHERE toString(user_id) = '12345';

-- GOOD: keep the column unmodified on the left side
SELECT * FROM users WHERE user_id = 12345;
```

## Using toTypeName to Debug Types

`toTypeName()` is the most useful diagnostic tool in the type system. Call it on any expression to see the resolved type:

```sql
-- Check column types in a table
SELECT
    toTypeName(id)          AS id_type,
    toTypeName(name)        AS name_type,
    toTypeName(created_at)  AS created_at_type
FROM users
LIMIT 1;

-- Check the result type of a complex expression
SELECT toTypeName(
    if(rand() > 0.5, toFloat32(1.0), toFloat64(2.0))
);
-- Result: Float64  (promoted to the wider type)

-- Check Array literal types
SELECT toTypeName([1, 2, 3]);
-- Result: Array(UInt8)

SELECT toTypeName([1, 2, 256]);
-- Result: Array(UInt16)  (promoted because 256 needs UInt16)
```

## Type Inference in Array Literals

Array literals infer the element type by finding the common supertype of all elements:

```sql
SELECT toTypeName([1, 2, 3]);
-- Result: Array(UInt8)

SELECT toTypeName([1, 2, -1]);
-- Result: Array(Int16)  (common supertype of UInt8 and Int8 is Int16)

SELECT toTypeName([1, 2.5, 3]);
-- Result: Array(Float64)  (float forces float promotion)

SELECT toTypeName([1, NULL, 3]);
-- Result: Array(Nullable(UInt8))  (NULL forces Nullable)
```

## Type Inference from File and External Formats

When reading data with `SELECT ... FROM file(...)` or schema-on-read functions, ClickHouse infers column types by sampling the data:

```sql
-- ClickHouse infers types from CSV/JSON samples
SELECT toTypeName(number), toTypeName(name)
FROM file('data.csv', CSV, 'number Int32, name String')
LIMIT 1;
```

Explicit schemas in file functions override inference. When schemas are omitted in formats like `JSONEachRow`, ClickHouse samples rows to determine the most appropriate type.

## Summary

ClickHouse infers the narrowest type for literals, promotes mixed-type expressions to the smallest common supertype, and propagates `Nullable` through any expression involving a nullable operand. Use `toTypeName()` to inspect the resolved type of any expression at query time. Understanding promotion rules - especially signed/unsigned mixing and float promotion - prevents surprising results in arithmetic and comparison expressions.
