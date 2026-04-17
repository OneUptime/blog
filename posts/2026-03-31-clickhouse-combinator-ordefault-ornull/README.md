# How to Use -OrDefault and -OrNull Combinators in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Aggregate Function, Combinator, NULL, Performance

Description: Learn how -OrDefault returns a type default (zero/empty) and -OrNull returns NULL when an aggregate has no input rows, preventing silent NaN results in sparse data.

---

When an aggregate function receives no input rows - because a filter excluded everything, or because a GROUP BY group is empty after filtering - ClickHouse returns a type-specific default value. For numeric functions this is often zero, but for functions like `avg()` with no inputs it produces `nan`. This silent `nan` can propagate through calculations in unexpected ways. The `-OrDefault` and `-OrNull` combinators give you explicit control over what happens in the empty-input case. `-OrDefault` returns a sensible zero or empty value of the output type. `-OrNull` returns `NULL`, allowing you to detect the missing data condition and handle it explicitly.

## Syntax

```text
aggFuncOrDefault(column)  -- returns zero/empty string/[] when no rows
aggFuncOrNull(column)     -- returns NULL when no rows
```

These combinators are most commonly paired with `-If` (as `-OrDefaultIf` and `-OrNullIf`) to handle cases where a conditional filter might exclude all rows.

## The Problem: NaN from Empty avg()

Without a combinator, `avg()` on zero rows returns `nan`, which silently corrupts downstream calculations.

```sql
SELECT avg(x)
FROM (SELECT 1 AS x WHERE 0 = 1);  -- empty result set
```

```text
nan
```

This is a well-known gotcha. A `nan` value passes through arithmetic, comparisons, and even `WHERE` clauses in ways that are hard to debug.

## Setting Up Sample Data

Create a sales table with regional data. Some combinations of region and month will have no rows.

```sql
CREATE TABLE regional_sales
(
    region      String,
    month       Date,
    product     String,
    amount      Float64,
    is_returned UInt8
)
ENGINE = MergeTree()
ORDER BY (region, month, product);

INSERT INTO regional_sales VALUES
    ('us-east', '2026-01-01', 'widget', 120.0, 0),
    ('us-east', '2026-01-01', 'gadget', 340.0, 0),
    ('us-east', '2026-02-01', 'widget', 95.0,  1),
    ('us-west', '2026-01-01', 'widget', 200.0, 0),
    ('us-west', '2026-02-01', 'gadget', 410.0, 0);

-- Note: us-west has no returns, eu-central has no data at all
```

## Using avgOrDefault() and avgOrNull()

```sql
SELECT
    region,
    -- avg() on zero matching rows returns nan
    avgIf(amount, is_returned = 1)          AS avg_returned_naive,
    -- avgOrDefaultIf returns 0.0 when no rows match
    avgOrDefaultIf(amount, is_returned = 1) AS avg_returned_default,
    -- avgOrNullIf returns NULL when no rows match
    avgOrNullIf(amount, is_returned = 1)    AS avg_returned_null
FROM regional_sales
GROUP BY region
ORDER BY region;
```

```text
region   avg_returned_naive  avg_returned_default  avg_returned_null
us-east  95                  95                    95
us-west  nan                 0                     NULL
```

`us-west` has no returned orders so `avgIf` returns `nan`. `avgOrDefaultIf` returns `0.0`. `avgOrNullIf` returns `NULL`, making it easy to detect in application code with `IS NULL`.

## sumOrDefault() vs sumOrNull()

```sql
SELECT
    region,
    sumIf(amount, is_returned = 1)          AS sum_returned_naive,
    sumOrDefaultIf(amount, is_returned = 1) AS sum_returned_default,
    sumOrNullIf(amount, is_returned = 1)    AS sum_returned_null
FROM regional_sales
GROUP BY region
ORDER BY region;
```

```text
region   sum_returned_naive  sum_returned_default  sum_returned_null
us-east  95                  95                    95
us-west  0                   0                     NULL
```

For `sum()`, the naive version already returns 0 for empty groups (because sum of nothing is 0). The difference shows up for `avg()`, `min()`, `max()`, and `first_value()` where the empty-group behavior is less obvious.

## The Key Difference: min() and max() on Empty Groups

`min()` and `max()` return 0 or an empty string by default for empty groups rather than `NULL`, which can be misleading. `-OrNull` makes the empty case explicit.

```sql
SELECT
    region,
    minIf(amount, is_returned = 1)          AS min_returned_naive,
    minOrDefaultIf(amount, is_returned = 1) AS min_returned_default,
    minOrNullIf(amount, is_returned = 1)    AS min_returned_null
FROM regional_sales
GROUP BY region
ORDER BY region;
```

```text
region   min_returned_naive  min_returned_default  min_returned_null
us-east  95                  95                    95
us-west  0                   0                     NULL
```

`us-west` has no returns. The naive `minIf` and `minOrDefault` both return 0, which could be confused with a legitimate minimum of 0. `minOrNull` returns `NULL`, unambiguously indicating no data was present.

## Practical Pattern: Using -OrNull with coalesce()

`-OrNull` pairs naturally with `coalesce()` to substitute a fallback value at the query layer while still being able to distinguish missing data from a real zero.

```sql
SELECT
    region,
    -- Treat missing data as 0, but track which regions had data
    coalesce(avgOrNullIf(amount, is_returned = 1), 0) AS avg_returned_or_zero,
    -- Check for NULL to flag regions with no returns
    isNull(avgOrNullIf(amount, is_returned = 1))      AS has_no_returns
FROM regional_sales
GROUP BY region
ORDER BY region;
```

```text
region   avg_returned_or_zero  has_no_returns
us-east  95                    0
us-west  0                     1
```

## Combining Combinators: -OrDefaultIf and -OrNullIf

You can chain `-If` with `-OrDefault` or `-OrNull`. The combined suffix is spelled `-OrDefaultIf` / `-OrNullIf` — `-If` filters the rows, then `-OrDefault`/`-OrNull` handles the case where the filter leaves zero rows.

```text
aggFuncOrDefaultIf(value, condition)
aggFuncOrNullIf(value, condition)
```

These are available as a single combined suffix, not as two separate calls. ClickHouse resolves the full suffix string to the right variant.

```sql
SELECT
    product,
    avgOrNullIf(amount, region = 'eu-central')  AS eu_avg_or_null
FROM regional_sales
GROUP BY product
ORDER BY product;
```

```text
product  eu_avg_or_null
gadget   NULL
widget   NULL
```

No rows exist for `eu-central`, so `NULL` is returned for every product group.

## When to Use -OrDefault vs -OrNull

Use `-OrDefault` when your downstream system does not handle `NULL` well and zero is an acceptable sentinel for "no data" - for example, writing to a non-nullable column or feeding a visualization tool. Use `-OrNull` when you need to distinguish "data was present and equaled zero" from "no data matched the filter". `NULL` is semantically cleaner for the empty-set case and works well with `IS NULL`, `coalesce()`, and `nullIf()`.

## Summary

The `-OrDefault` and `-OrNull` combinators give you explicit control over what aggregate functions return when they receive no input rows. `-OrDefault` returns a type-appropriate zero or empty value (0 for numerics, empty string for strings), while `-OrNull` returns `NULL`. They are most useful when combined with `-If` to guard against conditions that might match no rows. Use `-OrNull` when you need to detect missing data downstream, and use `-OrDefault` when a zero sentinel is acceptable and `NULL` would be inconvenient.
