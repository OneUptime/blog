# Validation Summary: How to Optimize UNION Queries in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (UNION, UNION ALL, EXPLAIN, query optimization)
- SQL query syntax and indexing

## Sources Consulted
- MySQL 8.0 Reference Manual: UNION Clause — https://dev.mysql.com/doc/refman/8.0/en/union.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions — https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization.html

## Issues Found
1. **UNION with Sorting and LIMIT section was misleading.** The post stated you must "wrap it in a derived table" to sort/limit the entire UNION result, and claimed "Without the wrapper, ORDER BY and LIMIT in each branch apply to that branch only, not the combined result." This is incorrect. Per MySQL documentation, ORDER BY and LIMIT placed after the last SELECT in a UNION apply to the entire combined result — no derived table wrapper is needed. Fixed the section to show the standard syntax (ORDER BY/LIMIT after the final branch) and clarified the behavior of ORDER BY within parenthesized individual SELECT statements.

## Review Notes
- The EXPLAIN output shown uses the traditional format which is accurate for both MySQL 5.7 and 8.0. In MySQL 8.0.18+, `EXPLAIN ANALYZE` is also available for more detailed runtime statistics, but mentioning the traditional format is fine for this context.
- The advice about pushing WHERE conditions into UNION branches is especially relevant for MySQL 5.7. MySQL 8.0.22+ introduced improved derived table condition pushdown, but explicit pushdown remains the safest approach and is still recommended.
- All SQL examples are syntactically correct and demonstrate valid optimization patterns.
