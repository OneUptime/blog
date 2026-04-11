# Validation Summary: How to Use JSON_SET() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL
- MySQL JSON functions (JSON_SET, JSON_INSERT, JSON_REPLACE, JSON_OBJECT)

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_SET() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-set
- MySQL 8.0 Reference Manual: JSON Path Syntax — https://dev.mysql.com/doc/refman/8.0/en/json-path-syntax.html
- MySQL 8.0 Reference Manual: CAST and type conversion for JSON — https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html

## Issues Found

1. **Incorrect description of nested path behavior (lines 70-72)**: The post claimed that `JSON_SET(@order, '$.address.city', 'London')` where `$.address` does not exist would "set $.address to a string unexpectedly." This is wrong — when the parent path does not exist, `JSON_SET()` cannot resolve the child path and returns the document unchanged. Fixed the comment to accurately describe this behavior.

2. **SQL boolean literals stored as integers, not JSON booleans (lines 114, 126)**: The post used bare `false` and `true` SQL literals in `JSON_SET()`. In MySQL, `TRUE` and `FALSE` are aliases for `1` and `0` (integers), so `JSON_SET(details, '$.on_sale', false)` stores the integer `0`, not the JSON boolean `false`. Fixed both occurrences to use `CAST('false' AS JSON)` and `CAST('true' AS JSON)` to produce actual JSON boolean values.

## Review Notes
- The expected output comments for decimal values (e.g., `12.50`, `0.10`) may display as `12.5` and `0.1` in actual MySQL output, since JSON numbers do not preserve trailing zeros. This is a cosmetic difference and does not affect the correctness of the examples.
- The `->>'$.price'` operator returns a string, which MySQL implicitly converts to a number for arithmetic in the UPDATE example. This works but readers should be aware it relies on implicit type conversion.
- The post correctly covers the comparison table between JSON_SET, JSON_INSERT, and JSON_REPLACE, and the function signature is accurate.
