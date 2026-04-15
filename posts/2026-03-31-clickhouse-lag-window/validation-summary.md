# Validation Summary: How to Use LAG() Window Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (window functions, date/time functions)
- SQL (LAG() window function, PARTITION BY, ORDER BY, CASE expressions)

## Sources Consulted
- ClickHouse official documentation — Window Functions: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse official documentation — LAG: https://clickhouse.com/docs/sql-reference/window-functions/lag
- ClickHouse official documentation — dateDiff: https://clickhouse.com/docs/sql-reference/functions/date-time-functions#datediff
- ClickHouse official documentation — round: https://clickhouse.com/docs/sql-reference/functions/rounding-functions#round
- Altinity Knowledge Base — LAG/LEAD: https://kb.altinity.com/altinity-kb-queries-and-syntax/lag-lead/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly uses the standard SQL `LAG()` function (as opposed to ClickHouse's alternative `lagInFrame()`, which differs in default NULL handling — returning type-default values like 0 or empty string instead of NULL).
- All SQL examples are syntactically correct and use proper ClickHouse function signatures.
- The `dateDiff('second', start, end)` argument order is correct for ClickHouse.
- The `today() - 1` expression is valid ClickHouse syntax for computing yesterday's date.
- The caveat about needing gap-free daily data for the 7-row offset to represent week-over-week comparison is a valuable and accurate note.
- ClickHouse window functions have a fixed frame specification (`ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`) which cannot be customized for LAG — this is not mentioned but also not relevant since LAG ignores the frame specification by design.
