# Validation Summary: How to Use ASC and DESC in MySQL ORDER BY

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ for descending index features)
- SQL ORDER BY clause
- MySQL B-tree indexes
- MySQL EXPLAIN query analysis

## Sources Consulted
- MySQL 8.0 Reference Manual: ORDER BY Optimization — https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: Descending Indexes — https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html
- MySQL 8.0 Reference Manual: Working with NULL Values — https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: Date and Time Functions (TIMESTAMPDIFF, MONTH) — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that MySQL 8.0 introduced true descending indexes. Prior to 8.0, the DESC keyword in index definitions was parsed but ignored, meaning all indexes were effectively ascending. This is an important version-specific caveat that the post handles well.
- The NULL sorting behavior described (NULLs first in ASC, last in DESC) is accurate for MySQL specifically. Other databases (e.g., PostgreSQL, Oracle) have different default NULL sorting behavior, but since the post is MySQL-focused this is not an issue.
- The `(due_date IS NULL) ASC` workaround for forcing NULLs last is a clean and correct technique.
- All SQL examples use valid syntax and would execute correctly against appropriate table schemas.
