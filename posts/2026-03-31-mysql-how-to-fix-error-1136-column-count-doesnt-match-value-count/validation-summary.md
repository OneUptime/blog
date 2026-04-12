# Validation Summary: How to Fix ERROR 1136 Column Count Doesn't Match Value Count in MySQL

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (ERROR 1136, INSERT statements, CREATE TABLE ... SELECT)
- Python (MySQL database connector usage)
- SQL (information_schema, DESCRIBE)

## Sources Consulted
- MySQL 8.0 Reference Manual: INSERT Statement (https://dev.mysql.com/doc/refman/8.0/en/insert.html)
- MySQL 8.0 Reference Manual: CREATE TABLE ... SELECT Statement (https://dev.mysql.com/doc/refman/8.0/en/create-table-select.html)
- MySQL 8.0 Reference Manual: Server Error Message Reference, ERROR 1136 (https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html)

## Issues Found

1. **Description text said "SELECT INTO statements"**: MySQL does not use `SELECT INTO` syntax (that is SQL Server). The correct MySQL syntax is `INSERT ... SELECT`. Fixed to "INSERT ... SELECT statements".

2. **Cause 5 incorrectly claimed CREATE TABLE ... SELECT produces ERROR 1136**: The section showed `CREATE TABLE archive (id INT, name VARCHAR(100)) SELECT id, name, salary FROM employees;` and claimed it would produce ERROR 1136. This is incorrect. In MySQL, `CREATE TABLE ... SELECT` merges column definitions with SELECT columns by name — columns from the SELECT that don't match a defined column are appended as additional columns. The example would actually succeed, creating a table with 3 columns (id, name, salary). Fixed the section to accurately describe this behavior and clarify that `INSERT INTO ... SELECT` (Cause 4) is where ERROR 1136 occurs.

## Review Notes
- Causes 1 through 4 are all technically accurate with correct SQL examples.
- The error code (1136) and SQLSTATE (21S01) are correct.
- The Python code example correctly demonstrates parameterized queries with explicit column names.
- The information_schema query and DESCRIBE usage are correct.
- The best practices advice (always naming columns in INSERT statements) is sound and well-presented.
