# Validation Summary: How to Design a Schema for Role-Based Access Control in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, DML, foreign keys, constraints, recursive CTEs)
- Role-Based Access Control (RBAC) schema design
- SQL query patterns for permission checking

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: FOREIGN KEY Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual: Data Type Default Values — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual: INSERT ... SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/insert-select.html
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html

## Issues Found
No technical issues found.

## Review Notes
- The `granted_by` column in `user_roles` lacks a foreign key constraint back to `users(id)`. This is a design choice (allows system/automated grants without a corresponding user row) rather than a technical error, but readers implementing strict referential integrity may want to add one.
- The seeding INSERT uses implicit join syntax (`FROM roles r, permissions p`) which is valid but older style. Modern SQL style prefers explicit `CROSS JOIN`, though this is a stylistic preference, not an error.
- The hierarchical roles section mentions recursive CTEs without showing the actual query. This is acceptable for brevity but readers will need to look up `WITH RECURSIVE` syntax for MySQL 8.0+ to implement it.
- `DATETIME DEFAULT CURRENT_TIMESTAMP` requires MySQL 5.6.5+. Readers on very old MySQL versions would need to use `TIMESTAMP` instead, but MySQL 5.7 reached EOL in October 2023 so this is not a practical concern.
