# Validation Summary: How to Use arrayJoin for Row Explosion in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine)
- `arrayJoin` function
- `ARRAY JOIN` / `LEFT ARRAY JOIN` clause
- `arrayEnumerate` function
- Window functions (`OVER`)

## Sources Consulted
- ClickHouse documentation: arrayJoin function — https://clickhouse.com/docs/en/sql-reference/functions/array-join
- ClickHouse documentation: ARRAY JOIN clause — https://clickhouse.com/docs/en/sql-reference/statements/select/array-join
- ClickHouse documentation: Array functions (arrayEnumerate) — https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse documentation: Window functions — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation: MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
1. **LEFT ARRAY JOIN default value claim (line 119)**: The post stated that rows with empty arrays appear with `tag = NULL`. This is incorrect for non-Nullable array element types. For `Array(String)`, LEFT ARRAY JOIN fills the unjoined column with the type's default value — an empty string `''`, not NULL. NULL is only produced for `Nullable` element types. Fixed the text to accurately describe the default-value behavior across types.

## Review Notes
- The section title "LEFT ARRAY JOIN for Null-Safe Expansion" is slightly misleading since NULL is not involved for non-Nullable types, but it is acceptable as a loose description of the feature's purpose (preserving rows that would otherwise be dropped).
- The `arrayJoin(arrayEnumerate(tags)) AS position` + `tags[position]` pattern works because ClickHouse deduplicates identical arrayJoin expressions in the same SELECT, but it is less idiomatic than using `ARRAY JOIN tags AS tag, arrayEnumerate(tags) AS num`. The post does show the ARRAY JOIN alternative immediately after, so this is fine.
- All other SQL examples — CREATE TABLE, INSERT, arrayJoin, ARRAY JOIN with multiple arrays, window function subquery — are syntactically correct and produce the expected results.
- The `count() / sum(count()) OVER ()` expression correctly returns Float64 in ClickHouse (the `/` operator promotes integer operands to Float64, unlike `intDiv`).
