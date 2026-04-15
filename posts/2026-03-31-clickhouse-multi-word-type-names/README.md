# How to Use Multi-Word Type Names in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Type Names

Description: Learn how ClickHouse handles multi-word and parameterized type names like Nullable(Int32) and Array(String) with syntax and alias examples.

---

ClickHouse uses a rich type system where many types are parameterized with nested type arguments. Types like `Nullable(Int32)`, `Array(String)`, `Map(String, UInt64)`, and `LowCardinality(String)` are all single logical types expressed with multi-word or parenthesized syntax. Understanding how to write, reference, and alias these type names is essential for writing correct `CREATE TABLE` statements and `CAST` expressions.

## Parameterized Type Syntax

ClickHouse types are written as constructors with parentheses. Type names are case-insensitive, so `Nullable`, `nullable`, and `NULLABLE` are all valid.

```sql
-- Nullable wraps any type to allow NULL values
SELECT toTypeName(toNullable(42));
-- Result: Nullable(UInt8)

-- Array of a type
SELECT toTypeName([1, 2, 3]);
-- Result: Array(UInt8)

-- Map with key and value types
SELECT toTypeName(map('a', 1, 'b', 2));
-- Result: Map(String, UInt8)

-- Tuple with named or unnamed fields
SELECT toTypeName(tuple(1, 'hello', 3.14));
-- Result: Tuple(UInt8, String, Float64)
```

## Using Multi-Word Types in CREATE TABLE

When defining columns, write the full type expression including the parameterized arguments:

```sql
CREATE TABLE user_data (
    user_id    UInt64,
    name       Nullable(String),
    scores     Array(Float32),
    metadata   Map(String, String),
    tags       Array(LowCardinality(String)),
    coords     Tuple(lat Float64, lon Float64)
) ENGINE = MergeTree()
ORDER BY user_id;
```

There is no special quoting required for type names in DDL statements. The parentheses are part of the type syntax, not identifiers.

## Using Multi-Word Types in CAST

Parameterized types work directly in `CAST` expressions without any special quoting:

```sql
-- CAST with parameterized types
SELECT CAST(42 AS Nullable(Int32));
SELECT CAST([1, 2, 3] AS Array(Int64));
SELECT CAST('hello' AS LowCardinality(String));

-- toTypeName confirms the result
SELECT toTypeName(CAST(42 AS Nullable(Int32)));
-- Result: Nullable(Int32)
```

The inline `::` shorthand also works with parameterized types:

```sql
SELECT 42::Nullable(Int32);
```

## Type Aliases

ClickHouse provides shorter aliases for some common types. These can be used interchangeably with the full name:

```sql
-- INT is an alias for Int32
SELECT toTypeName(CAST(1 AS INT));
-- Result: Int32

-- DOUBLE is an alias for Float64
SELECT toTypeName(CAST(1.5 AS DOUBLE));
-- Result: Float64

-- TEXT and TINYTEXT are aliases for String
SELECT toTypeName(CAST('hello' AS TEXT));
-- Result: String

-- BOOLEAN is an alias for Bool (stored internally as UInt8)
SELECT toTypeName(CAST(1 AS BOOLEAN));
-- Result: Bool
```

These aliases exist for SQL compatibility with MySQL and PostgreSQL syntax but map to native ClickHouse types internally.

## Nested Types and Readability

Complex nested types can be written across multiple lines in DDL for readability. ClickHouse treats whitespace between type tokens as insignificant:

```sql
CREATE TABLE nested_example (
    id       UInt64,
    labels   Map(
                 LowCardinality(String),
                 Array(String)
             ),
    result   Nullable(
                 Tuple(
                     code    UInt16,
                     message String
                 )
             )
) ENGINE = MergeTree()
ORDER BY id;
```

## Checking Type Names at Runtime

Use `toTypeName()` to verify the exact canonical form of any type:

```sql
SELECT toTypeName(materialize(NULL));
-- Result: Nullable(Nothing)

SELECT toTypeName(CAST(1 AS LowCardinality(String)));
-- Result: LowCardinality(String)

SELECT toTypeName(CAST([] AS Array(Nullable(Int32))));
-- Result: Array(Nullable(Int32))
```

The canonical form returned by `toTypeName()` is the exact string you would use when casting or defining columns.

## Common Type Name Patterns

```sql
-- Optional values
Nullable(UInt64)
Nullable(String)
Nullable(DateTime)

-- Collections
Array(String)
Array(Nullable(Float64))
Array(Array(UInt8))

-- Key-value pairs
Map(String, UInt64)
Map(LowCardinality(String), Array(String))

-- Low-cardinality optimization
LowCardinality(String)
LowCardinality(Nullable(String))

-- Fixed precision numbers
Decimal(18, 4)
Decimal128(10)
```

## Summary

ClickHouse type names use a parameterized constructor syntax where nested types are expressed with parentheses. In both DDL statements and `CAST` expressions, write types directly without quoting. Use `toTypeName()` to inspect the canonical form of any type at runtime, and rely on type aliases like `INT` or `DOUBLE` when SQL compatibility is needed.
