# How to Use mapApply() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Map Function, Lambda, Data Transformation

Description: Learn how mapApply() transforms every key-value pair in a Map using a lambda function in ClickHouse, with examples for value normalization and map-level operations.

---

`mapApply()` is a higher-order Map function in ClickHouse that applies a lambda to every key-value pair in a Map and returns a new Map with the transformed results. It is the map-equivalent of `arrayMap()` - instead of iterating over array elements, it iterates over map entries. This is particularly powerful for transforming keys and values in a map, computing derived values from both the key and the value, or normalizing map contents without expanding the data into rows.

## Function Signature

```text
mapApply(func, map)
```

The `func` argument is a lambda of the form `(k, v) -> (new_key, new_value)`. The lambda receives each key and value, and must return a 2-element tuple. The first element of the tuple becomes the key in the output map, and the second element becomes the value. This means `mapApply()` can transform both keys and values, though in practice the most common pattern is to pass the key through unchanged and only transform the value.

## Basic Usage

Apply a simple lambda to double every value in a map.

```sql
SELECT mapApply((k, v) -> (k, v * 2), map('a', 10, 'b', 20, 'c', 30)) AS doubled;
```

The result is `{'a': 20, 'b': 40, 'c': 60}`.

Transform string values to uppercase.

```sql
SELECT mapApply((k, v) -> (k, upper(v)), map('status', 'active', 'tier', 'premium')) AS uppercased;
```

## Setting Up a Sample Table

Create a table of user performance metrics stored as floating-point maps. Each row records raw scores for multiple dimensions.

```sql
CREATE TABLE user_performance
(
    user_id    UInt64,
    period     String,
    raw_scores Map(String, Float64)
)
ENGINE = MergeTree
ORDER BY (user_id, period);

INSERT INTO user_performance VALUES
(1001, '2024-Q1', map('accuracy', 0.87, 'throughput', 142.5, 'quality', 0.91)),
(1002, '2024-Q1', map('accuracy', 0.73, 'throughput', 98.0,  'quality', 0.80)),
(1003, '2024-Q1', map('accuracy', 0.95, 'throughput', 210.0, 'quality', 0.88)),
(1004, '2024-Q1', map('accuracy', 0.60, 'throughput', 75.5,  'quality', 0.72));
```

## Rounding All Values in a Map

Use `mapApply()` to round every value in the scores map to two decimal places, producing a clean display-ready version.

```sql
SELECT
    user_id,
    mapApply((k, v) -> (k, round(v, 2)), raw_scores) AS rounded_scores
FROM user_performance;
```

## Normalizing Values by a Maximum

Apply a normalization lambda that divides each value by a fixed maximum to convert raw scores to a 0-1 range. When the denominator depends only on the value, express it inline in the lambda.

```sql
SELECT
    user_id,
    mapApply((k, v) ->
        (k, CASE
            WHEN k = 'throughput' THEN v / 250.0
            ELSE v
        END),
        raw_scores
    ) AS normalized_scores
FROM user_performance;
```

## Applying Percentage Conversion

Convert all fractional values to percentage representations by multiplying by 100 and rounding.

```sql
SELECT
    user_id,
    mapApply((k, v) -> (k, round(v * 100, 1)), raw_scores) AS pct_scores
FROM user_performance
WHERE period = '2024-Q1';
```

## Key-Dependent Transformations

The lambda receives the key as its first argument, allowing you to apply different transformations based on the key name.

```sql
SELECT
    user_id,
    mapApply(
        (k, v) ->
            (k, CASE k
                WHEN 'throughput' THEN round(v / 60.0, 2)   -- convert to per-minute rate
                ELSE round(v, 3)
            END),
        raw_scores
    ) AS transformed_scores
FROM user_performance;
```

## Capping Values at a Maximum

Use `mapApply()` with `least()` to cap all map values at a defined ceiling, useful for sanitizing user-input data or enforcing SLO bounds.

```sql
SELECT
    user_id,
    mapApply((k, v) -> (k, least(v, 1.0)), raw_scores) AS capped_scores
FROM user_performance;
```

## Combining mapApply with mapFilter

Chain `mapApply()` and `mapFilter()` together: first transform values, then retain only those above a threshold.

```sql
SELECT
    user_id,
    mapFilter(
        (k, v) -> v >= 80.0,
        mapApply((k, v) -> (k, round(v * 100, 1)), raw_scores)
    ) AS high_pct_scores
FROM user_performance;
```

This converts all scores to percentages and then keeps only the dimensions where the user scored 80% or above.

## Summary

`mapApply()` enables row-level transformation of every entry in a Map without expanding the data into individual rows. Use it to normalize values, apply format conversions, perform key-dependent transformations, or cap values at boundaries. Because it preserves the Map structure, the result can be stored back into a Map column or passed to other map functions like `mapFilter()`, `mapKeys()`, or `mapValues()` as part of a transformation pipeline. The lambda always receives `(key, value)` in that order and must return a 2-element tuple `(new_key, new_value)`. This means `mapApply()` can transform both keys and values, though the most common pattern is to pass the key through unchanged.
