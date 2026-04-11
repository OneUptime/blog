# Validation Summary: How to Use REGEXP_SUBSTR() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL
- Regular Expressions (ICU regex engine used by MySQL 8.0+)

## Sources Consulted
- MySQL 8.0 Reference Manual: REGEXP_SUBSTR() — https://dev.mysql.com/doc/refman/8.0/en/regexp.html#function_regexp-substr
- MySQL 8.0 Reference Manual: Regular Expressions — https://dev.mysql.com/doc/refman/8.0/en/regexp.html
- MySQL 8.0 Reference Manual: REGEXP_INSTR() — https://dev.mysql.com/doc/refman/8.0/en/regexp.html#function_regexp-instr
- MySQL 8.0 Reference Manual: String Literals and escape sequences — https://dev.mysql.com/doc/refman/8.0/en/string-literals.html

## Issues Found
No technical issues found.

## Review Notes
- The `match_type` parameter description lists `i`, `c`, and `m` flags. MySQL 8.0 also supports `n` (dot matches newline) and `u` (Unix-only line endings). The post does not claim to be exhaustive, so this is not an error, but a future enhancement could mention these additional flags.
- The IP address regex (`[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}`) will match syntactically invalid IPs like `999.999.999.999`. This is a common simplification in tutorials and is acceptable in this context.
- The email regex is a reasonable approximation but does not cover all RFC 5322 edge cases. This is standard practice for tutorials and not an error.
- Double-backslash escaping is correctly and consistently used throughout all regex patterns containing literal dots, which is a common source of errors in MySQL regex tutorials.
