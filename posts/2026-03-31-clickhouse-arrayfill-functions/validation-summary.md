# Validation Summary: How to Use arrayFill() and arrayReverseFill() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- `arrayFill` higher-order array function
- `arrayReverseFill` higher-order array function
- Lambda expressions in ClickHouse
- Nullable array types

## Sources Consulted
- ClickHouse official docs — Array Functions (`arrayFill`, `arrayReverseFill`): https://clickhouse.com/docs/sql-reference/functions/array-functions#arrayfill
- ClickHouse official docs — Higher-order functions (lambda syntax): https://clickhouse.com/docs/sql-reference/functions/higher-order-functions
- Manual trace-through of each example against documented semantics: "replaces arr1[i] by arr1[i - 1]" (arrayFill) / "by arr1[i + 1]" (arrayReverseFill) when lambda returns 0; first/last element is not replaced.

## Issues Found
- **"Combining Forward-Fill and Backward-Fill" section — incorrect expected output for given code.** The original code nested `arrayReverseFill` inside `arrayFill`, which means backward-fill is applied first. Tracing sensor 2 `[0.0, 0.0, 15.5, 16.0, 0.0, 0.0, 14.8, 15.1]` through that order produces `[15.5, 15.5, 15.5, 16.0, 14.8, 14.8, 14.8, 15.1]`, not the claimed `[15.5, 15.5, 15.5, 16.0, 16.0, 16.0, 14.8, 15.1]`. The claimed output actually corresponds to forward-fill first, then backward-fill. Fix: swapped the nesting so `arrayFill` is inside `arrayReverseFill`, and updated the prose and the Summary paragraph to describe the forward-first-then-backward ordering so the shown result matches.
- No other issues were found. The remaining examples (basic forward/backward fill on integers and NULLs, sensor forward/backward fill results, the two-argument lambda with parallel arrays, the empty-string status timeline) all match what the documented semantics produce.

## Review Notes
- The "Important" note about the lambda returning 1 to keep and 0 to fill is accurate and worth calling out — it matches the ClickHouse docs and is a common source of confusion.
- The comment "leading zeros with no prior value stay as 0.0" is consistent with the documented rule that the first element of `arr1` is never replaced (regardless of what the lambda returns for it).
- The parallel-array example relies on the fact that higher-order array functions accept arrays with matching lengths and pass corresponding elements to the lambda; this is correct.
- The Nullable example assumes that `IS NOT NULL` inside the lambda returns a 0/1 integer that `arrayFill` can use as the keep/fill signal. This works in practice on current ClickHouse (`IS NOT NULL` yields `UInt8`), and the output `[1, 1, 1, 4, 4, 6]` is correct.
