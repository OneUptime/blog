# Validation Summary: How to View All Triggers in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (8.0+)
- SHOW TRIGGERS statement
- SHOW CREATE TRIGGER statement
- information_schema.TRIGGERS view
- mysqldump CLI tool

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW TRIGGERS — https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html
- MySQL 8.0 Reference Manual: SHOW CREATE TRIGGER — https://dev.mysql.com/doc/refman/8.0/en/show-create-trigger.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TRIGGERS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-triggers-table.html
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- MySQL 8.0 Reference Manual: mysqldump — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html

## Issues Found

1. **Incorrect privilege claim (Privileges Required section):** The post stated that the `SHOW DATABASES` privilege provides "broader visibility" into trigger metadata. This is inaccurate — `SHOW DATABASES` controls visibility of database names, not trigger metadata. The `TRIGGER` privilege is what is specifically needed. Removed the misleading `SHOW DATABASES` reference.

2. **Redundant `--triggers` flag in mysqldump example (Exporting Trigger Definitions section):** The post showed `mysqldump --triggers --no-data mydb orders` without noting that `--triggers` is enabled by default. This could mislead readers into thinking the flag is required. Updated the example to remove the redundant flag, added a note that triggers are included by default, and mentioned `--skip-triggers` for excluding them.

## Review Notes
- The mention of "DELIMITER conventions" in the SHOW CREATE TRIGGER section is slightly imprecise — DELIMITER is a mysql client command, not part of the stored trigger definition — but it is not technically wrong in context and is a common convention readers would encounter.
- All SQL queries use correct column names from information_schema.TRIGGERS.
- The SHOW TRIGGERS LIKE clause correctly describes filtering by table name (not trigger name), matching the official documentation.
- The combined `SHOW TRIGGERS FROM mydb LIKE 'users'` syntax is valid per the MySQL grammar.
