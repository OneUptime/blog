# Validation Summary: How to Use LOCATE() and INSTR() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (8.0+)
- SQL string functions: LOCATE(), INSTR(), POSITION(), SUBSTRING(), LEFT()
- MySQL collations (utf8mb4_0900_ai_ci, utf8mb4_bin)

## Sources Consulted
- MySQL 8.0 Reference Manual — String Functions: LOCATE: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_locate
- MySQL 8.0 Reference Manual — String Functions: INSTR: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_instr
- MySQL 8.0 Reference Manual — String Functions: POSITION: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_position
- MySQL 8.0 Reference Manual — Character Sets and Collations: https://dev.mysql.com/doc/refman/8.0/en/charset-general.html

## Issues Found
No technical issues found.

## Review Notes
- All code examples were manually verified for correct return values by computing character positions.
- The case sensitivity section correctly identifies `utf8mb4_0900_ai_ci` as the MySQL 8.0+ default collation and accurately describes the behavior with `utf8mb4_bin` for case-sensitive matching.
- The log parsing example correctly computes offsets for the fixed-format log line.
- The nested LOCATE example for finding the third occurrence of 'a' in 'banana' is correct and clearly demonstrates the pattern.
- The delimiter extraction example for URL path segments is correct and handles the offset arithmetic properly.
- The post mentions `utf8mb4_0900_ai_ci` which is specific to MySQL 8.0+. Users on MySQL 5.7 or earlier would have a different default collation (e.g., `latin1_swedish_ci`), though the case-insensitive behavior would be the same.
