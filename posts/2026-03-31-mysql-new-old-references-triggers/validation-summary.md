# Validation Summary: How to Use NEW and OLD References in MySQL Triggers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (triggers, NEW/OLD row references, SIGNAL statement)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: Trigger Syntax and Examples — https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html
- MySQL 8.0 Reference Manual: String Functions (CONCAT) — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_concat
- MySQL 8.0 Reference Manual: Logical Operators (||) — https://dev.mysql.com/doc/refman/8.0/en/logical-operators.html#operator_or
- MySQL 8.0 Reference Manual: SQL Mode (PIPES_AS_CONCAT) — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_pipes_as_concat
- MySQL 8.0 Reference Manual: SIGNAL Statement — https://dev.mysql.com/doc/refman/8.0/en/signal.html

## Issues Found
1. **`||` used as string concatenation operator (lines 100-101)**: The `trg_employees_normalize` trigger used `||` to concatenate the uppercased first letter with the lowercased remainder of `first_name`. In MySQL, `||` is the logical OR operator by default (returning 0 or 1), not the string concatenation operator. This would silently produce an incorrect value (a numeric 0 or 1) instead of the intended capitalized name. Fixed by replacing `||` with `CONCAT()`, which is the correct MySQL string concatenation function. Note: MySQL does support `||` as concatenation only when the `PIPES_AS_CONCAT` SQL mode is enabled, but relying on a non-default SQL mode in a general tutorial is incorrect.

## Review Notes
- The availability table correctly documents NEW/OLD availability and writability across all six trigger types.
- All other code examples (BEFORE INSERT normalization, AFTER UPDATE audit logging, AFTER DELETE archival, BEFORE UPDATE validation with SIGNAL) are syntactically correct and follow MySQL best practices.
- The use of `<>` for inequality comparison is valid MySQL syntax; `!=` would also work but `<>` is standard SQL.
- The DELIMITER usage is correct throughout all examples.
