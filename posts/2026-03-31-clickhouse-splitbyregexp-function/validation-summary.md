# Validation Summary: How to Use splitByRegexp() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- `splitByRegexp()` string splitting function
- RE2 regular expression engine
- ClickHouse array functions (`arrayFilter`, `arrayJoin`, `arrayFirst`, `arrayIntersect`, `has`, `length`)

## Sources Consulted
- ClickHouse official documentation: Splitting and Merging Functions — https://clickhouse.com/docs/en/sql-reference/functions/splitting-merging-functions
- ClickHouse official documentation: Array Functions — https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- RE2 regular expression syntax reference — https://github.com/google/re2/wiki/Syntax

## Issues Found
No technical issues found.

## Review Notes
- The post shows the two-parameter signature `splitByRegexp(pattern, str)`. The full signature includes an optional third parameter `max_substrings` that caps the number of returned substrings. This omission is acceptable for a tutorial focused on basic and intermediate usage.
- All regex patterns are correctly double-escaped for ClickHouse SQL string literals (e.g., `'\\s+'` becomes `\s+` in the regex engine).
- Edge case documentation (leading/trailing empty strings, no-match behavior) matches official ClickHouse documentation exactly.
- The `HAVING` clause without `GROUP BY` in the document matching query is valid ClickHouse syntax and correctly used to filter on a column alias.
- Array indexing in the version string example uses 1-based indexing (`[1]`, `[2]`, `[3]`), which is correct for ClickHouse arrays.
