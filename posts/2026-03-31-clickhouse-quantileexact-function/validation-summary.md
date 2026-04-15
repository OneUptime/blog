# Validation Summary: How to Use quantileExact() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (aggregate functions)
- SQL
- `quantileExact()`, `quantilesExact()`, `quantileExactWeighted()`, `quantileExactLow()`, `quantileExactHigh()`
- `quantile()` and `quantileTDigest()` (mentioned for comparison)

## Sources Consulted
- ClickHouse official documentation for `quantileExact`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexact
- ClickHouse official documentation for `quantile`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse official documentation for `quantileExactWeighted`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexactweighted
- ClickHouse official documentation for `quantileExactLow`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexactlow
- ClickHouse official documentation for `quantileExactHigh`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexacthigh
- ClickHouse GitHub source (aggregate function reference docs)

## Issues Found
- **Inaccurate description of `quantileExact()` sorting behavior**: The post stated in three places that `quantileExact()` works "by sorting all values." According to official ClickHouse documentation, `quantileExact()` combines all values into an array and then **partially sorts** it (using a selection algorithm like nth_element, which is O(n) average rather than O(n log n) for a full sort). This is a meaningful algorithmic distinction. Fixed all three occurrences:
  - Intro paragraph: changed "by sorting all values" to "by loading all values into memory and partially sorting them"
  - "Exact vs Approximate" section: changed "loads all values and sorts them" to "loads all values and partially sorts them"
  - Summary section: changed "by sorting all input data" to "by loading all input data into memory and partially sorting it"

## Review Notes
- All SQL syntax is correct: `quantileExact(level)(expr)` with the double-parenthesis calling convention is the proper ClickHouse syntax.
- The claim that `quantile()` uses reservoir sampling is correct per official docs (reservoir size up to 8192).
- `quantilesExact()` (plural) correctly returns an array, as documented.
- `quantileExactWeighted()` syntax with weight as second argument is correct.
- `quantileExactLow()` and `quantileExactHigh()` descriptions are accurate — they correspond to Python's `median_low` and `median_high` behaviors respectively.
- Note that `quantileExactLow()` and `quantileExactHigh()` do use a **full sort** (O(n log n)), unlike `quantileExact()` which uses partial sort. The post's description of these as differing "at boundaries where the exact quantile falls between two data points" is accurate.
- The performance guidance (prefer `quantileExact()` for smaller datasets or narrow WHERE clauses) is sound practical advice.
