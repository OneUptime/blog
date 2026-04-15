# Validation Summary: How to Use quantileApprox() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse aggregate quantile functions (`quantile`, `quantileExact`, `quantileGK`, `quantileTDigest`, `quantileBFloat16`, `quantileDD`)
- ClickHouse AggregatingMergeTree engine
- ClickHouse materialized views with `-State` / `-Merge` combinators

## Sources Consulted
- [quantile | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile)
- [quantiles Functions | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantiles)
- [quantileGK | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantileGK)
- [quantileExact Functions | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantileexact)
- [quantileTDigest | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantiletdigest)
- [quantileDD | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantileddsketch)
- [quantileBFloat16 | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantilebfloat16)
- [quantileDeterministic | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantiledeterministic)

## Issues Found

### 1. `quantileApprox` does not exist in ClickHouse (Critical)
**What was wrong:** The entire post was written about a function called `quantileApprox()` which does not exist in ClickHouse. There is no such function in the ClickHouse documentation or source code. The correct function for approximate quantiles using reservoir sampling is simply `quantile()`.

**What was changed:** Replaced all occurrences of `quantileApprox` with `quantile` throughout the post, including the title, description, all SQL examples, the mermaid flowchart, and the summary.

### 2. Fabricated `accuracy` parameter (Critical)
**What was wrong:** The post described a configurable `accuracy` parameter that controls the reservoir sample size (e.g., `quantileApprox(10000, 0.95)(value)`). This parameter does not exist. The `quantile()` function uses a fixed reservoir size of up to 8192, which is not user-configurable.

**What was changed:** Removed all uses of the accuracy parameter from SQL examples. Rewrote the "Accuracy Parameter" section into a "Reservoir Sampling Details" section that correctly explains the fixed reservoir size and points readers to `quantileGK` and `quantileDD` as alternatives when configurable accuracy is needed.

### 3. Incorrect syntax in intro (`quantileApprox(accuracy)(level)(value)` — triple parentheses)
**What was wrong:** The introductory paragraph used triple parenthesized syntax `quantileApprox(accuracy)(level)(value)` which is not valid for any ClickHouse function.

**What was changed:** Replaced with correct syntax `quantile(level)(expr)`.

### 4. Wrong `-State` / `-Merge` combinator names
**What was wrong:** The materialized view section used `quantileApproxState` and `quantileApproxMerge`, which don't exist since the base function `quantileApprox` doesn't exist.

**What was changed:** Replaced with the correct combinator forms `quantileState` and `quantileMerge`, and updated `AggregateFunction` column type declarations accordingly.

### 5. Missing non-determinism caveat
**What was wrong:** The original post did not mention that `quantile()` returns non-deterministic results (because reservoir sampling uses a random number generator).

**What was changed:** Added a note about non-deterministic results in the intro paragraph and summary.

## Review Notes
- The post's overall structure, use cases, and conceptual explanations (reservoir sampling, comparison between quantile algorithms, -State/-Merge pattern) are sound. The primary issue was that the function name and its configurable accuracy parameter were entirely fabricated.
- For readers who specifically need configurable accuracy, `quantileGK(accuracy, level)(expr)` (Greenwald-Khanna with strict error bounds) or `quantileDD(relative_accuracy, level)(expr)` (DDSketch algorithm) would be more appropriate. These are mentioned in the corrected "Reservoir Sampling Details" section.
- The `quantiles(level1, level2, ...)(expr)` function could be a more efficient alternative for the "Multiple Quantiles in One Query" section, as it computes multiple quantile levels in a single pass. This was not added to avoid scope creep.
