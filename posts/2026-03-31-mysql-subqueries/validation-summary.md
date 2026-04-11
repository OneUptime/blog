# Validation Summary: How to Write Subqueries in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (subqueries: scalar, column, derived table, correlated)
- SQL (SELECT, WHERE, FROM, HAVING, IN, ALL, ANY)

## Sources Consulted
- MySQL 8.0 Reference Manual — Subqueries: https://dev.mysql.com/doc/refman/8.0/en/subqueries.html
- MySQL 8.0 Reference Manual — Derived Tables: https://dev.mysql.com/doc/refman/8.0/en/derived-tables.html
- MySQL 8.0 Reference Manual — ALL and ANY Subqueries: https://dev.mysql.com/doc/refman/8.0/en/all-subqueries.html
- MySQL 8.0 Reference Manual — EXISTS and NOT EXISTS: https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html
- Manual computation of expected query outputs against the provided sample data

## Issues Found
- **Incorrect output in "Subquery in FROM (Derived Table)" example**: The expected output included Mouse (total_revenue = 599.80) which does NOT satisfy the `WHERE t.total_revenue > 1000` filter, and omitted Desk (total_revenue = 1049.97) which DOES satisfy it. Fixed the output table to show Laptop (4999.95), Monitor (3199.92), and Desk (1049.97) in descending order.

## Review Notes
- All SQL syntax is valid MySQL and uses no deprecated features.
- The DDL and DML setup scripts are correct and self-consistent.
- All other expected outputs were verified by manual computation against the sample data and are correct.
- The "Scalar Subquery in SELECT" example does not include an expected output table, which is acceptable since the query is syntactically correct and the pattern is clear.
- The section title "Subquery with ALL and ANY" only demonstrates ALL, not ANY. This is a minor completeness gap but not a technical error.
- The best practices section is accurate: MySQL does require aliases on derived tables, EXISTS does short-circuit, and EXPLAIN is the correct tool for inspecting subquery optimization strategies.
