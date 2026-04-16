# Validation Summary: How to Use quantiles() Function for Multiple Percentiles in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL aggregate functions (`quantile`, `quantiles`, `quantilesExact`, `quantilesIf`)
- ClickHouse `-If` combinator
- ClickHouse `WITH` expression aliasing
- ClickHouse date/time functions (`toStartOfHour`, `now()`, `INTERVAL`)

## Sources Consulted
- ClickHouse official docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiles
- ClickHouse official docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse official docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexact
- ClickHouse official docs on aggregate function combinators (`-If`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse Arrays reference (1-based indexing): https://clickhouse.com/docs/en/sql-reference/data-types/array
- ClickHouse `WITH` clause: https://clickhouse.com/docs/en/sql-reference/statements/select/with

## Issues Found
No technical issues found.

- The parameterized aggregate syntax `quantiles(level1, level2, ...)(x)` matches ClickHouse documentation.
- The 1-based array indexing (`q[1]`, `q[2]`, ...) is correct since ClickHouse arrays are 1-indexed.
- The claim that the default `quantile`/`quantiles` uses reservoir sampling is accurate per ClickHouse documentation.
- `quantilesExact` and `quantilesIf` are valid functions and the example signatures are correct.
- Alias re-use within a single SELECT (e.g., referencing `q` after `... AS q`) is supported by ClickHouse.
- The `WITH expr AS name` alias-substitution pattern works for the example shown; each `q[i]` is expanded by the parser, and ClickHouse will still aggregate in a single pass since the aggregate expression is identical.
- `INTERVAL 24 HOUR` is valid ClickHouse interval syntax.

## Review Notes
- In the `quantilesExact()` example, `LIMIT 10000` placed after the aggregating SELECT only limits the (single) result row, not the input rows. This is technically valid SQL but does not actually constrain the dataset size as the surrounding text might imply. To limit input rows, a subquery with `LIMIT` would be needed. Left as-is since the syntax is not incorrect, the function call itself demonstrates correct usage, and modifying the example would go beyond a technical-correctness fix.
- `quantilesExact` can use significant memory on large datasets because it stores all values; the post mentions this in the Performance Considerations section.
