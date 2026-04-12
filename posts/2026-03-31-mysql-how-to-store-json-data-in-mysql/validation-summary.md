# Validation Summary: How to Store JSON Data in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+ with some features requiring 8.0+)
- MySQL JSON data type
- MySQL JSON functions (JSON_OBJECT, JSON_ARRAY, JSON_SET, JSON_REMOVE, JSON_STORAGE_SIZE, JSON_CONTAINS_PATH)
- MySQL generated columns and indexing

## Sources Consulted
- MySQL 8.0 Reference Manual: The JSON Data Type — https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual: JSON Function Reference — https://dev.mysql.com/doc/refman/8.0/en/json-function-reference.html
- MySQL 8.0 Reference Manual: JSON Path Syntax — https://dev.mysql.com/doc/refman/8.0/en/json-path-syntax.html
- MySQL 8.0 Reference Manual: Comparison and Sorting of JSON Values — https://dev.mysql.com/doc/refman/8.0/en/json.html#json-comparison
- MySQL 8.0 Reference Manual: CREATE TABLE and Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual: Data Type Default Values — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html

## Issues Found
1. **Incorrect JSON boolean comparison with TRUE**: In the "Full Example: User Preferences Table" section, the query `WHERE prefs -> '$.notifications.email' = TRUE` does not work as intended. MySQL's `TRUE` is an alias for integer `1`. The `->` operator returns a JSON value, so `prefs -> '$.notifications.email'` returns JSON boolean `true`. When MySQL compares this with `TRUE` (integer `1`), it converts the integer to JSON integer `1`. JSON boolean `true` and JSON integer `1` are different JSON types, so the equality comparison fails. Fixed to `WHERE prefs ->> '$.notifications.email' = 'true'`, which uses the unquote operator to return the string `'true'` and compares it as a string.

## Review Notes
- The `JSON NOT NULL DEFAULT (JSON_OBJECT())` syntax in the user_preferences table example requires MySQL 8.0.13+, as expression defaults were not supported in MySQL 5.7. The post's description mentions MySQL 5.7 as the version that introduced the JSON type, which is accurate, but readers on 5.7 would need to remove the DEFAULT clause or use a trigger instead.
- The `+ 0` trick for forcing numeric comparison in the filtering section works but is less explicit than using `CAST()`. The post's own Common Pitfalls section correctly recommends `CAST()` for this purpose, so the inconsistency is minor.
- All JSON function names, path expression syntax, and SQL syntax are correct and current.
