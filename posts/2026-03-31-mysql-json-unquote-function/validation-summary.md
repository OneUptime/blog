# Validation Summary: How to Use JSON_UNQUOTE() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+ / 8.0+)
- SQL
- MySQL JSON functions (`JSON_EXTRACT`, `JSON_UNQUOTE`, `JSON_SEARCH`)
- MySQL `->` and `->>` operators

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON_UNQUOTE(): https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-unquote
- MySQL 8.0 Reference Manual — JSON Path Syntax and the `->` / `->>` operators: https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#operator_json-column-path
- MySQL 8.0 Reference Manual — JSON_EXTRACT(): https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-extract
- MySQL 8.0 Reference Manual — JSON_SEARCH(): https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-search
- MySQL 8.0 Reference Manual — Comparison and Sorting of JSON Values: https://dev.mysql.com/doc/refman/8.0/en/json.html#json-comparison

## Issues Found
1. **Invalid use of `->` and `->>` with string literals** (Section: "The Difference Between `->` and `->>"`): The original example used `'{"city": "New York"}' -> '$.city'` and `'{"city": "New York"}' ->> '$.city'`. Per the MySQL documentation, the `->` and `->>` operators require a column identifier on the left side, not an arbitrary expression or string literal. Using a string literal would produce a syntax error. Fixed by replacing the operators with their equivalent function forms (`JSON_EXTRACT` and `JSON_UNQUOTE(JSON_EXTRACT(...))`) and adding a clarifying note that the operators require a column reference.

## Review Notes
- The "Why Unquoting Matters for Comparisons" section states that `info -> '$.city' = 'New York'` returns 0 rows. This is technically correct because MySQL converts the SQL string `'New York'` to JSON for comparison, and `New York` is not valid JSON — causing the comparison to fail. The advice to always use `->>` or `JSON_UNQUOTE()` for comparisons against SQL string literals is sound.
- All other code examples, function signatures, NULL handling behavior, and the JSON_SEARCH integration example are accurate.
- The `->>` operator was introduced in MySQL 5.7.13; the post does not specify a minimum version, but all examples are compatible with MySQL 5.7.13+ and 8.0+.
