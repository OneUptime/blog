# Validation Summary: How to Use String Splitting in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SUBSTRING_INDEX function)
- MySQL 8.0+ (JSON_TABLE, Recursive CTEs)
- SQL (numbers table pattern, standard string manipulation)

## Sources Consulted
- MySQL 8.0 Reference Manual: SUBSTRING_INDEX — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_substring-index
- MySQL 8.0 Reference Manual: JSON_TABLE — https://dev.mysql.com/doc/refman/8.0/en/json-table-functions.html
- MySQL 8.0 Reference Manual: Recursive CTEs — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual: LENGTH — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_length
- MySQL 8.0 Reference Manual: JOIN syntax — https://dev.mysql.com/doc/refman/8.0/en/join.html

## Issues Found
- **Typo in JSON_TABLE explanation (line 63):** The text described the wrapping format as `["...""]` (with a doubled closing quote) instead of the correct `["..."]`. The CONCAT/REPLACE expression produces `["apple","banana","cherry"]`, so the description was fixed to match.

## Review Notes
- All SQL code examples are syntactically correct and produce the described results.
- The SUBSTRING_INDEX examples correctly demonstrate fixed-position extraction using the nested-call technique.
- The JSON_TABLE approach correctly uses `JOIN JSON_TABLE(...)` without an ON clause, which is valid in MySQL 8.0 because JSON_TABLE is implicitly lateral.
- The recursive CTE correctly appends a trailing comma in the base case to ensure the last element is processed, and filters out the initial empty tokens with `WHERE token != ''`.
- The element-counting formula `1 + LENGTH(tags) - LENGTH(REPLACE(tags, ',', ''))` is correct. Note that `LENGTH` counts bytes, but since the delimiter is a single-byte comma, the byte-length difference equals the comma count regardless of character set. For an empty string input, this returns 1, which is a known edge case the post does not address but is not an error.
- The post appropriately recommends schema normalization as the preferred long-term solution.
