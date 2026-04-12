# Validation Summary: How to Create a BEFORE DELETE Trigger in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (BEFORE DELETE triggers)
- SQL (DDL: CREATE TRIGGER, CREATE TABLE LIKE, ALTER TABLE; DML: INSERT, DELETE, SELECT)
- SIGNAL SQLSTATE for error handling in triggers

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual — Trigger Syntax and Examples: https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html
- MySQL 8.0 Reference Manual — SIGNAL Statement: https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual — SHOW TRIGGERS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html
- MySQL 8.0 Reference Manual — CREATE TABLE ... LIKE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-table-like.html

## Issues Found
- **Example 1 — missing columns on archive table**: The first code block created `orders_archive` with `CREATE TABLE orders_archive LIKE orders;`, which clones only the columns of `orders`. The trigger then attempted `INSERT INTO orders_archive SELECT *, USER() AS deleted_by, NOW() AS deleted_at ...`, which produces two more columns than the table has, causing a column-count mismatch error at runtime. Fixed by adding `ALTER TABLE orders_archive ADD COLUMN deleted_by VARCHAR(100);` and `ALTER TABLE orders_archive ADD COLUMN deleted_at DATETIME;` after the LIKE statement so the table has the required columns before the trigger runs.

## Review Notes
- The basic syntax, SIGNAL usage, OLD pseudo-record behavior, SHOW TRIGGERS, SHOW CREATE TRIGGER, and DROP TRIGGER statements are all correct.
- The `NEW` pseudo-record correctly noted as unavailable in DELETE triggers.
- Error code 1644 shown in the test output for Example 2 is the correct MySQL error code for user-raised SIGNAL conditions.
- The post correctly uses `DELIMITER //` to avoid conflicts with the semicolons inside the trigger body.
- Example 1 reads from the same table (`orders`) within a BEFORE DELETE trigger on that table. This is technically allowed in MySQL (the restriction applies to modifications, not reads), but using `OLD.column` references directly (as shown in the second code block) is the preferred approach. The post's narrative already guides the reader toward the explicit-insert pattern, so no change was needed.
