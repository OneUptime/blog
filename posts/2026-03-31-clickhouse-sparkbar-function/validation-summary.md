# Validation Summary: How to Use sparkBar() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- `sparkBar()` / `sparkbar()` aggregate function
- Unicode block character visualization
- MergeTree engine

## Sources Consulted
- ClickHouse official documentation for sparkbar: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/sparkbar
- ClickHouse source code (AggregateFunctionSparkbar.h) for exact parameter semantics, character set, and scaling logic
- ClickHouse GitHub PR #58335 for sparkBar alias registration

## Issues Found

1. **Syntax and parameter names were incorrect.** The blog used `sparkBar(width, min, max)(value, height)` but the official syntax is `sparkBar(buckets[, min_x, max_x])(x, y)`. Updated parameter names and noted that `min_x`/`max_x` are optional and that `buckets` must be between 2 and 1024.

2. **`min`/`max` parameters were misunderstood as y-axis range controls.** The blog described them as controlling the value (y-axis) range. In reality, `min_x`/`max_x` control the x-axis range — they define which x-position values to include. This caused every time-series query in the post to use values like `0, 500` (a duration range) instead of `0, 23` (the hour range). Fixed all six affected queries.

3. **"Clamped" behavior was incorrect.** The blog stated values outside the range are "clamped." In fact, values outside `[min_x, max_x]` are silently **ignored** (dropped from the computation entirely). Fixed the explanation.

4. **Basic example output contained an invalid character.** The output `▁▂▃▄▅▆▇█▉█` included `▉` (U+2589 LEFT SEVEN EIGHTHS BLOCK), which is not in sparkbar's character set. The function only emits space plus U+2581 through U+2588 (8 block characters). Corrected the output to `▁▂▃▃▄▅▅▆▇█` based on the scaling formula.

5. **"Controlling Width and Range" section examples were nonsensical.** The original examples used `sparkBar(20, 100, 200)` with `toHour(ts)` as x — since no hour value falls in the 100–200 range, the query would produce entirely empty output. Rewrote the examples to demonstrate meaningful use: zooming into business hours (8–20) and condensing the full day into 5 buckets.

## Review Notes
- `sparkBar` (camelCase) is an alias for `sparkbar` (all lowercase). Both work, but the canonical name in official docs is `sparkbar`. The blog's use of `sparkBar` is acceptable since it is a registered alias.
- The function was introduced in ClickHouse v21.11; the `sparkBar` alias was added later (~v24.1). The post does not mention version requirements.
- The comparison example uses `status = 200` as the y-value. Since all inserted rows have status=200, this always evaluates to 1, producing a flat sparkline. Technically valid but not a very illustrative example. Left as-is since it demonstrates the concept.
