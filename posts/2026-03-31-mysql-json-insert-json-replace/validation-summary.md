# Validation Summary: How to Use JSON_INSERT() and JSON_REPLACE() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (JSON functions: JSON_INSERT, JSON_REPLACE, JSON_SET, JSON_ARRAY_APPEND, JSON_OBJECT)
- SQL (DDL, DML, SELECT queries)
- JSON path expressions (`$` notation)

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON_INSERT(), JSON_REPLACE(), JSON_SET(): https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html
- MySQL 8.0 Reference Manual — JSON Path Syntax: https://dev.mysql.com/doc/refman/8.0/en/json-path-syntax.html
- MySQL 8.0 Reference Manual — JSON_OBJECT(), JSON_ARRAY(): https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html
- MySQL 8.0 Reference Manual — The ->> (JSON inline path) operator: https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html

## Issues Found
1. **Nested JSON path in "Resetting Data with JSON_INSERT()" section**: The original code used `$.notifications.email` and `$.notifications.sms` to insert nested values, but the intermediate object `$.notifications` does not exist in the sample data. MySQL's `JSON_INSERT` cannot auto-create intermediate parent objects — when the parent path does not resolve, the path-value pair is silently ignored. Fixed by inserting `$.notifications` as a whole `JSON_OBJECT('email', CAST(TRUE AS JSON), 'sms', CAST(FALSE AS JSON))` instead of trying to set nested members individually. Added a comment explaining this limitation.

## Review Notes
- The post correctly uses `FALSE` and `TRUE` in JSON function arguments. In MySQL 8.0.17+, boolean literals are properly recognized in JSON context and produce JSON `true`/`false` rather than integers `1`/`0`. This is correct for current MySQL versions but would produce different results on older 8.0.x releases.
- The "Inserting into Arrays" section's leading comments describe JSON_INSERT/JSON_REPLACE behavior with array indexes, but the actual code examples use JSON_ARRAY_APPEND and JSON_INSERT for adding whole arrays. The code itself is correct, but the disconnect between comments and code could be clearer.
- The `->>` (inline path) operator used throughout is correct and available since MySQL 5.7.13.
