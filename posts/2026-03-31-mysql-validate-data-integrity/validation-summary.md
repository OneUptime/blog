# Validation Summary: How to Validate Data Integrity in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7+ and 8.0+)
- SQL (LEFT JOIN, UNION ALL, REGEXP, CASE expressions)
- Foreign key constraints and referential integrity
- Regular expressions for data validation

## Sources Consulted
- MySQL 8.0 Reference Manual: JOIN Clause — https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual: REGEXP operator — https://dev.mysql.com/doc/refman/8.0/en/regexp.html
- MySQL 8.0 Reference Manual: Server System Variables (foreign_key_checks) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_foreign_key_checks
- MySQL 8.0 Reference Manual: UNION Clause — https://dev.mysql.com/doc/refman/8.0/en/union.html
- MySQL 8.0 Reference Manual: String Literals and escape sequences — https://dev.mysql.com/doc/refman/8.0/en/string-literals.html

## Issues Found
No technical issues found.

## Review Notes
- The email REGEXP patterns use double-backslash escaping (`\\-`, `\\.`) which is correct for MySQL string literals — MySQL interprets `\\` as a single literal backslash before passing to the regex engine.
- The `{2,}` quantifier in the email regex works in both MySQL 5.x (Henry Spencer / POSIX ERE) and MySQL 8.0+ (ICU regex engine).
- The `foreign_key_checks` variable is session-scoped by default, which is the appropriate behavior for the bulk-load pattern described. The post could note this explicitly but it is not incorrect as written.
- The integrity report query using UNION ALL is a practical pattern. In production use, wrapping this in a stored procedure or scheduled event could be beneficial, but that is beyond the scope of this post.
