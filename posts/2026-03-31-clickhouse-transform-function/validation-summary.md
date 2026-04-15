# Validation Summary: How to Use transform() Function for Value Mapping in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- ClickHouse `transform()` function
- ClickHouse `intDiv()`, `toDayOfWeek()`, `lower()` functions

## Sources Consulted
- ClickHouse official documentation: Other Functions — transform() (https://clickhouse.com/docs/en/sql-reference/functions/other-functions#transform)
- ClickHouse official documentation: Arithmetic Functions — intDiv() (https://clickhouse.com/docs/en/sql-reference/functions/arithmetic-functions#intdiva-b)
- ClickHouse official documentation: Date/Time Functions — toDayOfWeek() (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#todayofweek)

## Issues Found

1. **Malformed SQL in "transform vs CASE WHEN" section**: The CASE WHEN example had its `FROM orders;` clause separated from the SELECT by a misleading `-- transform version (concise)` comment, making the first query appear incomplete and the comment appear to be part of the wrong statement. Fixed by making both the CASE WHEN and transform examples into complete, self-contained SQL statements with consistent column aliases and LIMIT clauses.

2. **Incorrect claim that the default value is required**: The Summary stated "the default value is required." In fact, `transform()` has two forms: a 4-argument form `transform(x, from, to, default)` where from/to arrays can be different types, and a 3-argument form `transform(x, from, to)` where unmatched values are returned as-is (requiring from/to arrays to share the same type). Fixed the Summary to accurately describe both forms.

3. **Misleading section title "Dynamic Mapping with Arrays from Subqueries"**: The title mentioned subqueries, but the example uses `WITH` clauses with literal constant arrays, not subqueries. The body text also incorrectly stated arrays must be "literal array expressions or array columns." Fixed the title to "Dynamic Mapping with Arrays from WITH Clauses" and updated the description to clarify that arrays must resolve to constant expressions.

## Review Notes
- The `transform()` function requires its from/to arrays to be constant arrays. The post's WITH clause example works because WITH in ClickHouse defines constant expression aliases, but readers should be aware that arrays derived from subqueries or table columns will not work.
- The `toDayOfWeek()` mapping (1=Monday through 7=Sunday) is correct for the default mode (ISO 8601). A `mode` parameter exists for other conventions (e.g., US Sunday=1), but the default behavior shown is accurate.
- The Priority/Severity Mapping example maps strings to integers, which is valid only with the 4-argument form of transform (where from_array and to_array can be different types). This is correctly used in the post.
