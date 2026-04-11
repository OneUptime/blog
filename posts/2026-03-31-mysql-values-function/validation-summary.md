# Validation Summary: How to Use VALUES Statement in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (specifically 8.0.19+)
- SQL VALUES statement (standalone table value constructor)
- SQL derived tables, UNION, JOIN

## Sources Consulted
- MySQL 8.0 VALUES Statement reference: https://dev.mysql.com/doc/refman/8.0/en/values.html
- MySQL 8.0.19 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-19.html
- MySQL 8.0.21 Release Notes (LIMIT bug fix): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-21.html
- MySQL 8.0 Derived Tables: https://dev.mysql.com/doc/refman/8.0/en/derived-tables.html
- MySQL 8.0 JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html

## Issues Found
- **LIMIT caveat missing**: The post originally implied `LIMIT` works with `VALUES` from MySQL 8.0.19. In reality, `LIMIT` was syntactically accepted but silently ignored in MySQL 8.0.19 and 8.0.20 (Bug #30602659). It was fixed in MySQL 8.0.21. Added a note clarifying this in the "Basic Usage" section.

## Review Notes
- All code examples are syntactically correct and use valid MySQL 8.0 features.
- The derived table column aliasing syntax `AS v(col1, col2)` is correctly used and available in MySQL 8.0.
- The mention of "INSERT ... TABLE" in the "Inserting with VALUES Constructor" section is slightly ambiguous (INSERT ... TABLE is a separate feature), but the accompanying code example correctly demonstrates INSERT ... SELECT from a VALUES-based derived table, so this is a clarity nit rather than a technical error.
- The VALUES statement is still supported in the latest MySQL versions and is not deprecated.
