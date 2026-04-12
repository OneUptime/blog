# Validation Summary: How to Delete Rows Based on Another Table in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DELETE statement, multi-table DELETE, subqueries, JOINs)
- SQL DML operations

## Sources Consulted
- MySQL 8.0 Reference Manual — DELETE Statement: https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual — Subqueries: https://dev.mysql.com/doc/refman/8.0/en/subqueries.html
- MySQL 8.0 Reference Manual — Optimizing Subqueries with Semi-Join Transformations: https://dev.mysql.com/doc/refman/8.0/en/semijoins.html
- MySQL 8.0 Reference Manual — EXISTS and NOT EXISTS Subqueries: https://dev.mysql.com/doc/refman/8.0/en/exists-and-not-exists-subqueries.html

## Issues Found
No technical issues found.

## Review Notes
- The single-table DELETE examples use table aliases (`DELETE FROM order_items oi ...` and `DELETE FROM audit_logs al ...`). Table aliases in single-table DELETE require MySQL 8.0.16+ (where `[AS] tbl_alias` was added). This is fine for modern MySQL but readers on older versions would need to use the full table name instead of the alias in the WHERE clause.
- The `NOT IN` NULL caveat is correctly called out — this is a common pitfall and the recommended `NOT EXISTS` alternative is appropriate.
- The advice to preview with a matching SELECT before running a DELETE is sound practice.
