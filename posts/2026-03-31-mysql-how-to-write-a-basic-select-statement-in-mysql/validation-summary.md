# Validation Summary: How to Write a Basic SELECT Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SELECT statement, WHERE, ORDER BY, LIMIT, DISTINCT, GROUP BY, HAVING)
- SQL built-in functions (CONCAT, YEAR, DATEDIFF, CURDATE, UPPER, LOWER, LENGTH)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT Statement: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — String Functions (CONCAT, UPPER, LOWER, LENGTH): https://dev.mysql.com/doc/refman/8.0/en/string-functions.html
- MySQL 8.0 Reference Manual — Date and Time Functions (YEAR, DATEDIFF, CURDATE): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — LIMIT Clause: https://dev.mysql.com/doc/refman/8.0/en/select.html#id4651990

## Issues Found
No technical issues found.

## Review Notes
- The `HAVING avg_salary > 70000` example uses a column alias in the HAVING clause. This is a MySQL-specific extension to standard SQL and works correctly in MySQL, but readers should be aware it is not portable to all database systems.
- All SQL syntax is valid for MySQL 5.7+ and 8.0+.
- The clause ordering diagram (SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT) is accurate.
- The `LIMIT offset, count` and `LIMIT count OFFSET offset` syntaxes are both correctly demonstrated.
