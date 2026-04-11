# Validation Summary: How to Use SHOW TRIGGERS in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (SHOW TRIGGERS statement)
- MySQL information_schema.TRIGGERS view
- MySQL SHOW CREATE TRIGGER statement

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW TRIGGERS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html)
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TRIGGERS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-triggers-table.html)
- MySQL 8.0 Reference Manual: SHOW CREATE TRIGGER Statement (https://dev.mysql.com/doc/refman/8.0/en/show-create-trigger.html)

## Issues Found
- **LIKE clause matches table names, not trigger names**: The original post had comments stating `SHOW TRIGGERS LIKE '%audit%'` finds triggers with "audit" in their name, and `SHOW TRIGGERS LIKE 'before_%'` finds triggers starting with "before_". This is incorrect. Per the MySQL documentation, the `LIKE` clause in `SHOW TRIGGERS` matches against **table names**, not trigger names. Fixed the comments and examples to accurately reflect this behavior, and added a note showing how to use `WHERE` to filter by trigger name instead.

## Review Notes
- The `information_schema.TRIGGERS` queries and column names are all correct for MySQL 8.0.
- The SHOW TRIGGERS output format and columns shown in the example are accurate.
- The cross-database query excludes 'mysql' and 'sys' schemas but not 'information_schema' or 'performance_schema'. This is acceptable since those schemas typically don't contain user-defined triggers.
- The `SHOW CREATE TRIGGER` syntax is correct.
- All WHERE clause examples correctly backtick reserved-word column names (`Table`, `Timing`, `Event`).
