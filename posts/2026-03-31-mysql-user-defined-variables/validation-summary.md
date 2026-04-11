# Validation Summary: What Is a User-Defined Variable in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (user-defined variables, session scope, SET statement, := operator)
- SQL (SELECT, subqueries, window functions mentioned as modern alternative)

## Sources Consulted
- MySQL 8.0 Reference Manual — User-Defined Variables: https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.0 Reference Manual — SET Syntax for Variable Assignment: https://dev.mysql.com/doc/refman/8.0/en/set-variable.html
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html

## Issues Found
- **Missing deprecation note for `:=` in SELECT statements.** The "Setting a User-Defined Variable" section presented `SELECT @total := SUM(amount) FROM orders;` as a standard approach without noting that assigning user variables with `:=` inside SELECT statements is deprecated as of MySQL 8.0 (generates a warning in 8.0.22+) and is subject to removal in a future release. Added a deprecation note recommending `SET` for variable assignment instead.

## Review Notes
- The running totals and row numbers sections correctly note that window functions are preferable in MySQL 8.0+, which is good. However, the `:=` examples in those sections are also affected by the same deprecation. Since the post already frames them as legacy techniques and recommends alternatives, no additional changes were needed there.
- The supported data types list ("integer, decimal, floating-point, binary string, or non-binary string") matches the MySQL docs. The docs also mention "NULL value" as a possible type; the post demonstrates `SET @null_val = NULL;` but doesn't list NULL in the text. This is acceptable since NULL is more of a value than a type.
- All SQL syntax is correct. The distinction between `=` (valid in SET) and `:=` (required in non-SET statements) is accurately represented.
- The transaction/rollback behavior described is correct — user-defined variables are not transaction-aware.
