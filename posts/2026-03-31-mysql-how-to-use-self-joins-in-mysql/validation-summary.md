# Validation Summary: How to Use Self Joins in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (Self Joins, LEFT JOIN, INNER JOIN, DATE_SUB, GROUP BY, HAVING, subqueries/derived tables)

## Sources Consulted
- MySQL 8.0 Reference Manual: JOIN Clause — https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual: SELECT Statement (HAVING clause and column alias usage) — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: Date and Time Functions (DATE_SUB) — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual: CREATE TABLE and Foreign Key Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html

## Issues Found
No technical issues found.

## Review Notes
- The "Self Join with Aggregation" section uses a derived table (subquery) joined to the base table rather than a traditional self join (two aliased instances of the same table). The SQL is correct and functional, but it stretches the definition of "self join" slightly. This is a pedagogical categorization choice rather than a technical error.
- The "Finding Employees Earning More Than Their Manager" example would return zero rows with the provided sample data since no employee earns more than their manager. The SQL pattern itself is correct.
- The `HAVING copies > 1` syntax relies on MySQL's extension that allows column aliases in HAVING clauses. This is correctly used in a MySQL-specific tutorial, but readers should be aware it is non-standard SQL.
- The recommendation to use recursive CTEs for deep hierarchies is appropriate for MySQL 8.0+.
