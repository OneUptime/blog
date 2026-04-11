# Validation Summary: How to Use SET to Assign Variables in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (5.x and 8.0+)
- MySQL SET statement
- User-defined variables, system variables, local procedure variables
- SET PERSIST (MySQL 8.0+)
- SELECT := assignment syntax

## Sources Consulted
- MySQL 8.0 Reference Manual: SET Syntax for Variable Assignment — https://dev.mysql.com/doc/refman/8.0/en/set-variable.html
- MySQL 8.0 Reference Manual: User-Defined Variables — https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.0 Reference Manual: System Variable Reference — https://dev.mysql.com/doc/refman/8.0/en/server-system-variable-reference.html
- MySQL 8.0 Reference Manual: SET PERSIST — https://dev.mysql.com/doc/refman/8.0/en/set-variable.html
- MySQL 8.0 Reference Manual: DECLARE for Local Variables — https://dev.mysql.com/doc/refman/8.0/en/declare-local-variable.html

## Issues Found

1. **Incorrect claim that system variables "require" GLOBAL or SESSION qualifier**: The post stated "System variables require the `GLOBAL` or `SESSION` qualifier". This is inaccurate — without a qualifier, `SESSION` scope is assumed by default. Fixed to: "System variables use the `GLOBAL` or `SESSION` qualifier. Without a qualifier, `SESSION` is assumed by default."

2. **Missing deprecation notice for SELECT := syntax**: The post demonstrated `SELECT @var := expr` without noting that this syntax is deprecated as of MySQL 8.0.13 and will be removed in a future release. Added deprecation notice to the section introduction.

## Review Notes
- The running total pattern using `SELECT @running := @running + amount ... ORDER BY created_at` is not only deprecated but also has undefined evaluation order per MySQL documentation. The post already includes a parenthetical recommending window functions for MySQL 8.0+, which is good advice, but users should be aware this pattern may produce unpredictable results even on versions where it is not yet removed.
- The batch assignment example (`SET SESSION sort_buffer_size = ..., join_buffer_size = ...`) works correctly because variables without an explicit qualifier default to SESSION scope. However, the `SESSION` keyword syntactically applies only to the first variable in the list. Since the default is SESSION, the end result is correct.
- The stored procedure example is well-formed and uses proper DELIMITER handling.
- All system variable names used (`sort_buffer_size`, `join_buffer_size`, `tmp_table_size`, `max_heap_table_size`, `max_connections`) are valid MySQL system variables.
