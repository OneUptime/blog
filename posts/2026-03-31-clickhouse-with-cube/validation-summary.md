# Validation Summary: How to Use WITH CUBE in ClickHouse for Cross-Tabulation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (GROUP BY WITH CUBE, WITH ROLLUP, GROUPING() function)
- MergeTree engine

## Sources Consulted
- ClickHouse GROUP BY documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/group-by
- ClickHouse GROUPING() function documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/grouping_function
- ClickHouse ORDER BY documentation (NULLS LAST): https://clickhouse.com/docs/sql-reference/statements/select/order-by
- ClickHouse count() function documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/count
- Altinity Knowledge Base - GROUP BY: https://kb.altinity.com/altinity-kb-queries-and-syntax/group-by/

## Issues Found
No technical issues found.

All verified claims:
- `GROUP BY col1, col2 WITH CUBE` syntax is correct for ClickHouse.
- WITH CUBE correctly produces 2^N grouping combinations (all possible subsets of the grouped columns, including the empty set for the grand total).
- WITH ROLLUP correctly produces N+1 grouping sets (hierarchical).
- The `GROUPING()` function returns 1 for collapsed/super-aggregate rows and 0 for regular rows, as described.
- The `if(GROUPING(col) = 1, 'label', col)` pattern is valid ClickHouse SQL.
- `HAVING` with `GROUPING()` to filter specific grouping sets works as shown.
- `ORDER BY ... NULLS LAST` is valid ClickHouse syntax (and is the default behavior).
- `count()` without arguments is the preferred ClickHouse-specific idiom, equivalent to `count(*)`.
- All arithmetic in the example output is correct (e.g., search total 800, social total 600, EU total 500, US total 900, grand total 1400).
- The filtering example correctly shows rows where exactly one dimension is collapsed.

## Review Notes
None.
