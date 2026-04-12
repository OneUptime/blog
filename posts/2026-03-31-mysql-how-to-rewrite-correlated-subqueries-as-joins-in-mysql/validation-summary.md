# Validation Summary: How to Rewrite Correlated Subqueries as JOINs in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (general, with notes on 8.0+ optimizer improvements)
- SQL query optimization (correlated subqueries, JOINs, derived tables)
- MySQL EXPLAIN and EXPLAIN FORMAT=JSON
- MySQL optimizer hints (NO_SEMIJOIN)

## Sources Consulted
- MySQL 8.0 Reference Manual: Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions — https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization.html
- MySQL 8.0 Reference Manual: Optimizing Subqueries with Semi-Join Transformations — https://dev.mysql.com/doc/refman/8.0/en/semijoins.html
- MySQL 8.0 Reference Manual: Optimizer Hints — https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: EXPLAIN Statement — https://dev.mysql.com/doc/refman/8.0/en/explain.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples are syntactically correct and semantically equivalent between the correlated and JOIN versions.
- The EXPLAIN output example is simplified (omitting some columns like `possible_keys`, `key`, `rows`, etc.) but accurately demonstrates the `DEPENDENT SUBQUERY` indicator. This is acceptable for a tutorial.
- The `/*+ NO_SEMIJOIN() */` hint is shown as a brief snippet with `...` placeholder. In practice, users would need to include their full query. The hint placement in the outer SELECT is valid per MySQL docs (it applies to subqueries in the query block).
- The post correctly notes that MySQL 8.0+ may auto-optimize some correlated subqueries, which is an important caveat that prevents readers from blindly rewriting all subqueries.
- The COALESCE usage in the SELECT clause rewrite correctly handles NULL values for customers without orders — a detail that is easy to get wrong.
