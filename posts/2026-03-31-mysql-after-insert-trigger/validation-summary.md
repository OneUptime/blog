# Validation Summary: How to Create an AFTER INSERT Trigger in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (AFTER INSERT triggers, DELIMITER, SHOW TRIGGERS, DROP TRIGGER)
- SQL (CREATE TABLE, INSERT, ON DUPLICATE KEY UPDATE)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual — SHOW TRIGGERS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html
- MySQL 8.0 Reference Manual — Trigger Syntax and Examples: https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html
- MySQL 8.0 Reference Manual — Restrictions on Triggers: https://dev.mysql.com/doc/refman/8.0/en/trigger-restrictions.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html

## Issues Found
1. **Misleading use of "committed" in opening paragraph**: The original text stated the trigger runs "after the row is committed to the table," which incorrectly implies the transaction has been committed. AFTER INSERT triggers fire after the row is written to the table but still within the same transaction — the row is not yet committed. This contradicted the post's own Limitations section, which correctly notes that a trigger error causes the INSERT to roll back. Fixed to: "after the row is written to the table (but still within the same transaction)."

## Review Notes
- The `DEFAULT NOW()` syntax on the DATETIME column works in MySQL 8.0.13+ (expression defaults). For broader compatibility with older MySQL versions, `DEFAULT CURRENT_TIMESTAMP` would be more portable, but this is not an error for current MySQL versions.
- All SQL examples are syntactically correct and use proper DELIMITER handling for multi-statement trigger bodies.
- The `SHOW TRIGGERS LIKE 'orders'` correctly filters by table name (not trigger name), per MySQL documentation.
