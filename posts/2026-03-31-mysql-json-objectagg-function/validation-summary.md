# Validation Summary: How to Use JSON_OBJECTAGG() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 5.7.22+ and 8.0+
- JSON_OBJECTAGG() aggregate function
- JSON_ARRAYAGG() aggregate function
- MySQL JSON functions

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_OBJECTAGG() — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_json-objectagg
- MySQL 8.0 Reference Manual: Aggregate Functions — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
- MySQL 5.7 Release Notes (5.7.22) — https://dev.mysql.com/doc/relnotes/mysql/5.7/en/news-5-7-22.html

## Issues Found
1. **Invalid DISTINCT syntax with JSON_OBJECTAGG()**: The post claimed `JSON_OBJECTAGG(DISTINCT setting_key, setting_value)` is valid syntax supported in MySQL 8.0+. This is incorrect — MySQL does not support the `DISTINCT` keyword as a modifier inside `JSON_OBJECTAGG()`. The function signature only accepts `JSON_OBJECTAGG(key, value)`. Fixed by replacing the example with the correct approach: deduplicating rows in a subquery using `SELECT DISTINCT` before passing them to `JSON_OBJECTAGG()`. Also removed the incorrect note about DISTINCT support in MySQL 8.0+.

## Review Notes
- The duplicate key behavior description ("behavior is undefined — MySQL may use any of the values") is accurate per the MySQL documentation, which states the result for duplicate keys is not guaranteed.
- The result ordering shown in the Basic Usage example (alphabetical by key) is typical of MySQL's implementation but is not guaranteed by the JSON specification. This is acceptable as-is since it matches common observed behavior.
- All other code examples (basic usage, GROUP BY patterns, combining with JSON_ARRAYAGG, NULL key handling, product variant pricing) are syntactically correct and demonstrate valid usage patterns.
