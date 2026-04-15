# Validation Summary: How to Calculate Running Totals in ClickHouse Without Window Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine)
- ClickHouse window functions (`SUM() OVER`)
- ClickHouse array functions (`arrayCumSum`, `arrayJoin`, `groupArray`, `arrayZip`)
- ClickHouse aggregate function combinators (`sumState`, `runningAccumulate`)

## Sources Consulted
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on `arrayCumSum`: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arraycumsumx
- ClickHouse documentation on `runningAccumulate`: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#runningaccumulate
- ClickHouse documentation on `arrayJoin`: https://clickhouse.com/docs/en/sql-reference/functions/array-join
- ClickHouse documentation on `-State` aggregate function combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-state
- ClickHouse documentation on `groupArray`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray

## Issues Found
No technical issues found.

## Review Notes
- The `arrayJoin` pattern used in Methods 2 and the Running Count/Average section relies on ClickHouse-specific behavior where multiple `arrayJoin` calls on arrays of equal length expand element-wise (in parallel) rather than producing a Cartesian product. This is correct but non-obvious to readers coming from other SQL dialects. A brief note explaining this behavior could help readers in the future.
- The "Running Totals by Group" section references a `category_revenue` table that is not defined anywhere in the post. While the example is clearly illustrative, providing a table definition or a note that the table is hypothetical would improve clarity.
- The `runningAccumulate` method (Method 3) uses `GROUP BY day, revenue` which would collapse rows with identical day and revenue values. For the sample data this is correct, but readers should be aware of this behavior for production use cases with potential duplicate rows.
- Window functions were correctly attributed to ClickHouse 21.1+, which is accurate (experimental support in 21.1, stable in later releases).
