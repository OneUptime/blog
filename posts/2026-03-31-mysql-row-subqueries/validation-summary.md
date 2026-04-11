# Validation Summary: How to Use Row Subqueries in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (row subqueries, row constructors, composite key comparisons)
- SQL (subqueries, aggregate functions, comparison operators)

## Sources Consulted
- MySQL 8.0 Reference Manual: Row Subqueries — https://dev.mysql.com/doc/refman/8.0/en/row-subqueries.html
- MySQL 8.0 Reference Manual: Row Constructor Expressions — https://dev.mysql.com/doc/refman/8.0/en/row-constructor-optimization.html
- MySQL 8.0 Reference Manual: Comparison Functions and Operators — https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html
- MySQL 8.0 Reference Manual: GROUP BY Handling — https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html

## Issues Found

1. **Misleading comments in basic example**: The SQL comments said "Find the reading for each sensor's most recent timestamp" and "returns (sensor_id, max recorded_at) as one row per sensor", but the query only filters for `sensor_id = 1`. Fixed the comments to accurately describe the query's behavior.

2. **Incorrect section title "Row subquery with a correlated outer query"**: The subquery in this section does not reference the outer query (alias `e`), so it is not a correlated subquery. It is a self-contained subquery using `ORDER BY ... LIMIT 1`. Renamed the section to "Row subquery with ORDER BY and LIMIT".

3. **Error example would not produce the described error**: The original subquery `SELECT sensor_id, MAX(recorded_at) FROM sensor_readings` without a `GROUP BY` clause is an aggregate query that returns a single row. With MySQL's default `ONLY_FULL_GROUP_BY` SQL mode, this query would produce a different error (non-aggregated column not in GROUP BY). Without that mode, it returns one row with an indeterminate `sensor_id`. Added `GROUP BY sensor_id` to the subquery so it correctly returns multiple rows and triggers the "subquery returns more than one row" error as intended.

## Review Notes
- The lexicographic comparison explanation for `<`, `>` operators on row constructors is correct: MySQL evaluates `(a, b) < (x, y)` as `(a < x) OR ((a = x) AND (b < y))`.
- The equivalence between row subquery form and AND form in the comparison section is correct.
- All CREATE TABLE statements and INSERT statements are syntactically valid MySQL.
