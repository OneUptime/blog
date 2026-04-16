# How to Use assumeNotNull() Safely in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NULL Handling, assumeNotNull, Nullable, SQL

Description: Learn how to use assumeNotNull() in ClickHouse to strip the Nullable wrapper from a column type safely, and when it is appropriate to use.

---

## Overview

`assumeNotNull(value)` converts a `Nullable(T)` expression to a non-nullable `T` type. It tells ClickHouse to treat the value as if it will never be NULL - but does NOT check for NULLs at runtime. If a NULL value is actually encountered, the behavior is undefined (typically returns the zero value for the type). Use it only when you have proven the column contains no NULLs.

## Basic Usage

```sql
SELECT
    toTypeName(toNullable(42))                AS nullable_type,
    toTypeName(assumeNotNull(toNullable(42))) AS non_nullable_type
```

Output:

```text
nullable_type  | non_nullable_type
Nullable(UInt8) | UInt8
```

## When to Use assumeNotNull

The primary use case is performance optimization. Nullable columns add overhead because ClickHouse must track a NULL bitmask for every value. If you have verified (through ETL guarantees or data validation) that a column never contains NULL, you can strip the wrapper to enable faster processing.

```sql
-- Before: nullable column with overhead
SELECT sum(price) FROM orders WHERE assumeNotNull(price) > 0

-- If price is guaranteed non-null, this avoids Nullable branching in the engine
SELECT sum(assumeNotNull(price)) FROM orders
```

## Removing Nullable in JOIN Keys

JOIN operations on Nullable keys can be slower than on non-nullable ones. Strip the wrapper when keys are guaranteed non-null:

```sql
SELECT
    a.user_id,
    b.name
FROM events a
JOIN users b ON assumeNotNull(a.user_id) = b.user_id
```

## Safe Pattern - Verify First

Always verify there are no NULLs before using `assumeNotNull`:

```sql
-- Step 1: Verify no NULLs exist
SELECT countIf(isNull(price)) AS null_prices FROM orders
-- If 0, safe to proceed

-- Step 2: Use assumeNotNull
SELECT avg(assumeNotNull(price)) AS avg_price FROM orders
```

## Materialized Column Pattern

Use `assumeNotNull` in computed or materialized columns after verifying data quality:

```sql
ALTER TABLE orders ADD COLUMN price_clean Float64
    MATERIALIZED assumeNotNull(price_raw);
```

This stores the non-nullable version alongside the original Nullable column.

## Contrast with ifNull

`assumeNotNull` does NOT replace NULLs - it just changes the type declaration. If a NULL is encountered, behavior is undefined:

```sql
-- UNSAFE if column may contain NULLs:
SELECT sum(assumeNotNull(price)) FROM orders

-- SAFE: replace NULLs with 0 before summing
SELECT sum(ifNull(price, 0.0)) FROM orders
```

Only use `assumeNotNull` after confirmed data quality. For defensive coding, use `ifNull` instead.

## Performance Benefit

Stripping Nullable wrappers on aggregate function inputs can improve query performance by 10-30% on large datasets where the Nullable overhead is measurable. Profile with `EXPLAIN` and `system.query_log` to confirm the benefit:

```sql
SET send_logs_level = 'trace';
SELECT sum(assumeNotNull(metric_value)) FROM metrics;
```

## Summary

`assumeNotNull(value)` strips the `Nullable(T)` wrapper without runtime NULL checking - it is a type system bypass, not a safe conversion. Use it only after verifying through data validation that a column contains no NULLs. For production code where NULLs are possible, prefer `ifNull()` for safe defaults or filter with `WHERE isNotNull(col)` before aggregating.
