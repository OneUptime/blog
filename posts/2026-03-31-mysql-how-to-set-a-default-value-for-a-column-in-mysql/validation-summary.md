# Validation Summary: How to Set a Default Value for a Column in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL 8.0 / 8.0.13+ (column DEFAULT values, expression defaults)

## Sources Consulted
- MySQL 8.0 Reference Manual — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html (verified literal defaults, CURRENT_TIMESTAMP for DATETIME/TIMESTAMP without parentheses, expression defaults since 8.0.13 must be parenthesized, BLOB/TEXT/JSON defaults must be expressions, deterministic and non-deterministic built-in functions such as RAND()/UUID() permitted, subqueries/variables/stored functions not permitted)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- `ALTER TABLE ... ALTER COLUMN col SET DEFAULT value` and `ALTER COLUMN col DROP DEFAULT` (change/drop the default only) versus `MODIFY COLUMN` (full column definition) are described correctly.
- Expression defaults `DEFAULT (CONCAT(...))`, `DEFAULT (UUID())`, and `DEFAULT (JSON_OBJECT())` all require the parentheses shown, and the post explicitly states this requirement. Confirmed the manual permits non-deterministic functions (RAND(), UUID()) in parenthesized expression defaults.
- The JSON column default `DEFAULT (JSON_OBJECT())` correctly uses the expression form, which the manual requires for BLOB/TEXT/JSON types (a bare literal default is rejected for these types).
- `DEFAULT TRUE/FALSE` for BOOLEAN is accepted (BOOLEAN is an alias for TINYINT(1); TRUE/FALSE map to 1/0).
