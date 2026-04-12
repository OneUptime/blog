# Validation Summary: How to Set the Default Collation in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 5.7
- MySQL 8.0
- utf8mb4 character set and collations
- MySQL configuration (my.cnf)
- information_schema system tables

## Sources Consulted
- MySQL 8.0 Reference Manual — Character Sets, Collations, Unicode: https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual — Server Character Set and Collation: https://dev.mysql.com/doc/refman/8.0/en/charset-server.html
- MySQL 8.0 Reference Manual — Unicode Collation Algorithm (UCA) Versions: https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-sets.html
- MySQL 8.0 Reference Manual — ALTER TABLE: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — SET NAMES: https://dev.mysql.com/doc/refman/8.0/en/set-names.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA TABLES and COLUMNS Tables: https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html

## Issues Found

1. **Incorrect UCA version for `utf8mb4_unicode_ci`**: The post stated it uses "Unicode 6.x sorting." The `utf8mb4_unicode_ci` collation is based on UCA (Unicode Collation Algorithm) version 4.0.0, not Unicode 6.x. Changed to "UCA 4.0.0 sorting."

2. **"passwords stored in plain text" in Summary**: The original text recommended `utf8mb4_bin` for "passwords stored in plain text," which implies storing passwords without hashing — a serious security anti-pattern. Changed to "password hashes" to reflect correct practice.

## Review Notes
- The `BINARY` comparison operator used in the "Case Sensitivity in Queries" section (`WHERE email = BINARY 'value'`) was deprecated in MySQL 8.0.28. It still works in current versions but may be removed in a future release. The recommended alternatives are `CAST(expr AS BINARY)` or using a `COLLATE` clause (e.g., `WHERE email COLLATE utf8mb4_bin = 'value'`). This is not changed in the post since it remains functional and the post covers both MySQL 5.7 and 8.0.
- The compatibility section states MySQL 8.0 changed the default from `utf8mb4_general_ci` to `utf8mb4_0900_ai_ci`. More precisely, MySQL 5.7's server default was `latin1` / `latin1_swedish_ci`, while MySQL 8.0 changed it to `utf8mb4` / `utf8mb4_0900_ai_ci`. The post's framing is reasonable in the context of utf8mb4 usage (where `utf8mb4_general_ci` was the default collation for the utf8mb4 charset in 5.7), but readers should be aware the overall server default also changed character sets.
- All SQL syntax, `information_schema` queries, `my.cnf` directives, config file paths, and `SET NAMES` / `SET collation_connection` commands are correct.
