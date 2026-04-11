# Validation Summary: How to Use SHOW CREATE TRIGGER in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SHOW CREATE TRIGGER, SHOW TRIGGERS, information_schema.TRIGGERS)
- MySQL triggers (BEFORE/AFTER, INSERT/UPDATE/DELETE)
- mysqldump (trigger export/exclusion)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW CREATE TRIGGER Statement — https://dev.mysql.com/doc/refman/8.0/en/show-create-trigger.html
- MySQL 8.0 Reference Manual: SHOW TRIGGERS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TRIGGERS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-triggers-table.html
- MySQL 8.0 Reference Manual: mysqldump — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and follows MySQL conventions.
- The SHOW CREATE TRIGGER output columns match the official MySQL documentation.
- The DELIMITER usage throughout the post is consistent and correct.
- The claim that MySQL does not support ALTER TRIGGER is accurate.
- The mysqldump behavior (triggers included by default, --skip-triggers to exclude) is correct.
- The information_schema.TRIGGERS column names are all valid.
- The post correctly demonstrates NEW references in BEFORE/AFTER triggers and OLD references in DELETE/UPDATE triggers.
