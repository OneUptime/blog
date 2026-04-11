# Validation Summary: How to Use ORDER BY in MySQL to Sort Results

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (DML / SELECT statements)
- ORDER BY clause (ASC, DESC, expressions, aliases, CASE, NULL handling)

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: ORDER BY Optimization — https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html
- MySQL 8.0 Reference Manual: Working with NULL Values — https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual: Derived Tables — https://dev.mysql.com/doc/refman/8.0/en/derived-tables.html

## Issues Found
No technical issues found.

## Review Notes
- All query output results were verified against the sample data and are correct.
- The NULL ordering behavior (NULLs first in ASC) and the `IS NULL` trick to push NULLs last are accurately described.
- The note about ORDER BY in subqueries being stripped without LIMIT is correct for MySQL 8.0+. Strictly speaking, the outer SELECT in the subquery example also lacks an ORDER BY, so the final result order is not SQL-standard guaranteed — but this matches common MySQL practice and the post's point about needing LIMIT is the key takeaway.
- The best practice about functional indexes not being usable with `ORDER BY YEAR(col)` is accurate as a general guideline, though MySQL 8.0.13+ supports functional indexes that could cover such cases. This is a minor nuance that doesn't warrant a change.
