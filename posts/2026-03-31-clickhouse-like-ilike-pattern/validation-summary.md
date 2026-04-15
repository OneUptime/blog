# Validation Summary: How to Use like() and ilike() for Pattern Matching in ClickHouse

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- ClickHouse (SQL dialect, string search functions, LIKE/ILIKE operators)
- SQL pattern matching (LIKE, ILIKE, NOT LIKE, NOT ILIKE)
- ClickHouse functions: notLike(), notILike(), match(), multiSearchAny(), multiMatchAny(), replaceRegexpOne()

## Sources Consulted
- ClickHouse official docs — String Search Functions: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse official docs — SQL Syntax (string literals and escaping): https://clickhouse.com/docs/en/sql-reference/syntax#string
- ClickHouse official docs — multiSearchAny(): https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions#multisearchany
- ClickHouse official docs — multiMatchAny(): https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions#multimatchany

## Issues Found
- **Incorrect function recommendation for multiple pattern matching**: The post recommended `multiMatchAny()` as a more efficient replacement for chaining multiple `LIKE` conditions with `OR`. However, `multiMatchAny()` accepts regex patterns, not LIKE patterns. For the substring matching use case shown in the surrounding example (`message LIKE '%error%' OR message LIKE '%warning%'`), the correct and faster function is `multiSearchAny()`, which is optimized for simple substring searches. Updated the recommendation to suggest `multiSearchAny()` for substring checks and `multiMatchAny()` for regex-level patterns.

## Review Notes
- **Escaping style**: The escaping examples use single-backslash notation (`\%`, `\_`) rather than the docs-recommended double-backslash (`\\%`, `\\_`). Both work correctly in ClickHouse because unrecognized escape sequences in string literals preserve the backslash literally. However, the double-backslash form is the canonical recommendation per official documentation and would be more portable.
- **LIKE on numeric columns**: The `status_code LIKE '4%'` example implies `status_code` is stored as a string or relies on implicit type casting. ClickHouse does support implicit conversion of numeric types to strings for LIKE comparisons, so this works, but readers should be aware that using `toString(status_code) LIKE '4%'` or a numeric range (`status_code >= 400 AND status_code < 500`) would be more explicit and potentially faster.
- **ILIKE and Unicode**: The post correctly notes that `ILIKE` works for ASCII and recommends `lowerUTF8()` + `LIKE` for full Unicode case-insensitive matching. This is accurate guidance.
- **match() regex engine**: The post correctly identifies that `match()` uses the RE2 regex engine.
- All SQL examples are syntactically correct and demonstrate valid ClickHouse usage patterns.
