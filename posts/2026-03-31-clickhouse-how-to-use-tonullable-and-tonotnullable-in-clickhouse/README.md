# How to Use toNullable() and toNotNullable() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Nullable, toNullable, toNotNullable, Type System, SQL

Description: Learn how to use toNullable() and toNotNullable() in ClickHouse to convert between Nullable and non-Nullable column types for type compatibility and performance.

---

## Overview

ClickHouse distinguishes between nullable and non-nullable types at the type system level. `toNullable(value)` wraps any scalar value in a `Nullable(T)` type, while `assumeNotNull(value)` strips the `Nullable` wrapper. These functions enable type compatibility in JOINs, UNION operations, and conditional expressions.

## toNullable() - Adding Nullable Wrapper

```sql
SELECT
    42                      AS int_val,
    toTypeName(42)          AS int_type,
    toNullable(42)          AS nullable_val,
    toTypeName(toNullable(42)) AS nullable_type
```

Output:

```text
int_val | int_type | nullable_val | nullable_type
42      | UInt8    | 42           | Nullable(UInt8)
```

## Why Convert to Nullable?

The most common reason is type compatibility. When a UNION or expression requires both nullable and non-nullable sides to match:

```sql
-- This would fail: type mismatch between Nullable(String) and String
SELECT COALESCE(nullable_col, non_nullable_col) FROM mixed_table

-- Fix: make both nullable
SELECT COALESCE(nullable_col, toNullable(non_nullable_col)) FROM mixed_table
```

## UNION ALL Type Alignment

When performing UNION ALL, both selects must return compatible column types:

```sql
SELECT user_id, name, toNullable(age) AS age FROM registered_users
UNION ALL
SELECT user_id, name, NULL            AS age FROM guest_users
```

## assumeNotNull() - Removing Nullable Wrapper

`assumeNotNull()` strips the `Nullable` wrapper, returning the inner non-Nullable value:

```sql
SELECT
    toNullable(100)                        AS nullable_val,
    assumeNotNull(toNullable(100))         AS stripped_val,
    toTypeName(assumeNotNull(toNullable(100))) AS stripped_type
```

Output:

```text
nullable_val | stripped_val | stripped_type
100          | 100          | UInt8
```

## Using assumeNotNull for Performance

Nullable columns incur overhead for NULL tracking. Strip the wrapper in queries where NULLs are impossible:

```sql
SELECT
    sum(assumeNotNull(required_field)) AS total
FROM table_with_guaranteed_values
WHERE isNotNull(required_field)
```

## Creating Nullable Columns in Tables

While `toNullable` is mainly for expressions, table columns use the `Nullable(T)` type declaration:

```sql
CREATE TABLE customer_data
(
    id          UInt64,
    name        String,
    middle_name Nullable(String),
    phone       Nullable(String)
)
ENGINE = MergeTree()
ORDER BY id;
```

## Converting Column Nullability via ALTER

To change a column from non-nullable to nullable:

```sql
ALTER TABLE my_table MODIFY COLUMN my_col Nullable(String);
```

To convert from nullable to non-nullable (must have no NULLs):

```sql
-- First verify
SELECT countIf(isNull(my_col)) FROM my_table;
-- If 0, then:
ALTER TABLE my_table MODIFY COLUMN my_col String;
```

## Conditional Expression with Nullable

When using `if()` with one nullable and one non-nullable branch, ClickHouse infers `Nullable` for the result:

```sql
SELECT
    toTypeName(if(1 = 1, toNullable(42), 99)) AS result_type
-- Nullable(UInt8)
```

Use `assumeNotNull` on the result if you know both branches are non-null:

```sql
SELECT assumeNotNull(if(flag, val1, val2)) AS result
FROM table_where_neither_is_null
```

## Debugging Nullable Type Errors

When you see errors like "Cannot convert Nullable(T) to T", inspect your types:

```sql
SELECT
    toTypeName(col_a) AS col_a_type,
    toTypeName(col_b) AS col_b_type
FROM my_table
LIMIT 1
```

Then apply `toNullable()` to the non-nullable side or `ifNull(col, default)` to resolve the mismatch.

## Summary

`toNullable()` wraps a non-nullable value in the `Nullable(T)` type, and `assumeNotNull()` removes the wrapper. Use them to align types in UNION ALL operations, resolve type mismatches in conditional expressions, and optimize performance by stripping Nullable overhead when NULLs are guaranteed absent.
