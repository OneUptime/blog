# Validation Summary: How to Use ifNull() and nullIf() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL)
- ClickHouse NULL-handling functions: `ifNull`, `nullIf`, `COALESCE`, `isNull`
- ClickHouse aggregate functions: `avg`, `count`

## Sources Consulted
- ClickHouse official docs — Functions for working with Nullable values: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse official docs — Conditional functions (`if`, `COALESCE`): https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse official docs — Aggregate functions (`count`, `avg` NULL semantics): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/count
- ClickHouse arithmetic operator semantics with Nullable types

## Issues Found
No technical issues found.

All claims were verified against ClickHouse documentation:
- `ifNull(x, alt)` returning `alt` when `x` is NULL is correct and equivalent to a two-argument `COALESCE`.
- `nullIf(x, y)` returning NULL when `x == y`, otherwise `x`, is correct.
- Division by NULL yielding NULL (rather than throwing) is correct ClickHouse behavior — the `clicks / nullIf(impressions, 0)` pattern is the standard idiom for safe division.
- Aggregate functions (`avg`, `count`) ignoring NULL values is correct, so wrapping columns with `nullIf` for sentinel filtering works as described.
- The equivalence of `ifNull(x, v)`, `COALESCE(x, v)`, and `if(isNull(x), v, x)` for two arguments is correct.
- All SQL examples are syntactically valid ClickHouse SQL.

## Review Notes
- The "ifNull() for Multi-Source Fallback" section phrases things as "multiple potential sources... try each in sequence," but `ifNull` takes only two arguments. The example itself correctly uses only two sources, so the code is not wrong; however, readers wanting more than two alternatives should use `COALESCE` (which the post does mention later in the "ifNull vs COALESCE vs if(isNull())" section). This is a minor stylistic observation, not a technical error.
- The post correctly notes that `COALESCE` should be preferred for more than two alternatives.
- No version-specific caveats — the functions described have been stable in ClickHouse for many releases.
