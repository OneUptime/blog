# Validation Summary: How to Use Derived Tables Effectively in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL (derived tables / inline views)
- Common Table Expressions (CTEs)

## Sources Consulted
- MySQL 8.0 Reference Manual: Derived Tables — https://dev.mysql.com/doc/refman/8.0/en/derived-tables.html
- MySQL 8.0 Reference Manual: Optimizing Derived Tables — https://dev.mysql.com/doc/refman/8.0/en/derived-table-optimization.html
- MySQL 8.0 Reference Manual: Aggregate Functions — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual: UPDATE Syntax — https://dev.mysql.com/doc/refman/8.0/en/update.html

## Issues Found
1. **`PERCENTILE_CONT` is not a MySQL function** (Multi-Step Transformation section, lines 96-101): The example used `PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price)` syntax, which is available in PostgreSQL, Oracle, and SQL Server but does **not** exist in MySQL. Replaced with `AVG(price) + STDDEV(price)` and `AVG(price)` as threshold calculations, which are valid MySQL aggregate functions and still demonstrate the CROSS JOIN derived table pattern effectively.

## Review Notes
- The "Derived Tables in UPDATE and DELETE" section title mentions DELETE but only provides an UPDATE example. This is not technically incorrect (the claim that derived tables work in DELETE is true), but a DELETE example is absent.
- The Performance Considerations section references looking for `"pushed_down_conds"` in EXPLAIN FORMAT=JSON output. The actual JSON key names may vary by MySQL minor version; users may need to look for `"attached_condition"` or examine `SHOW WARNINGS` after EXPLAIN to see the rewritten query. The concept described is correct (derived condition pushdown was introduced in MySQL 8.0.14).
- All other SQL examples use valid MySQL syntax and correctly demonstrate derived table concepts.
