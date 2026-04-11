# Validation Summary: How to Use TABLE and VALUES Statements in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.19+
- SQL (TABLE statement, VALUES statement)

## Sources Consulted
- [MySQL 8.0 Reference Manual: TABLE Statement](https://dev.mysql.com/doc/refman/8.0/en/table.html)
- [MySQL 8.0 Reference Manual: VALUES Statement](https://dev.mysql.com/doc/refman/8.0/en/values.html)
- [MySQL 8.0 Reference Manual: INSERT Statement](https://dev.mysql.com/doc/refman/8.0/en/insert.html)
- [MySQL 8.0 Reference Manual: Derived Tables](https://dev.mysql.com/doc/refman/8.0/en/derived-tables.html)
- [MySQL 8.0.19 Release Notes](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-19.html)

## Issues Found
- **Line 75: Incorrect row count in comment** — The SQL comment said "Create an inline two-row table" but the VALUES statement contains three rows: `ROW(1, 'alpha'), ROW(2, 'beta'), ROW(3, 'gamma')`. Fixed the comment to say "three-row table".

## Review Notes
- All TABLE statement examples are syntactically correct and match the official MySQL 8.0 documentation (`TABLE tbl [ORDER BY col] [LIMIT n]`).
- All VALUES statement examples correctly use the `ROW()` constructor syntax introduced in MySQL 8.0.19.
- The derived table column alias syntax `AS v(col1, col2)` used in the JOIN example is valid — MySQL 8.0 supports column alias lists for derived tables.
- The `INSERT ... VALUES ROW()` syntax is confirmed valid in MySQL 8.0.19+ as an alternative to the traditional `INSERT ... VALUES ()` form.
- The `INSERT INTO ... TABLE` syntax for copying rows between tables is correct.
- The version claim (MySQL 8.0.19) for the introduction of both TABLE and VALUES statements is accurate.
