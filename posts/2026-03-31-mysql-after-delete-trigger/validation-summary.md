# Validation Summary: How to Create an AFTER DELETE Trigger in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (triggers, AFTER DELETE, BEFORE DELETE, DELIMITER, SIGNAL, USER(), NOW())
- SQL DDL (CREATE TRIGGER, DROP TRIGGER, SHOW TRIGGERS, SHOW CREATE TRIGGER)
- SQL DML (DELETE, INSERT, UPDATE within triggers)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual — Trigger Syntax and Examples: https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html
- MySQL 8.0 Reference Manual — SHOW TRIGGERS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html
- MySQL 8.0 Reference Manual — SHOW CREATE TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/show-create-trigger.html
- MySQL 8.0 Reference Manual — DROP TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/drop-trigger.html
- MySQL 8.0 Reference Manual — Information Functions (USER()): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_user

## Issues Found
No technical issues found.

## Review Notes
- The basic syntax block omits the DELIMITER boilerplate for clarity, which is a common documentation convention. All runnable examples correctly use DELIMITER.
- The BEFORE DELETE vs AFTER DELETE comparison table is a useful addition. Archiving is listed under BEFORE DELETE, which is the conventional recommendation since a failure during archiving would prevent the deletion from proceeding.
- The `SHOW TRIGGERS LIKE 'orders'` command filters by table name (not trigger name), which is correct here since the trigger is defined on the `orders` table. This could potentially confuse readers unfamiliar with the LIKE clause behavior, but it is technically accurate.
- The `product_count` counter in Example 2 could go negative if the count is not properly maintained, but that is a data integrity concern outside the scope of the trigger tutorial.
