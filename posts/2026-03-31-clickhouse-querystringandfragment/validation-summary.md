# Validation Summary: How to Use queryStringAndFragment() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (SQL, URL functions)
- `queryStringAndFragment()`, `queryString()`, `fragment()`, `protocol()`, `domain()`, `path()`
- ClickHouse aggregate functions: `uniq()`, `count()`, `countIf()`, `groupArray(DISTINCT ...)`
- `extractURLParameter()` (mentioned in summary)

## Sources Consulted
- ClickHouse official documentation — URL functions: https://clickhouse.com/docs/en/sql-reference/functions/url-functions
- ClickHouse official documentation — `queryStringAndFragment()`: https://clickhouse.com/docs/en/sql-reference/functions/url-functions#querystringandfragment
- ClickHouse official documentation — `queryString()`: https://clickhouse.com/docs/en/sql-reference/functions/url-functions#querystring
- ClickHouse official documentation — `fragment()`: https://clickhouse.com/docs/en/sql-reference/functions/url-functions#fragment

## Issues Found
No technical issues found.

All code examples use correct ClickHouse SQL syntax. The expected output table in the Basic Usage section accurately reflects the documented behavior of `queryStringAndFragment()`, `queryString()`, and `fragment()` across all edge cases (both query string and fragment, query string only, fragment only, neither). The explanation of delimiter handling (leading `?` excluded, `#` preserved) is accurate. All referenced ClickHouse functions (`protocol()`, `domain()`, `path()`, `uniq()`, `countIf()`, `groupArray(DISTINCT ...)`, `arrayJoin()`, `extractURLParameter()`) are valid and correctly used.

## Review Notes
None.
