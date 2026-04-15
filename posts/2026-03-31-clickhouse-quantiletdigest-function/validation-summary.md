# Validation Summary: How to Use quantileTDigest() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL database)
- `quantileTDigest()` aggregate function
- `quantilesTDigest()` (multi-quantile variant)
- `quantileTDigestWeighted()` (weighted variant)
- `quantileTDigestState()` / `quantileTDigestMerge()` (state combinators)
- AggregatingMergeTree engine
- Materialized views with aggregate states
- T-digest algorithm

## Sources Consulted
- ClickHouse official documentation: quantileTDigest — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletdigest
- ClickHouse official documentation: quantile — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse official documentation: quantileTDigestWeighted — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletdigestweighted
- ClickHouse official documentation: Aggregate function combinators (-State, -Merge) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators

## Issues Found

### 1. Incorrect memory consumption claim (line 61)
- **What was wrong:** The post stated "The internal state size for `quantileTDigest()` is bounded by its compression parameter (default 100 centroids), not by the number of rows processed." This makes two incorrect claims: (a) the ClickHouse documentation does not document a "compression parameter" with "default 100 centroids" for `quantileTDigest()` — that detail comes from the generic t-digest algorithm paper, not from ClickHouse's implementation docs; (b) the official docs state memory consumption is `log(n)` where `n` is the number of values, meaning it does scale with dataset size (logarithmically), not that it is independent of row count.
- **What was changed:** Replaced the sentence with: "The internal state size for `quantileTDigest()` grows as `log(n)` where `n` is the number of values processed, making it far more memory-efficient than storing all values."
- **Why:** The fix aligns the claim with the official ClickHouse documentation while preserving the post's point that the function is memory-efficient for large datasets.

## Review Notes
- The description of the level parameter as "between 0 and 1 (exclusive or inclusive)" is technically not wrong but is confusingly worded. The official docs simply state "from 0 to 1" and recommend the range [0.01, 0.99]. This is a clarity issue rather than a technical error.
- Claims about t-digest's higher accuracy at distribution tails (p99, p999) are properties of the t-digest algorithm itself (from Ted Dunning's paper) and are well-established, though ClickHouse's own documentation does not explicitly state this. The claims are technically sound.
- The claim that `quantile()` uses reservoir sampling is verified by the official docs: "This function applies reservoir sampling with a reservoir size up to 8192."
- The State/Merge combinator pattern shown in the materialized view example follows standard ClickHouse patterns and is correct.
- All SQL syntax in the code examples is correct for ClickHouse.
