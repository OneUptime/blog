# Validation Summary: What Is a MySQL Database

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL (general, applies to 5.7+ and 8.0+)
- SQL (DDL statements: CREATE DATABASE, DROP DATABASE, USE, SHOW)
- mysqldump CLI tool
- information_schema system database

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE DATABASE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-database.html
- MySQL 8.0 Reference Manual: DROP DATABASE Statement — https://dev.mysql.com/doc/refman/8.0/en/drop-database.html
- MySQL 8.0 Reference Manual: USE Statement — https://dev.mysql.com/doc/refman/8.0/en/use.html
- MySQL 8.0 Reference Manual: SHOW DATABASES Statement — https://dev.mysql.com/doc/refman/8.0/en/show-databases.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: Character Sets and Collations (utf8 vs utf8mb4) — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-sets.html
- MySQL 8.0 Reference Manual: System Schema — https://dev.mysql.com/doc/refman/8.0/en/system-schema.html
- MySQL 8.0 Reference Manual: mysqldump — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html

## Issues Found
No technical issues found.

## Review Notes
- In MySQL 8.0, `utf8` is deprecated as an alias for `utf8mb3`. The post's recommendation to use `utf8mb4` is correct and forward-looking.
- The summary mentions "each with independent schemas and access controls." Since the post earlier establishes that database and schema are synonymous in MySQL, this phrasing could potentially confuse readers. However, it is not technically incorrect — "schema" here is used in the general sense of structure/organization rather than the MySQL-specific synonym.
- The `RENAME DATABASE` statement was briefly available in MySQL 5.1.7 but removed in 5.1.23 due to data loss risks. The post correctly states it does not exist and provides the standard dump-and-reimport workaround.
- The `sys` database is available since MySQL 5.7. For deployments on MySQL 5.6 or earlier, this system database would not exist, but those versions are well past end-of-life.
