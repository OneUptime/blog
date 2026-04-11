# Validation Summary: How to Use Multiple CTEs in a Single Query in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (Common Table Expressions / CTEs)
- SQL (WITH clause, recursive CTEs, window functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual: Optimizing Derived Tables, View References, and Common Table Expressions with Merging or Materialization — https://dev.mysql.com/doc/refman/8.0/en/derived-table-optimization.html

## Issues Found
1. **Incorrect CTE materialization note** (line 147): The post stated "If a CTE is referenced multiple times and the optimizer does not cache it, it may be evaluated more than once." This is incorrect. Per MySQL documentation, when a CTE is referenced multiple times, MySQL always materializes it into a temporary table once and shares the result across all references — it is never re-evaluated. The note was rewritten to accurately describe MySQL's materialization behavior: multi-reference CTEs are materialized once, while single-reference CTEs may be merged into the outer query by the optimizer.

## Review Notes
- The "Reusing a CTE Multiple Times" section title implies the example will demonstrate referencing a CTE from multiple places, but the provided SQL only references `order_stats` once (in the JOIN). The SQL itself is valid, but the example could better illustrate the section's concept by actually referencing the CTE in multiple locations (e.g., a self-join or subquery).
- All code examples assume MySQL 8.0+, which is when CTE support was introduced. This is not stated explicitly in the post; a version note could be helpful for readers on older MySQL versions.
- The use of column aliases (`yr`, `mo`) in GROUP BY is MySQL-specific behavior and may not be portable to other SQL dialects.
