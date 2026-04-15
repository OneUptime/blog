# Validation Summary: How to Use path() and pathFull() URL Functions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse SQL
- ClickHouse URL functions (`path()`, `pathFull()`)
- ClickHouse string functions (`splitByChar`, `replaceRegexpAll`, `startsWith`)
- ClickHouse aggregate functions (`count`, `uniq`, `avg`, `quantile`, `anyLast`)

## Sources Consulted
- ClickHouse official documentation for URL functions: https://clickhouse.com/docs/en/sql-reference/functions/url-functions

## Issues Found
No technical issues found.

## Review Notes
- The `path()` and `pathFull()` function behavior is accurately described and matches the official ClickHouse documentation. `path()` strips query strings and fragments; `pathFull()` preserves them.
- All SQL examples use correct ClickHouse syntax, including proper use of `arrayJoin`, `splitByChar` with 1-based array indexing, `replaceRegexpAll` for regex substitution, and `quantile(0.95)()` parametric aggregate syntax.
- The output table in the Basic Usage section correctly shows empty values for `https://example.com` (no path), which is consistent with ClickHouse returning empty strings for URLs without a path component.
- The depth calculation using `length(splitByChar(...)) - 1` is a reasonable approximation of URL depth, though users should be aware that the root path `/` will report depth 1 rather than 0 due to how `splitByChar` handles leading delimiters.
