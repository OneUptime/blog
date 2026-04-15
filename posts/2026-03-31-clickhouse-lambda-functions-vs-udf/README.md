# How to Use Lambda Functions Instead of UDFs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Lambda Function, UDF, arrayMap, Higher-Order Function

Description: Learn when to use inline lambda functions instead of UDFs in ClickHouse for array transformations, filtering, and inline expression reuse.

---

ClickHouse supports higher-order functions that accept inline lambda expressions. Before reaching for a UDF, consider whether a lambda passed to `arrayMap`, `arrayFilter`, or `arrayFold` covers your use case - lambdas have no definition overhead and work directly on array columns.

## What Are Lambda Functions in ClickHouse

Lambdas are anonymous functions defined inline using the arrow syntax `x -> expression`. They are used exclusively as arguments to higher-order functions.

```sql
SELECT arrayMap(x -> x * 2, [1, 2, 3, 4]) AS doubled;
-- [2, 4, 6, 8]
```

## arrayMap - Transform Array Elements

```sql
SELECT
    order_id,
    arrayMap(p -> round(p * 1.1, 2), prices) AS prices_with_tax
FROM orders
LIMIT 5;
```

## arrayFilter - Filter Array Elements

```sql
SELECT
    user_id,
    arrayFilter(t -> t > 60, response_times) AS slow_responses
FROM sessions
WHERE length(arrayFilter(t -> t > 60, response_times)) > 0
LIMIT 10;
```

## arrayFold - Custom Accumulation

Use `arrayFold` (ClickHouse 23.10+) for custom reduction with a lambda:

```sql
SELECT arrayFold((acc, x) -> acc + x * x, [1, 2, 3, 4], toInt64(0)) AS sum_of_squares;
-- 30
```

## Multi-Argument Lambda

Higher-order functions like `arrayMap` support capturing outer variables:

```sql
WITH 1.08 AS tax_rate
SELECT arrayMap(p -> p * tax_rate, prices) AS prices_with_tax
FROM products
LIMIT 5;
```

## When to Use Lambda vs UDF

| Use Case | Lambda | SQL UDF |
|----------|--------|---------|
| Array element transform | Yes | Not directly |
| Array filtering | Yes | No |
| Scalar expression reuse across queries | No | Yes |
| Complex multi-step logic | Limited | Yes |
| Recursive or stateful logic | No | Executable UDF |

## Replacing a Repeated Expression with a SQL UDF

If you find yourself writing the same lambda expression repeatedly:

```sql
-- Repeated pattern
SELECT arrayMap(x -> if(x < 0, 0, x), values) FROM t1;
SELECT arrayMap(x -> if(x < 0, 0, x), values) FROM t2;
```

Extract to a SQL UDF for reuse in scalar context:

```sql
CREATE FUNCTION clampPositive AS (x) -> if(x < 0, 0, x);
```

But note: SQL UDFs cannot be passed as lambda arguments to `arrayMap`. You still need the lambda syntax for array higher-order functions.

## Combining Lambdas and UDFs

```sql
CREATE FUNCTION scoreItem AS (price, discount) ->
    price * (1 - discount);

SELECT
    order_id,
    -- Use UDF in scalar context
    scoreItem(unit_price, discount_rate) AS item_score,
    -- Use lambda in array context
    arrayMap(p -> p * 0.9, price_history) AS discounted_history
FROM orders
LIMIT 10;
```

## Performance

- Lambdas inside `arrayMap` or `arrayFilter` are inlined by the query compiler - no function call overhead
- SQL UDFs have the same performance as inline expressions
- Executable UDFs have subprocess communication overhead

## Summary

Lambda functions in ClickHouse are ideal for array operations and are more concise than defining a UDF for one-off transformations. Use SQL UDFs when you need to reuse the same scalar expression across multiple queries. Use executable UDFs when you need external logic that cannot be expressed in ClickHouse SQL.
