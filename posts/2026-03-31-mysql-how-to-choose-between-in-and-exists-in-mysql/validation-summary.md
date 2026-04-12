# Validation Summary: How to Choose Between IN and EXISTS in MySQL

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- MySQL (general, with notes on 8.0+ optimizer behavior)
- SQL subqueries (IN, EXISTS, NOT IN, NOT EXISTS)
- EXPLAIN / EXPLAIN ANALYZE

## Sources Consulted
- MySQL 8.0 Reference Manual: Optimizing Subqueries with Semi-Join Transformations — https://dev.mysql.com/doc/refman/8.0/en/semijoins.html
- MySQL 8.0 Reference Manual: Subquery Optimization — https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization.html
- MySQL 8.0 Reference Manual: INSERT Syntax — https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual: EXPLAIN ANALYZE — https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual: Comparison Operators (IN, EXISTS) — https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html

## Issues Found
- **Line 73 — SQL syntax error in INSERT statement**: `INSERT INTO B VALUES (1), (2), NULL);` had mismatched parentheses. The multi-row `VALUES` clause requires each value to be wrapped in parentheses. Fixed to `INSERT INTO B VALUES (1), (2), (NULL);`.

## Review Notes
- The description of IN as "evaluated ONCE" (line 28) is a reasonable simplification for modern MySQL but worth noting that pre-5.6 MySQL could execute IN subqueries as dependent (correlated) subqueries, which was a well-known performance pitfall. The post mitigates this by noting MySQL 8.0+ semi-join optimizations later.
- `EXPLAIN ANALYZE` was introduced specifically in MySQL 8.0.18, not the initial 8.0 release. The post's "MySQL 8.0+" phrasing is close enough for a general guide.
- The NULL trap explanation for NOT IN is accurate and well-presented — this is genuinely one of the most common MySQL pitfalls.
- All SQL examples are syntactically correct (after the fix) and demonstrate the concepts accurately.
