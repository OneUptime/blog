# Validation Summary: How to Use STRCMP() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (STRCMP() string comparison function)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual — String Comparison Functions: https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html
- ASCII code table for verifying binary comparison behavior of uppercase vs lowercase characters

## Issues Found
- **Incorrect BINARY comparison result and explanation (line 53):** The post claimed `STRCMP(BINARY 'Hello', BINARY 'hello')` returns `1` with the comment "H > h in binary." This is wrong. In ASCII/binary encoding, uppercase letters have *lower* code points than lowercase letters (`H` = 72, `h` = 104). Therefore `'Hello' < 'hello'` in a binary comparison, and the correct return value is `-1`. Fixed the result to `-1` and updated the comment to explain that uppercase letters have lower code points.

## Review Notes
- All other code examples, NULL handling behavior, and general explanations of STRCMP() are technically accurate.
- The post correctly notes that STRCMP() is case-insensitive by default under case-insensitive collations and that BINARY forces case-sensitive comparison.
- The CASE expression example correctly uses the simple CASE syntax with STRCMP() return values.
- The advice to use COALESCE() for nullable columns is sound practical guidance.
