# Validation Summary: How to Use Regular Expressions in MySQL WHERE Clause

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.x and 8.0+)
- MySQL REGEXP / RLIKE operators
- MySQL 8.0 regex functions (REGEXP_SUBSTR, REGEXP_REPLACE)
- SQL WHERE clause pattern matching

## Sources Consulted
- MySQL 8.0 Reference Manual: Regular Expressions (https://dev.mysql.com/doc/refman/8.0/en/regexp.html)
- MySQL 8.0 Reference Manual: REGEXP_SUBSTR() (https://dev.mysql.com/doc/refman/8.0/en/regexp.html#function_regexp-substr)
- MySQL 8.0 Reference Manual: REGEXP_REPLACE() (https://dev.mysql.com/doc/refman/8.0/en/regexp.html#function_regexp-replace)
- MySQL 8.0 Reference Manual: String Literals and Escape Sequences (https://dev.mysql.com/doc/refman/8.0/en/string-literals.html)
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)

## Issues Found
No technical issues found.

## Review Notes
- The `^[a-z]+$` example for matching "only lowercase letters" is correct syntactically, but readers should be aware that with case-insensitive collations (e.g., `utf8mb4_0900_ai_ci`, the default in MySQL 8.0), `[a-z]` will also match uppercase letters. A `BINARY` cast or binary collation would be needed for truly case-sensitive matching. This is a collation nuance rather than a code error.
- All double-backslash escaping (`\\.`, `\\+`) in SQL string literals is correctly applied throughout the post, producing the intended single backslash for the regex engine.
- The REGEXP_REPLACE example's WHERE clause (`[^0-9+]`) correctly targets only rows containing characters other than digits and `+`, while the SET clause strips all non-digits. This is intentional and logically sound.
- MySQL 8.0 switched from the Henry Spencer regex library to ICU for regex support, which expanded regex capabilities. The patterns used in this post are compatible with both libraries.
