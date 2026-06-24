# How to Use Lambda Expressions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Lambda, Higher-Order Function, Array, SQL

Description: Learn how to write lambda expressions in ClickHouse to use with higher-order array functions like arrayMap, arrayFilter, and arrayReduce.

---

## What Are Lambda Expressions in ClickHouse

ClickHouse supports lambda expressions (anonymous functions) that are passed to higher-order functions operating on arrays. The syntax is `x -> expression` or `(x, y) -> expression` for multi-argument lambdas.

```sql
SELECT arrayMap(x -> x * 2, [1, 2, 3, 4, 5]) AS doubled
-- Result: [2, 4, 6, 8, 10]
```

## arrayMap - Transform Every Element

`arrayMap(lambda, array)` applies the function to each element and returns a new array of the same size.

```sql
SELECT
  arrayMap(x -> x * x, [1, 2, 3, 4]) AS squares,
  arrayMap(x -> toString(x), [10, 20, 30]) AS as_strings,
  arrayMap(x -> if(x > 0, 'pos', 'neg'), [-1, 2, -3, 4]) AS signs
```

## arrayFilter - Keep Elements Matching a Condition

`arrayFilter(lambda, array)` returns only the elements for which the lambda returns a non-zero value.

```sql
SELECT
  arrayFilter(x -> x > 3, [1, 2, 3, 4, 5]) AS above_three,
  arrayFilter(x -> x % 2 = 0, [1, 2, 3, 4, 5, 6]) AS evens
-- [4, 5] and [2, 4, 6]
```

## arrayCount - Count Matching Elements

```sql
SELECT
  arrayCount(x -> x > 0, scores) AS positive_scores,
  arrayCount(x -> x IS NOT NULL, nullable_vals) AS non_null_count
FROM user_data
```

## arrayFirst and arrayFirstIndex

```sql
SELECT
  arrayFirst(x -> x > 100, [50, 75, 150, 200]) AS first_over_100,
  arrayFirstIndex(x -> x > 100, [50, 75, 150, 200]) AS index_of_first
-- 150 and 3
```

## Two-Argument Lambdas with arrayFold (Reduce)

`arrayFold(lambda, array, initial)` accumulates a result over the array. The lambda takes two arguments: the accumulator and the current element.

```sql
SELECT arrayFold(
  (acc, x) -> acc + x,
  [1, 2, 3, 4, 5],
  toInt64(0)
) AS sum_result
-- 15
```

## Practical Example - Computing Tag Frequency

```sql
SELECT
  post_id,
  arrayMap(t -> lower(trimBoth(t)), tags) AS normalized_tags,
  arrayFilter(t -> length(t) > 2, arrayMap(t -> lower(t), tags)) AS long_tags
FROM blog_posts
```

## Using Lambdas with Array Columns from Real Tables

```sql
SELECT
  user_id,
  arraySum(arrayMap(x -> x.2, purchase_items)) AS total_amount,
  arrayFilter(x -> x.1 = 'Electronics', purchase_items) AS electronics_items
FROM purchase_events
```

## Summary

ClickHouse lambda expressions use `x -> expr` syntax and work with higher-order array functions including `arrayMap`, `arrayFilter`, `arrayCount`, `arrayFirst`, and `arrayFold`. Lambdas can reference table columns directly inside the expression in addition to the formal parameters. They are a powerful tool for transforming and filtering array-typed data without joins.
