# How to Use if() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Conditional Function, NULL Handling, Query Optimization

Description: Learn how to use the if() function in ClickHouse as a ternary conditional with short-circuit evaluation and NULL-safe patterns.

---

The `if(cond, then, else)` function is ClickHouse's primary ternary conditional. It evaluates a boolean condition and returns one of two values depending on the result. ClickHouse evaluates `if()` with short-circuit semantics - only the branch that matches the condition is evaluated, which avoids errors in the branch that is not selected (such as division by zero in the false branch).

## Basic Usage

```sql
-- Simple ternary conditional
SELECT if(1 > 0, 'yes', 'no') AS result;

-- Apply a condition to a column
SELECT
    order_id,
    amount,
    if(amount > 100, 'high value', 'standard') AS order_tier
FROM orders
LIMIT 10;
```

## Short-Circuit Evaluation

Because `if()` is short-circuit (controlled by the `short_circuit_function_evaluation` setting, which defaults to `enable`), you can safely put potentially-erroring expressions in either branch without worrying about the branch that won't be executed. Short-circuit kicks in for eligible functions — in particular, functions that can throw (like division, `dictGet`, or `toInt32`) and heavy functions.

```sql
-- Short-circuit prevents division by zero when denominator is 0
SELECT
    user_id,
    total_sessions,
    total_purchases,
    if(total_sessions > 0, total_purchases / total_sessions, 0) AS purchase_rate
FROM user_stats
LIMIT 10;
```

## NULL Handling with if()

Use `if()` combined with `isNull()` to replace NULL values with defaults.

```sql
-- Replace NULL with a default value
SELECT
    user_id,
    if(isNull(phone_number), 'not provided', phone_number) AS phone
FROM users
LIMIT 10;

-- Use ifNull() as a shorthand (equivalent)
SELECT
    user_id,
    ifNull(phone_number, 'not provided') AS phone
FROM users
LIMIT 10;
```

## Conditional Column Selection

Use `if()` to switch between columns based on a row-level condition.

```sql
-- Select the best available price
SELECT
    product_id,
    if(sale_price > 0, sale_price, regular_price) AS effective_price
FROM products
LIMIT 10;
```

## Conditional Aggregation

Combine `if()` with aggregate functions to compute conditional counts and sums.

```sql
-- Count events by type in a single pass
SELECT
    toDate(event_time) AS event_date,
    countIf(event_type = 'click')    AS clicks,
    countIf(event_type = 'view')     AS views,
    sumIf(revenue, event_type = 'purchase') AS revenue
FROM events
GROUP BY event_date
ORDER BY event_date DESC
LIMIT 30;
```

Note: `countIf(cond)` is equivalent to `count(if(cond, 1, NULL))` but is more concise.

## Nested if() for Multiple Conditions

You can nest `if()` calls, though `multiIf()` is cleaner for more than two branches.

```sql
-- Nested if for three tiers
SELECT
    order_id,
    amount,
    if(amount >= 500, 'premium',
       if(amount >= 100, 'standard', 'basic')) AS tier
FROM orders
LIMIT 10;
```

## Using if() for Safe Type Conversions

```sql
-- Only convert when the value matches expected format
SELECT
    raw_value,
    if(match(raw_value, '^[0-9]+$'), toInt32(raw_value), 0) AS safe_int
FROM raw_input
LIMIT 10;
```

## if() vs CASE WHEN

```sql
-- These two are equivalent
SELECT
    user_id,
    if(is_premium = 1, 'premium', 'free') AS plan_a,
    CASE WHEN is_premium = 1 THEN 'premium' ELSE 'free' END AS plan_b
FROM users
LIMIT 5;
```

For simple two-branch conditions, `if()` is more concise. For multiple branches, use `multiIf()` or `CASE WHEN`.

## Performance Tip: Avoid Heavy Computations in Both Branches

Because only one branch is evaluated, place expensive computations in the branch that executes less frequently.

```sql
-- Put the expensive computation in the less-frequent branch
SELECT
    event_id,
    if(event_type = 'error',
       cityHash64(error_stack_trace),  -- only computed for error events
       0) AS error_hash
FROM events
LIMIT 10;
```

## Summary

`if(cond, then, else)` is ClickHouse's ternary conditional with short-circuit evaluation. It is the most direct way to express simple two-branch logic. Use it for NULL handling, safe division, and conditional column selection. For three or more conditions, prefer `multiIf()` for readability. Combine with `isNull()` for NULL-safe patterns or use the dedicated `ifNull()` shorthand.
