# Validation Summary: How to Use JSON_PRETTY() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- JSON_PRETTY() function
- MySQL JSON data type
- MySQL stored procedures

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON Utility Functions: https://dev.mysql.com/doc/refman/8.0/en/json-utility-functions.html
- MySQL 8.0 Reference Manual — JSON normalization, merging, and autowrapping: https://dev.mysql.com/doc/refman/8.0/en/json.html#json-normalization

## Issues Found

1. **Invalid JSON error behavior (Basic Syntax section)**: The post stated that `JSON_PRETTY()` "Returns `NULL` if `json_val` is `NULL` or not valid JSON." This is incorrect — per the MySQL docs, it returns `NULL` only for `NULL` input. For invalid JSON, it produces an error, not `NULL`. Fixed to: "Returns `NULL` if `json_val` is `NULL`. Produces an error if the argument is not valid JSON."

2. **Key ordering in first basic example output**: The output for `SELECT JSON_PRETTY('{"name":"Alice","age":30,"city":"NYC"}')` showed keys in insertion order (`name`, `age`, `city`). MySQL normalizes JSON object keys by sorting them (shorter keys first, then lexicographically within the same length). The correct output order is `age` (3 chars), `city` (4 chars), `name` (4 chars). Fixed the output accordingly.

3. **Key ordering in compact vs pretty comparison**: The compact and pretty output for the `api_logs` query showed keys as `email`, `name`, `roles`. MySQL's key normalization sorts by length first, so `name` (4 chars) should appear before `email` (5 chars) and `roles` (5 chars). Fixed both the compact and pretty output to show the correct order: `name`, `email`, `roles`.

## Review Notes
- The nested object example and array example had correct key ordering and required no changes.
- The JSON_PRETTY() vs JSON_UNQUOTE() comparison section is accurate and useful.
- The performance note section provides sound guidance about not using JSON_PRETTY() in high-volume production queries.
