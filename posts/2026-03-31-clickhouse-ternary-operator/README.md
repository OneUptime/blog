# How to Use the Ternary Operator in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Ternary Operator, IF Function, Conditional, SQL

Description: Learn how to use ClickHouse's ternary-style conditional expressions with the if() function, multiIf(), and the CASE statement for inline branching logic.

---

## The if() Function as a Ternary Operator

ClickHouse does not have a C-style `?:` ternary operator, but the `if(condition, then, else)` function serves the same purpose. It evaluates the condition and returns the second argument if true, or the third if false.

```sql
SELECT
  user_id,
  if(is_premium, 'Premium', 'Free') AS plan_label,
  if(score >= 80, 'High', 'Low') AS score_tier
FROM users
```

## Short-Circuit Behavior

By default, `if()` in ClickHouse does not short-circuit — both branches are evaluated regardless of the condition. You can enable short-circuit evaluation with the `short_circuit_function_evaluation` setting. When short-circuiting is disabled, guard expressions that could produce incorrect results in either branch.

```sql
-- Safe division using if to avoid division by zero
SELECT
  if(total_views = 0, 0, total_clicks / total_views) AS ctr
FROM campaign_stats
```

## Nested if() Calls

You can nest `if()` calls for multi-branch logic, though `multiIf` is cleaner for more than two branches.

```sql
SELECT
  user_id,
  if(score >= 90, 'A',
    if(score >= 80, 'B',
      if(score >= 70, 'C', 'F'))) AS grade
FROM test_results
```

## multiIf() for Multi-Branch Conditions

`multiIf(cond1, result1, cond2, result2, ..., else_result)` is the idiomatic way to express multi-case conditionals in ClickHouse.

```sql
SELECT
  order_id,
  multiIf(
    status = 0, 'Pending',
    status = 1, 'Processing',
    status = 2, 'Shipped',
    status = 3, 'Delivered',
    'Unknown'
  ) AS status_label
FROM orders
```

## CASE Expression

Standard SQL `CASE WHEN ... THEN ... ELSE ... END` is also supported and compiles to the same internal representation as `multiIf`.

```sql
SELECT
  product_id,
  CASE
    WHEN category = 'Electronics' THEN price * 0.9
    WHEN category = 'Books' THEN price * 0.95
    ELSE price
  END AS discounted_price
FROM products
```

## Using if() in Aggregations

The `if()` function inside aggregate functions is functionally equivalent to `countIf`, `sumIf`, and `avgIf`, but the `-If` combinators are the idiomatic approach and are generally preferred.

```sql
-- Using combinators (preferred)
SELECT
  sumIf(revenue, event_type = 'purchase') AS purchase_revenue,
  countIf(is_new_user) AS new_users
FROM events
```

```sql
-- Using if() inside aggregates (equivalent but less idiomatic)
SELECT
  sum(if(event_type = 'purchase', revenue, 0)) AS purchase_revenue,
  count(if(is_new_user, 1, NULL)) AS new_users
FROM events
```

## Summary

ClickHouse's `if(condition, then, else)` function is the ternary operator equivalent. Use `multiIf` for multi-branch logic instead of deeply nested `if()` calls. Prefer aggregate combinators like `countIf` and `sumIf` over wrapping `if()` inside aggregates. Remember that `if()` evaluates both branches by default (unless `short_circuit_function_evaluation` is enabled), so guard error-prone expressions explicitly.
