# How to Use Arithmetic Operators in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Arithmetic, Operator, SQL, Query

Description: A practical guide to using arithmetic operators in ClickHouse queries, including integer division, modulo, and type promotion rules.

---

## Basic Arithmetic Operators

ClickHouse supports the standard set of arithmetic operators: `+`, `-`, `*`, `/`, and `%` (modulo). For integer division, use the `intDiv` function. These work on numeric types and follow implicit type promotion rules.

```sql
SELECT
  10 + 3 AS addition,         -- 13
  10 - 3 AS subtraction,      -- 7
  10 * 3 AS multiplication,   -- 30
  10 / 3 AS division,         -- 3.3333...
  intDiv(10, 3) AS int_div,   -- 3
  10 % 3 AS modulo            -- 1
```

## Type Promotion Rules

When both operands are up to 32 bits wide, ClickHouse promotes the result to the next larger type than the wider operand. Dividing two integers always produces a `Float64` result.

```sql
SELECT
  toTypeName(1 + 1),           -- UInt16
  toTypeName(1 + 1000000),     -- UInt64
  toTypeName(1 / 2),           -- Float64
  toTypeName(intDiv(10, 3))    -- UInt8 (integer division)
```

## Arithmetic in Aggregations

Use arithmetic inside aggregate expressions to compute derived metrics.

```sql
SELECT
  event_date,
  sum(revenue) AS total_revenue,
  sum(revenue) / count() AS avg_revenue_per_event,
  (sum(revenue) - sum(cost)) / sum(revenue) * 100 AS margin_pct
FROM sales
GROUP BY event_date
ORDER BY event_date DESC
LIMIT 30
```

## Using intDiv and modulo Functions

The `intDiv` function performs integer division, and `modulo` is the explicit form of `%`.

```sql
SELECT
  intDiv(timestamp, 3600) * 3600 AS hour_bucket,
  count() AS events
FROM logs
GROUP BY hour_bucket
ORDER BY hour_bucket
```

This pattern floors a Unix timestamp to the nearest hour.

## Avoiding Division by Zero

Use `if` or `nullIf` to guard against zero denominators. Dividing by `nullIf(x, 0)` returns `NULL` when `x` is zero, since any arithmetic with `NULL` yields `NULL`.

```sql
SELECT
  user_id,
  total_clicks / nullIf(total_views, 0) AS ctr_safe,
  if(total_views = 0, 0, total_clicks / total_views) AS ctr
FROM user_stats
```

## Power and Absolute Value

ClickHouse provides `pow`, `sqrt`, and `abs` for more complex math.

```sql
SELECT
  pow(2, 10) AS power_of_two,   -- 1024
  sqrt(144) AS square_root,     -- 12
  abs(-42) AS absolute_value    -- 42
```

## Bitwise Arithmetic

For flag columns and bitmask operations, use bitwise operators.

```sql
SELECT
  bitAnd(flags, 0x0F) AS lower_nibble,
  bitOr(flags, 0x10) AS set_bit,
  bitXor(a, b) AS xor_result
FROM feature_flags
```

## Summary

ClickHouse supports arithmetic operators `+`, `-`, `*`, `/`, and `%` with automatic type promotion. Use the `intDiv` function for integer division, guard zero denominators with `nullIf` or `if`, and leverage `pow`, `sqrt`, and `abs` for advanced numeric calculations in aggregation queries.
