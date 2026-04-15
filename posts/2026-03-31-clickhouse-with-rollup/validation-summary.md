# Validation Summary: How to Use WITH ROLLUP in ClickHouse for Subtotals

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (GROUP BY WITH ROLLUP, GROUPING() function)
- MergeTree engine

## Sources Consulted
- ClickHouse official documentation: GROUP BY clause — https://clickhouse.com/docs/en/sql-reference/statements/select/group-by
- ClickHouse official documentation: Settings — https://clickhouse.com/docs/en/operations/settings/settings (for `group_by_use_nulls`)

## Issues Found
1. **Incorrect claim that collapsed columns use NULL by default**: The post stated that "Subtotal rows use `NULL` in the columns that were collapsed" as default behavior. In reality, ClickHouse fills collapsed columns with **default values** (`0` for numeric types, empty string for `String`) by default. The `group_by_use_nulls` setting must be set to `1` to get standard SQL NULL behavior. **Fix:** Updated the introductory paragraph to explain the default behavior and the `group_by_use_nulls` setting, and added `SET group_by_use_nulls = 1;` before the first example so the expected output (which shows NULL) is correct.

2. **Summary section repeated the same inaccuracy**: The closing summary also stated that subtotal rows carry NULL without qualification. **Fix:** Updated to mention that `group_by_use_nulls = 1` is needed for NULL behavior and that default values are used otherwise.

## Review Notes
- The `NULLS LAST` ordering in the examples is only meaningful when `group_by_use_nulls = 1` is enabled (which the fix now ensures). Without it, collapsed String columns would contain empty strings that sort differently than NULL.
- All SQL syntax (`GROUP BY ... WITH ROLLUP`, `GROUPING()`, `HAVING` with `GROUPING()`, `ORDER BY ... NULLS LAST`, `count()`, `avg()`, `sum()`) is valid ClickHouse SQL.
- The right-to-left grouping explanation — `(a, b, c)`, `(a, b)`, `(a)`, `()` — is correct per ClickHouse documentation.
- The `GROUPING()` function correctly returns `1` for collapsed columns and `0` for real grouped values.
- The `if(GROUPING(col) = 1, 'label', col)` pattern is idiomatic for labeling rollup rows.
- The arithmetic in expected output is correct (e.g., APAC subtotal: 400 + 150 = 550, grand total: 550 + 500 = 1050).
