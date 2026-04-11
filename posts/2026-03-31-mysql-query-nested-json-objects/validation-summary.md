# Validation Summary: How to Query Nested JSON Objects in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (JSON data type, 5.7.13+)
- JSON path expressions (dot notation, wildcards, recursive descent)
- MySQL JSON functions: JSON_EXTRACT(), JSON_CONTAINS_PATH(), JSON_SET()
- MySQL column-path operators: `->` and `->>`
- Virtual generated columns with indexes for JSON fields

## Sources Consulted
- MySQL 8.0 Reference Manual — The JSON Data Type: https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual — JSON Path Syntax: https://dev.mysql.com/doc/refman/8.0/en/json-path-syntax.html
- MySQL 8.0 Reference Manual — JSON Function Reference: https://dev.mysql.com/doc/refman/8.0/en/json-function-reference.html
- MySQL 8.0 Reference Manual — JSON Search Functions (JSON_EXTRACT, JSON_CONTAINS_PATH): https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html
- MySQL 8.0 Reference Manual — JSON Modification Functions (JSON_SET): https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html
- MySQL 8.0 Reference Manual — CREATE TABLE and Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual — JSON Column Indexing via Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/create-table-secondary-indexes.html

## Issues Found
- **Wildcard result comment had wrong value order**: The comment on the `$.scores.*` wildcard example stated the result as `[95, 88] or [72, 91]`, implying "math" comes before "english". MySQL normalizes JSON objects by sorting keys alphabetically, so "english" precedes "math" in storage. The actual results are `[88, 95]` and `[91, 72]`. Fixed the comment to show the correct order and added a note about alphabetical key sorting.

## Review Notes
- All SQL syntax is correct and functional for MySQL 5.7.13+ and 8.0.
- The `->` and `->>` operators are correctly described (`->` = `JSON_EXTRACT()`, `->>` = `JSON_UNQUOTE(JSON_EXTRACT())`).
- The `$**` recursive descent wildcard syntax is correct per MySQL JSON path specification.
- The virtual generated column with index example is valid for InnoDB (default engine), which supports secondary indexes on virtual generated columns since MySQL 5.7.8.
- The post does not specify a minimum MySQL version; readers should be aware that `->>` requires MySQL 5.7.13+ and the JSON data type requires MySQL 5.7.8+.
