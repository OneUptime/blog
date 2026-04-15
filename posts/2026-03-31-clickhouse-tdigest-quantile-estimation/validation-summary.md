# Validation Summary: How to Use t-digest for Quantile Estimation in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (aggregate functions, materialized views, AggregatingMergeTree engine)
- t-digest algorithm (probabilistic quantile estimation)
- SQL

## Sources Consulted
- ClickHouse official documentation for `quantileTDigest`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletdigest
- ClickHouse official documentation for `quantileTDigestWeighted`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletdigestweighted
- ClickHouse official documentation for `quantileDD`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileddsketch
- ClickHouse source code (`QuantileTDigest.h`) for internal compression parameters
- ClickHouse documentation on aggregate function combinators (`-State`, `-Merge`)

## Issues Found

### 1. Incorrect compression parameter syntax (Critical)
- **What was wrong:** The "Configuring Compression" section contained the syntax `quantileTDigest(100)(0.99)(response_time_ms)`, implying that a compression parameter can be passed as the first argument. This three-parentheses syntax is invalid SQL and would produce an error. ClickHouse's `quantileTDigest` does not accept a compression parameter — its signature is `quantileTDigest(level)(expr)` only.
- **What was changed:** Rewrote the section to explain that `quantileTDigest` uses fixed internal parameters and does not expose a compression tuning knob in SQL. Added `quantileDD` as the correct alternative for users who need configurable accuracy, with the correct two-argument syntax `quantileDD(relative_accuracy, level)(expr)`.
- **Why:** The original code example would fail at query time, and the claim about a configurable "default compression of 100" was inaccurate (the internal defaults are epsilon=0.01, max_centroids=2048).

### 2. Misleading accuracy characteristics claim
- **What was wrong:** The "Accuracy Characteristics" section stated "relative error for quantiles near 0 or 1 is proportional to `1/compression`" and referenced a configurable compression parameter of 100 yielding 1% error.
- **What was changed:** Reworded to accurately describe that ClickHouse's implementation uses a fixed internal error bound of approximately 1%, without referencing a user-configurable compression parameter.
- **Why:** Since compression is not configurable in `quantileTDigest`, referencing it as a tunable parameter was misleading.

## Review Notes
- All other SQL syntax (`quantileTDigest`, `quantilesTDigest`, `quantileTDigestWeighted`, `quantileTDigestState`, `quantileTDigestMerge`) is correct.
- The materialized view pattern using `AggregatingMergeTree` with `-State`/`-Merge` combinators is correct and idiomatic.
- The claim that `quantile` uses reservoir sampling is accurate for ClickHouse's default `quantile` function.
- The post correctly notes that t-digest provides better accuracy at the tails than in the middle of the distribution.
