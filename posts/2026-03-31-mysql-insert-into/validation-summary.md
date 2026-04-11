# Validation Summary: How to Insert Data into MySQL with INSERT INTO

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (INSERT INTO statement, AUTO_INCREMENT, LAST_INSERT_ID(), transactions)
- SQL (DML — Data Manipulation Language)
- InnoDB storage engine (referenced in diagram)

## Sources Consulted
- MySQL 8.0 Reference Manual — INSERT Statement: https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual — CREATE TABLE: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — LAST_INSERT_ID(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id
- MySQL 8.0 Reference Manual — START TRANSACTION: https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual — Constraints: https://dev.mysql.com/doc/refman/8.0/en/constraint-primary-key.html

## Issues Found

1. **LAST_INSERT_ID() for grace showed wrong value (6 instead of 7).** Tracing the sequential inserts through the post: alice(id=1), bob(2), carol(3), dave(4), eve(5), frank(6), grace(7). The post showed `new_id = 6` but the correct value is `7`. Fixed to `7`.

2. **LAST_INSERT_ID() for henry/iris batch showed wrong value (7 instead of 8).** Following from grace(id=7), henry gets id=8 and iris gets id=9. `LAST_INSERT_ID()` returns the first generated ID of the batch, which is `8`, not `7`. Fixed to `8`.

3. **Duplicate key error message referenced non-existent constraint name `uq_username`.** The CREATE TABLE defines `username VARCHAR(50) NOT NULL UNIQUE` without an explicit constraint name. MySQL automatically names the unique index after the column, so the error key is `users.username`, not `users.uq_username`. Fixed to `users.username`.

## Review Notes
- The Transactions section references `orders` and `order_items` tables that are not defined in the post. This is acceptable as an illustrative example, but readers may find it slightly confusing without a schema definition.
- The statement "If any insert fails, ROLLBACK reverts all changes" could be misread as implying automatic rollback on failure. In MySQL, the application must explicitly issue ROLLBACK; it does not happen automatically unless using handlers or certain client settings. The current wording is acceptable but slightly ambiguous.
- All SQL syntax, MySQL functions, and data types used in the post are current and non-deprecated as of MySQL 8.0/8.4.
