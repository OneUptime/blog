# Validation Summary: How to Use sparkBar() Function in ClickHouse for Inline Charts

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- ClickHouse SQL aggregate functions (`sparkbar`)
- Unicode block-element visualization

## Sources Consulted
- ClickHouse official docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/sparkbar
- ClickHouse SQL reference — window functions, `intDiv`, `toStartOfMinute`, `countIf`, `uniq`, `if`

## Issues Found
The post described an incorrect signature and misrepresented the function's behavior. Fixes applied:

1. **Wrong signature.** The post documented the inner call as `sparkBar(width, min, max)(value)` — a single argument. The real signature is `sparkbar(buckets[, min_x, max_x])(x, y)` with **two** inner arguments (`x` = bucket key, `y` = value). Corrected the "Basic Syntax" section and all example queries.
2. **Wrong output model.** The post showed per-row bars in a table (one bar per `GROUP BY` row derived from a single scalar). `sparkbar` is an aggregate that returns **one** `String` per group, assembled from many (x, y) pairs. Replaced the tabular example output with a single-string rendering.
3. **Invalid `max(...) OVER ()` inside `sparkbar` parameters.** `min_x` / `max_x` must be constant expressions, not window-function results, and `sparkbar` auto-scales the bar heights on its own — the "trick" described in the post does not work. Removed the `OVER ()` expressions and the corresponding note.
4. **Histogram example restructured.** Rewrote it as a subquery that pre-aggregates counts per bucket, then passes `(bucket, cnt)` into `sparkbar`, matching the official usage pattern.
5. **DAU example restructured.** Moved the `uniq(user_id)` aggregation into a subquery so `sparkbar` sees one `(event_date, dau)` pair per row, and supplied concrete `min_x`/`max_x` date bounds.
6. **Per-endpoint example corrected.** Switched from a scalar `count()` bar to a true sparkline — `sparkbar(60)(toStartOfMinute(event_time), 1)` — producing a 60-segment request pattern per endpoint.
7. **Error-rate example corrected.** Wrapped `toHour`/`countIf` in a subquery and passed `(hour, error_pct)` into `sparkbar` with `min_x=0, max_x=23`.
8. **Multi-column example corrected.** Replaced per-row scalar inputs with time-bucketed `(toStartOfMinute(event_time), y)` pairs, using `if(status >= 500, 1, 0)` to get an error sparkline alongside the request sparkline.
9. **Fixed-range example corrected.** Changed the final example to pass a proper `(x, y)` pair with date-valued `min_x`/`max_x`, and dropped the stray `GROUP BY day` on a non-existent column.

## Review Notes
- The canonical function name in ClickHouse docs is `sparkbar` (lowercase); `sparkBar` is an accepted alias, so the post's title and prose continue to use `sparkBar()` without issue.
- `sparkbar` was introduced in ClickHouse 21.11; callers on older versions will not have it.
- The `(x, y)` argument types in the docs are listed as `const String` in the parameter table, but in practice ClickHouse accepts numeric and date types for `x` (matching `min_x` / `max_x`) and numeric types for `y`, as shown by the official example.
- Negative `y` values are silently ignored, and repeated `x` values within the same bucket are summed; worth keeping in mind when constructing inputs.
