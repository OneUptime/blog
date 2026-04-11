# Validation Summary: How to Sort Results with ORDER BY in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (ORDER BY clause)
- SQL (SELECT, LIMIT, EXPLAIN, CASE expressions)

## Sources Consulted
- MySQL 8.0 Reference Manual — ORDER BY Optimization: https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html
- MySQL 8.0 Reference Manual — SELECT Statement: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — Working with NULL Values: https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — Derived Tables (subquery ORDER BY behavior): https://dev.mysql.com/doc/refman/8.0/en/derived-tables.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples are syntactically correct and demonstrate valid MySQL behavior.
- The NULL sorting behavior description is accurate: MySQL treats NULL as less than any non-NULL value (first in ASC, last in DESC).
- The NULL workaround using `ORDER BY bonus IS NULL ASC, bonus ASC` is a correct and commonly used technique.
- The note about ORDER BY being ignored in subqueries without LIMIT is accurate for MySQL 8.0+, where the optimizer may remove such ORDER BY clauses.
- Column position references in ORDER BY (e.g., `ORDER BY 2`) are valid but deprecated in the SQL standard; the post correctly notes this is less readable.
- The CONCAT example's SELECT list includes `name, first_name, last_name` which implies a slightly unusual schema, but the SQL itself is valid and the sorting concept is correctly demonstrated.
