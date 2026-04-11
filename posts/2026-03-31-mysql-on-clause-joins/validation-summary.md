# Validation Summary: How to Use the ON Clause in MySQL Joins

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (JOIN syntax, ON clause)
- SQL (DDL with CREATE TABLE, DML with SELECT)

## Sources Consulted
- MySQL 8.0 Reference Manual: JOIN Clause — https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: Functional Key Parts — https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-functional-key-parts

## Issues Found
1. **Missing `department_id` column in `employees_pay` table**: The `employees_pay` table defined in the "Non-equi-join" section did not include a `department_id` column, but the subquery example in the "ON with a subquery on one side" section references `department_id` from `employees_pay` (`SELECT department_id, MAX(salary) AS max_salary FROM employees_pay GROUP BY department_id`). This query would fail with an unknown column error. Fixed by adding `department_id INT` to the `employees_pay` CREATE TABLE definition.

## Review Notes
- The "Joining on expressions" section references `employees.hire_date` and a `projects` table that are not defined with CREATE TABLE statements in the post. This is acceptable since the section is illustrative and not building on prior definitions.
- The self-join section references `employees.manager_id` which is not in the earlier `employees` CREATE TABLE. Also acceptable as a standalone illustrative example.
- The note about functional indexes is accurate for MySQL 8.0.13+. Users on MySQL 5.7 or earlier would need generated columns with indexes instead.
- The explanation of ON vs WHERE behavior with LEFT JOIN is correct and well-presented.
