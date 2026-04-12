# Validation Summary: How to Drop a Foreign Key Constraint in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (DDL, ALTER TABLE, foreign key constraints)
- INFORMATION_SCHEMA system views
- MySQL session variables (FOREIGN_KEY_CHECKS)

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: CREATE TABLE Foreign Key Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA KEY_COLUMN_USAGE Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html
- MySQL 8.0 Reference Manual: Server System Variables (foreign_key_checks) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_foreign_key_checks

## Issues Found
1. **Schema migration example had mismatched column types**: The migration pattern showed changing `orders.customer_id` from `INT` to `BIGINT UNSIGNED` without also changing `customers.customer_id`. MySQL requires that foreign key referencing and referenced columns have identical data types. The `ADD CONSTRAINT` step would fail with `ERROR 3780 (HY000): Referencing column and referenced column are incompatible`. Fixed by adding an `ALTER TABLE customers MODIFY customer_id BIGINT UNSIGNED NOT NULL;` step before modifying the child table column, and updated the comment to reflect that both columns are being modified.

## Review Notes
- The post correctly highlights that MySQL does not automatically drop the supporting index when a foreign key is dropped — this is a commonly missed detail.
- The `FOREIGN_KEY_CHECKS` section appropriately warns about using it sparingly. Worth noting that if the session disconnects unexpectedly while checks are disabled, other sessions are unaffected since it is a session-scoped variable by default.
- All SQL syntax is valid for MySQL 5.7+ and 8.0+.
