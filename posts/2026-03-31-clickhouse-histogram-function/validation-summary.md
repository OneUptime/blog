# Validation Summary: How to Use histogram() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- `histogram()` parametric aggregate function
- `sparkBar()` aggregate function
- `ARRAY JOIN` clause
- `arrayMap`, `arrayElement`, tuple element access

## Sources Consulted
- ClickHouse parametric aggregate functions docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions
- ClickHouse sparkbar aggregate function docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/sparkbar
- ClickHouse ARRAY JOIN docs: https://clickhouse.com/docs/sql-reference/statements/select/array-join
- ClickHouse arrayJoin function docs: https://clickhouse.com/docs/sql-reference/functions/array-join

## Issues Found

1. **Invalid ARRAY JOIN tuple destructuring syntax.** The original post used `ARRAY JOIN h AS (lower, upper, height)` to destructure the tuple into three named columns. ClickHouse does not support parenthesized tuple destructuring in `ARRAY JOIN`; you must alias the tuple once and access its elements by positional `.1`, `.2`, `.3` notation. Rewrote the example to `ARRAY JOIN h AS bucket` and changed the `SELECT` list to `round(bucket.1, 2)`, `round(bucket.2, 2)`, `round(bucket.3)`.

2. **Broken `sparkBar` example.** The original used a top-level `WITH` clause that referenced `amount` — a column that is only in scope inside the `orders` subquery, not at the outer query level. The `sparkBar` call also passed the bucket height as both `x` and `y`, which is incorrect (`x` is the x-axis value, `y` is the frequency). Replaced with a simpler, correct query: a scalar subquery `WITH (SELECT histogram(20)(amount) FROM orders) AS h` combined with `numbers(20)` and `sparkBar(20)(number + 1, toUInt64(round(h[number + 1].3)))`, which plots bucket index vs. bucket height as intended.

3. **Inaccurate comparison to `bar()`.** The post claimed the adaptive widths of `histogram()` differed from `bar()`'s "fixed-width bins." `bar()` in ClickHouse is a single-value bar rendering function, not a binning function — it does not produce fixed-width histogram bins. Replaced the comparison with a reference to manual fixed-width bucketing using `floor((x - min_x) / bucket_width)` with `GROUP BY`, which is the actual contrast.

## Review Notes

- The example output for `histogram(5)(number) FROM numbers(100)` shows integer heights (`20` per bucket). For a perfectly uniform input the streaming algorithm often does produce integer heights, though in general — and for larger or skewed inputs — the heights are approximate `Float64` values (as the post correctly notes later in the "Interpreting the Output" section).
- The signature of `sparkBar` is `sparkbar(buckets[, min_x, max_x])(x, y)` (lowercase is canonical; `sparkBar` is a documented case alias).
- The "Filtering and Comparing Groups" example relies on `t.3` tuple access inside an `arrayMap` lambda, which is valid ClickHouse and produces the bucket-counts array per day as described.
