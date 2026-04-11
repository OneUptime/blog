# Validation Summary: How to Use LTRIM() and RTRIM() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (LTRIM, RTRIM, TRIM string functions)
- SQL (DDL, DML, SELECT queries)

## Sources Consulted
- MySQL 8.0 Reference Manual: String Functions and Operators — LTRIM(), RTRIM(), TRIM() (https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_ltrim)
- MySQL 8.0 Reference Manual: The CHAR and VARCHAR Types (https://dev.mysql.com/doc/refman/8.0/en/char.html)
- MySQL 8.0 Reference Manual: SQL Mode — PAD_CHAR_TO_FULL_LENGTH (https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_pad_char_to_full_length)
- MySQL 8.4 Release Notes: Removal of PAD_CHAR_TO_FULL_LENGTH

## Issues Found
1. **CHAR column section had incorrect default behavior.** The post stated that selecting a CHAR(10) column containing 'ABC' would return 'ABC       ' (10 chars) with LENGTH returning 10. This is incorrect for default MySQL behavior. MySQL strips trailing spaces from CHAR values on retrieval by default. LENGTH(code) returns 3, not 10, unless the deprecated `PAD_CHAR_TO_FULL_LENGTH` SQL mode is enabled. The section was rewritten to show both the default behavior (spaces stripped, LENGTH returns 3) and the PAD_CHAR_TO_FULL_LENGTH behavior (spaces preserved, LENGTH returns 10, RTRIM useful). The note was also updated to mention that PAD_CHAR_TO_FULL_LENGTH was deprecated in MySQL 8.0.13 and removed in MySQL 8.4.

## Review Notes
- The UPDATE and "finding rows" sections use `!=` to compare original vs trimmed values. With PAD SPACE collations (e.g., utf8mb4_general_ci), trailing-space-only differences may not be detected by `!=`. This works correctly with MySQL 8.0's default NO PAD collation (utf8mb4_0900_ai_ci). This is a minor collation-dependent nuance, not an error in the post.
- All other SQL syntax, function behavior, expected outputs, and the TRIM comparison table are technically correct.
