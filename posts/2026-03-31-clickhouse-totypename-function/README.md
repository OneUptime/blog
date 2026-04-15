# How to Use toTypeName() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Type Inspection, Debugging, Schema, Introspection

Description: Learn how to use toTypeName() in ClickHouse to inspect the data type of any column or expression at query time for debugging and schema validation.

---

`toTypeName(x)` returns the ClickHouse type name of its argument as a `String`. It works on any expression - columns, literals, function results, or computed values. It is an essential debugging and introspection tool when you need to understand what type an expression produces, verify that a cast worked correctly, or diagnose type mismatch errors.

## Basic Usage

```sql
-- Get the type of literal values
SELECT toTypeName(42)         AS int_type;       -- 'UInt8'
SELECT toTypeName(42::Int32)  AS explicit_int32; -- 'Int32'
SELECT toTypeName(3.14)       AS float_type;     -- 'Float64'
SELECT toTypeName('hello')    AS str_type;       -- 'String'
SELECT toTypeName(today())    AS date_type;      -- 'Date'
SELECT toTypeName(now())      AS datetime_type;  -- 'DateTime'
SELECT toTypeName(NULL)       AS null_type;      -- 'Nullable(Nothing)'
```

## Inspecting Column Types at Query Time

```sql
-- Check the actual type of each column in a query result
SELECT
    toTypeName(user_id)       AS user_id_type,
    toTypeName(email)         AS email_type,
    toTypeName(created_at)    AS created_at_type,
    toTypeName(is_active)     AS is_active_type
FROM users
LIMIT 1;
```

## Verifying Cast Results

Use `toTypeName` to confirm that a `CAST` or conversion function produced the expected type.

```sql
-- Verify cast results
SELECT
    toTypeName(CAST(42 AS Int8))                     AS int8_check,
    toTypeName(CAST('2025-01-01' AS Date))           AS date_check,
    toTypeName(toDecimal64('99.99', 2))              AS decimal_check,
    toTypeName(toNullable(42))                       AS nullable_check,
    toTypeName(assumeNotNull(toNullable(42)))        AS non_nullable_check;
```

## Debugging Type Mismatch Errors

When a query fails with a type mismatch, use `toTypeName` to inspect what types are being produced.

```sql
-- Debug: find out what type an expression produces before using it
SELECT
    toTypeName(if(1 > 0, 42, 99))          AS if_result_type,
    toTypeName(multiIf(1 > 0, 42, 99))     AS multiif_result_type,
    toTypeName(coalesce(NULL, 42))          AS coalesce_result_type;
```

## Checking Nullable Wrapping

```sql
-- Check whether a column is nullable
SELECT
    toTypeName(phone_number)                              AS raw_type,
    toTypeName(phone_number) LIKE 'Nullable%'            AS is_nullable,
    toTypeName(assumeNotNull(phone_number))              AS after_assumeNotNull
FROM users
LIMIT 1;
```

## Listing Column Types from system.columns

For full schema inspection, query `system.columns` instead of using `toTypeName` in a data query.

```sql
-- Get column names and types for a specific table
SELECT
    name,
    type,
    default_kind,
    default_expression
FROM system.columns
WHERE table    = 'orders'
  AND database = currentDatabase()
ORDER BY position;
```

## Dynamic Type Inspection in Aggregations

```sql
-- Inspect what type aggregate functions return
SELECT
    toTypeName(count())                AS count_type,
    toTypeName(sum(price))             AS sum_type,
    toTypeName(avg(price))             AS avg_type,
    toTypeName(min(price))             AS min_type,
    toTypeName(groupArray(price))      AS grouparray_type
FROM products
LIMIT 1;
```

## Verifying Array Element Types

```sql
-- Check element type of arrays
SELECT
    toTypeName([1, 2, 3])              AS int_array_type,
    toTypeName([1.0, 2.0, 3.0])        AS float_array_type,
    toTypeName(['a', 'b', 'c'])        AS str_array_type,
    toTypeName(array(1, 2, NULL))      AS nullable_array_type;
```

## Using toTypeName in System Queries

```sql
-- Find all tables in the current database that have Nullable columns
SELECT
    table,
    name AS column_name,
    type
FROM system.columns
WHERE database = currentDatabase()
  AND type LIKE 'Nullable%'
ORDER BY table, name
LIMIT 20;
```

## Confirming OrNull Function Output Types

```sql
-- OrNull functions return Nullable types
SELECT
    toTypeName(toInt32OrNull('42'))        AS int_or_null_type,
    toTypeName(toFloat64OrNull('3.14'))    AS float_or_null_type,
    toTypeName(toInt32OrZero('42'))        AS int_or_zero_type;
-- int_or_null_type  -> 'Nullable(Int32)'
-- float_or_null_type -> 'Nullable(Float64)'
-- int_or_zero_type  -> 'Int32' (OrZero returns non-nullable)
```

## Summary

`toTypeName(x)` returns the ClickHouse type name as a string for any expression. It is an invaluable debugging tool for diagnosing type mismatch errors, verifying that cast operations produce the expected output type, and understanding how aggregate and conditional functions affect types. Combine it with `system.columns` for static schema inspection and use it inline in queries when you need to verify a type at query execution time.
