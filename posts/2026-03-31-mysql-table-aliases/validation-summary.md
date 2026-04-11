# Validation Summary: How to Use Table Aliases in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (table aliases, JOIN syntax, subqueries, self-joins)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT Statement: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — Derived Tables (Subqueries in FROM): https://dev.mysql.com/doc/refman/8.0/en/derived-tables.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples are syntactically correct and use standard MySQL syntax.
- The claim that `AS` is optional for table aliases is accurate per the MySQL reference manual.
- The requirement that derived tables (subqueries in FROM) must have an alias is MySQL-specific and correctly stated — omitting it produces error 1248.
- The self-join example correctly uses LEFT JOIN to handle employees without managers.
- The post is version-agnostic; all described behavior applies to MySQL 5.x through 8.x and 9.x.
