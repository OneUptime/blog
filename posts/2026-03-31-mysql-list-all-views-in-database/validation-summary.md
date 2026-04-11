# Validation Summary: How to List All Views in a MySQL Database

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (SHOW FULL TABLES statement)
- MySQL information_schema.VIEWS table
- mysql command-line client
- mysqldump utility

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW TABLES Statement — https://dev.mysql.com/doc/refman/8.0/en/show-tables.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA VIEWS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-views-table.html
- MySQL 8.0 Reference Manual: SHOW CREATE VIEW Statement — https://dev.mysql.com/doc/refman/8.0/en/show-create-view.html
- MySQL 8.0 Reference Manual: mysqldump — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html

## Issues Found
No technical issues found.

## Review Notes
- The `CONCAT('SHOW CREATE VIEW ', TABLE_NAME, ';')` query works for typical view names but would fail for names that are reserved words or contain special characters. Adding backtick quoting (e.g., `CONCAT('SHOW CREATE VIEW \`', TABLE_NAME, '\`;')`) would make it more robust, but this is a minor edge case and not an error.
- The `mysqldump --no-data mydb | grep -A 20 'CREATE.*VIEW'` approach is presented as a quick workaround, which is appropriate. For production use, the `-A 20` limit could truncate long view definitions, but the post does not claim this is a robust export method.
- All SQL syntax, column names, and CLI flags are accurate for MySQL 5.7 and 8.0+.
