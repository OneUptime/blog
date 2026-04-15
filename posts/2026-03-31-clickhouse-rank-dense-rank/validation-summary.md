# Validation Summary: How to Use RANK() and DENSE_RANK() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (window functions)
- SQL (RANK, DENSE_RANK, ROW_NUMBER, PARTITION BY, WINDOW clause)

## Sources Consulted
- ClickHouse Window Functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse SELECT query documentation: https://clickhouse.com/docs/en/sql-reference/statements/select
- SQL standard window function semantics (RANK, DENSE_RANK, ROW_NUMBER)

## Issues Found
No technical issues found.

All code examples use correct ClickHouse SQL syntax. The RANK()/DENSE_RANK() behavior descriptions and example output tables are accurate. The WINDOW clause (named windows) is correctly noted as supported in ClickHouse. The subquery pattern for filtering on window function results is the correct approach. The comparison table between RANK(), DENSE_RANK(), and ROW_NUMBER() is accurate.

## Review Notes
- The tier classification example calls DENSE_RANK() OVER (...) multiple times in the CASE expression. While this is valid SQL and ClickHouse will optimize it, the post could alternatively reference the computed alias via a subquery for clarity. This is a style choice, not an error.
- ClickHouse also supports the QUALIFY clause as an alternative to subquery-based filtering on window functions, but the subquery approach shown is universally correct and portable.
- Using `rank` as a column alias (line 33) shadows the built-in function name but is permitted in ClickHouse in this context.
