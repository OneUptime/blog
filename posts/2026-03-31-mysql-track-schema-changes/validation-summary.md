# Validation Summary: How to Track Schema Changes in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (DDL, INFORMATION_SCHEMA, ENUM type, indexing)
- mysqldump (schema-only dumps)
- mysqldiff (MySQL Utilities)
- Skeema (Git-native schema management)
- Bash scripting (snapshot automation)
- Git (version control for migrations and snapshots)

## Sources Consulted
- MySQL 8.0 Reference Manual — ALTER TABLE syntax: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — CREATE INDEX syntax: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — mysqldump options (--no-data, --routines, --triggers, --events): https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA COLUMNS table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual — DATETIME default values: https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL Utilities mysqldiff documentation: https://dev.mysql.com/doc/mysql-utilities/1.6/en/mysqldiff.html
- Skeema CLI documentation: https://www.skeema.io/docs/commands/

## Issues Found
No technical issues found.

## Review Notes
- MySQL Utilities (which provides `mysqldiff`) has been discontinued and replaced by MySQL Shell utilities. The post correctly identifies it as "part of MySQL Utilities" without claiming it is actively maintained, so this is not an error, but readers should be aware that MySQL Shell's `util.copyInstance()` and related utilities are the modern replacement.
- The `--triggers` flag on mysqldump is technically redundant in MySQL 5.x+ since triggers are included by default, but explicitly specifying it is harmless and improves clarity.
- The INFORMATION_SCHEMA diff query omits `table_schema` from the JOIN condition. This works correctly in the single-schema context shown (the snapshot INSERT filters to `table_schema = 'myapp'`), but would need adjustment if tracking multiple schemas.
- `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` requires MySQL 5.6.5+. This is the norm for any reasonably current MySQL version but worth noting for anyone on very old installations.
