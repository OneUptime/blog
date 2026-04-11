# Validation Summary: How to Use SHOW FULL COLUMNS in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (8.0+)
- SQL (SHOW FULL COLUMNS, DESCRIBE, ALTER TABLE)
- information_schema.COLUMNS

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW COLUMNS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
- MySQL 8.0 Reference Manual: DESCRIBE Statement — https://dev.mysql.com/doc/refman/8.0/en/describe.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html

## Issues Found
No technical issues found.

## Review Notes
- The sample output uses `int` without a display width and `utf8mb4_0900_ai_ci` as the default collation, which is consistent with MySQL 8.0+. Users on MySQL 5.7 or earlier would see different defaults (e.g., `int(11)` and `utf8_general_ci`).
- The "Auditing Collation Consistency" section header mentions SHOW FULL COLUMNS but the actual query uses information_schema.COLUMNS. This is reasonable since a cross-table audit requires information_schema, but the section intro is slightly misleading. Not a technical error.
- The DESCRIBE equivalence note is accurate — `DESCRIBE` is shorthand for `SHOW COLUMNS`, not `SHOW FULL COLUMNS`.
