# Validation Summary: How to Use INNER JOIN in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SQL syntax, INNER JOIN, GROUP BY, aggregation functions)
- SQL (standard join operations, DDL, DML)

## Sources Consulted
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — Aggregate Functions (AVG): https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_avg
- MySQL 8.0 Reference Manual — Precision Math Expressions: https://dev.mysql.com/doc/refman/8.0/en/precision-math-expressions.html
- MySQL 8.0 Reference Manual — CREATE TABLE: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — AUTO_INCREMENT: https://dev.mysql.com/doc/refman/8.0/en/example-auto-increment.html

## Issues Found
1. **AVG decimal places in aggregation output**: The expected output for `AVG(e.salary)` showed 3 decimal places (e.g., `100000.000`). MySQL's AVG on a DECIMAL(10,2) column produces a result with a minimum scale of 4, per the MySQL documentation ("the scale of an AVG() result has a minimum of 4"). Fixed all three values to show 4 decimal places (e.g., `100000.0000`).
2. **Table formatting in three-table join output**: The "Platform Rewrite" cells were missing the trailing space before the closing `|` delimiter (e.g., `Platform Rewrite|` instead of `Platform Rewrite |`). Also adjusted the separator line width and padding for all rows in that column to be consistent with standard MySQL CLI output formatting.

## Review Notes
- All SQL queries are syntactically correct and would execute as described on MySQL 5.7+ and 8.0+.
- The claim that `JOIN` defaults to `INNER JOIN` is correct for MySQL (this is standard SQL behavior).
- The GROUP BY clause includes both `d.id` and `d.name`, which is good practice and avoids issues with `ONLY_FULL_GROUP_BY` mode (enabled by default in MySQL 5.7.5+).
- The best practices section gives sound advice. One addition that could be considered in the future: mentioning that FOREIGN KEY constraints on join columns (e.g., `employees.department_id` referencing `departments.id`) are recommended for data integrity.
