# Validation Summary: How to Use exponentialMovingAverage() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (aggregate functions, `MergeTree`, `AggregatingMergeTree`, materialized views)
- SQL
- Time series analysis (Exponential Moving Average)

## Sources Consulted
- [ClickHouse exponentialMovingAverage docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/exponentialMovingAverage)
- [ClickHouse AggregateFunction / AggregatingMergeTree docs](https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction)

## Issues Found
The original post described the function's first parameter as "alpha" (a decay factor in `(0, 1]`) and gave the classical discrete EMA recurrence `EMA(t) = alpha * value(t) + (1 - alpha) * EMA(t-1)`. Per the official docs, the first parameter is actually `x` — the **half-life period** — of type `(U)Int*`, `Float*`, or `Decimal`, and the semantics are inverted: *larger* `x` means *more* smoothing, not less. The docs also clarify that the second argument is a `timeunit` (an integer time-interval index, typically produced with `intDiv`), not a raw Unix timestamp.

Changes made:
- Reframed the post around the half-life parameter `x` instead of "alpha". Updated the description, headings ("Half-Life Parameter", "Comparing Different Half-Life Values"), the parameter range, and the guidance on choosing values.
- Replaced the incorrect `EMA(t) = alpha * value(t) + (1 - alpha) * EMA(t-1)` formula with the per-observation weight formula `weight(Δt) = 0.5 ^ (Δt / x)`, which matches the half-life definition.
- Inverted the responsiveness/smoothing explanation (small `x` = fast response; large `x` = more smoothing).
- Replaced the sub-second `alpha` values (0.1, 0.2, 0.3, 0.7) in every query with meaningful half-life values appropriate to the timeunit: `5`, `10`, and `1` minutes for the sensor examples; `3` days for the daily revenue example.
- Changed the `timeunit` argument from raw `toUnixTimestamp(ts)` to `intDiv(toUInt32(ts), 60)` (minute-bucketed index), matching the official guidance and the minute-scale half-lives. For the daily revenue example, switched to `toUInt32(day)` (days since epoch) so the half-life `3` is in days.
- Updated the `AggregatingMergeTree` example so the `AggregateFunction(exponentialMovingAverage(5), Float64, UInt32)` type, the `exponentialMovingAverageState(5)(...)` call, and the `exponentialMovingAverageMerge(5)(...)` call all use consistent parameters and the correctly-typed timeunit argument.
- Renamed the section heading from "EMA with SimpleAggregateFunction in AggregatingMergeTree" to "EMA with AggregateFunction in AggregatingMergeTree" because the example (correctly) uses `AggregateFunction`, not `SimpleAggregateFunction` — `exponentialMovingAverage` cannot be stored in a `SimpleAggregateFunction` since it does not satisfy the "final state equals partial state" property.
- Updated the post description and summary to reflect the half-life framing.

## Review Notes
- The `Handling Irregular Timestamps` section is technically correct: because the function weights by actual time deltas (via the `timeunit` argument), irregular gaps are handled naturally. The edit only normalized the query to use `intDiv`.
- The function can in fact be called with raw Unix timestamps, but the official docs explicitly recommend using `intDiv`-style interval indices; the post now follows that recommendation throughout.
- `toUnixTimestamp(DateTime)` returns `UInt32`, so the `AggregateFunction(..., Float64, UInt32)` declaration remains correct with the new `intDiv(toUInt32(ts), 60)` argument (also `UInt32`).
