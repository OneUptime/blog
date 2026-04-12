# Validation Summary: How to Use Correlated Subqueries in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SQL syntax, correlated subqueries, JOINs, derived tables)
- SQL aggregate functions (AVG, SUM, MAX)
- MySQL query optimization (EXPLAIN, EXPLAIN ANALYZE, semi-join transformations)

## Sources Consulted
- MySQL 8.0 Reference Manual: Correlated Subqueries — https://dev.mysql.com/doc/refman/8.0/en/correlated-subqueries.html
- MySQL 8.0 Reference Manual: Optimizing Subqueries with Semi-Join Transformations — https://dev.mysql.com/doc/refman/8.0/en/semijoins.html
- MySQL 8.0 Reference Manual: EXPLAIN ANALYZE — https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual: ROUND Function — https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_round
- Manual verification of all query outputs against the sample data

## Issues Found

1. **Example 1 output (department average query): Wrong row order.** The `ORDER BY d.name` sorts alphabetically, so Finance (F) must appear before Marketing (M). The original output had Marketing before Finance. Fixed by swapping the Grace/Finance and Eve/Marketing rows.

2. **Example 2 output (most recent hire query): Wrong employee and wrong order.** The most recent hire in Marketing is Bob (2021-06-01), not Eve (2020-09-05). Additionally, the ORDER BY d.name ordering was wrong — Marketing appeared before Finance. Fixed by changing Eve to Bob with the correct hire_date, and reordering so Finance appears before Marketing.

3. **Example 3 output (percentage of department budget query): Wrong row order.** Same alphabetical ordering issue — Finance rows should appear before Marketing rows. Fixed by swapping the Finance and Marketing row groups.

## Review Notes
- All SQL syntax is correct and uses standard MySQL features.
- The percentage calculations in Example 3 were verified manually and are accurate.
- The JOIN rewrite in the performance section is a correct equivalent of the correlated subquery version.
- The best practices section correctly notes that EXPLAIN ANALYZE is available (MySQL 8.0.18+) and that MySQL 8.0 can optimize correlated subqueries into semi-joins.
- The Mermaid sequence diagram is a reasonable conceptual illustration of correlated subquery execution.
