# Validation Summary: How to Use JOIN with Aggregate Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8
- SQL JOINs (INNER JOIN, LEFT JOIN)
- Aggregate functions (COUNT, SUM, AVG, MIN, MAX, COUNT DISTINCT)
- GROUP BY and HAVING clauses
- ONLY_FULL_GROUP_BY SQL mode

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: Aggregate Functions — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
- MySQL 8.0 Reference Manual: GROUP BY Handling — https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- MySQL 8.0 Reference Manual: MySQL Handling of GROUP BY (functional dependencies) — https://dev.mysql.com/doc/refman/8.0/en/group-by-functional-dependence.html
- MySQL 8.0 Reference Manual: JOIN Clause — https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual: DATEDIFF — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_datediff

## Issues Found
1. **Incorrect GROUP BY "wrong" example**: The original "wrong" example grouped by `c.customer_id, c.name` and selected `c.region`, claiming this would violate ONLY_FULL_GROUP_BY. However, since `customer_id` is the PRIMARY KEY of the `customers` table, MySQL 8's ONLY_FULL_GROUP_BY mode recognises that `c.region` is functionally dependent on the primary key and would NOT raise an error. The example was changed to group by `c.region` alone (a non-key column), so that selecting `c.name` genuinely violates the rule — `c.name` is not functionally dependent on `c.region`. The accompanying explanation was also updated to mention functional dependency detection from primary keys.

## Review Notes
- The summary paragraph advises "always include all non-aggregated SELECT columns in GROUP BY." While this is technically an oversimplification (functional dependencies from PKs make some omissions valid), it is safe general advice and was left as-is.
- The HAVING clause example uses a column alias (`total_spent`) which is a MySQL-specific extension to SQL. This works in MySQL but would not be portable to all databases. Not changed since the post is MySQL-specific.
- All SQL queries are syntactically correct and use current, non-deprecated MySQL 8 features.
