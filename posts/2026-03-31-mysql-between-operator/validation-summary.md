# Validation Summary: How to Use the BETWEEN Operator in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (BETWEEN operator, NOT BETWEEN, DATETIME handling, EXPLAIN, HAVING clause)

## Sources Consulted
- MySQL 8.0 Reference Manual: Comparison Functions and Operators — BETWEEN ... AND (https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html#operator_between)
- MySQL 8.0 Reference Manual: Date and Time Literals (https://dev.mysql.com/doc/refman/8.0/en/date-and-time-literals.html)
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- MySQL 8.0 Reference Manual: SELECT Statement — HAVING clause (https://dev.mysql.com/doc/refman/8.0/en/select.html)

## Issues Found
No technical issues found.

## Review Notes
- The string BETWEEN example uses `BETWEEN 'A' AND 'Mzzz'` to match last names starting A through M. This is a common tutorial pattern but is slightly imprecise — any name sorting after 'Mzzz' but before 'N' (e.g., a hypothetical 'Mzzzz') would be excluded. A more robust approach for production code would be `last_name >= 'A' AND last_name < 'N'`. This is a minor pedagogical trade-off, not a technical error, since the post is demonstrating BETWEEN syntax.
- The HAVING clause example uses a column alias (`avg_salary`) directly in HAVING, which is a MySQL-specific extension not available in all SQL databases. This is fine for a MySQL-focused post but readers porting queries to other databases (PostgreSQL, SQL Server) should be aware they would need to repeat the expression: `HAVING AVG(salary) BETWEEN 50000 AND 80000`.
- All SQL syntax is correct and all technical claims are accurate per MySQL 8.0 documentation.
