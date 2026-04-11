# Validation Summary: How to Select All Columns with SELECT * in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (SELECT statement, JOIN syntax, EXISTS subqueries, DESCRIBE/SHOW COLUMNS commands)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT Statement: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — EXISTS and NOT EXISTS Subqueries: https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html
- MySQL 8.0 Reference Manual — DESCRIBE Statement: https://dev.mysql.com/doc/refman/8.0/en/describe.html
- MySQL 8.0 Reference Manual — SHOW COLUMNS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-columns.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and follows standard MySQL conventions.
- The claim that `SELECT *` and `SELECT 1` are equivalent in EXISTS subqueries is accurate — MySQL's optimizer does not evaluate the select list in an EXISTS subquery.
- The note about duplicate column names in JOINs being indistinguishable in some clients is accurate; MySQL itself returns both columns, but client libraries may vary in how they expose them.
- The advice about avoiding `SELECT *` in production code, views, and prepared statements is well-founded and aligns with MySQL best practices.
