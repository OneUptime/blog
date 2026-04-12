# Validation Summary: How to Use CREATE TRIGGER Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+ and 8.0)
- MySQL Triggers (CREATE TRIGGER, DROP TRIGGER, SHOW TRIGGERS)
- SIGNAL/SQLSTATE error handling
- DELIMITER usage for multi-statement bodies

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement (https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html)
- MySQL 8.0 Reference Manual: Trigger Syntax and Examples (https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html)
- MySQL 8.0 Reference Manual: Trigger Restrictions (https://dev.mysql.com/doc/refman/8.0/en/stored-program-restrictions.html)
- MySQL 8.0 Reference Manual: SHOW TRIGGERS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html)
- MySQL 8.0 Reference Manual: SIGNAL Statement (https://dev.mysql.com/doc/refman/8.0/en/signal.html)

## Issues Found
1. **Incorrect description for AFTER DELETE example**: The section described the AFTER DELETE trigger as logging rows "before they are removed," but an AFTER DELETE trigger fires after the row has been deleted. Changed "before" to "after."

2. **Incorrect trigger limitation about cascading triggers**: The post stated "Triggers do not fire for changes made by other triggers (no recursive trigger chains by default)." This is wrong — MySQL fully supports cascading triggers (a trigger on table A can cause an INSERT on table B, firing table B's triggers). The actual restriction is that a trigger cannot modify a table already in use by the invoking statement. Corrected the limitation to accurately describe this behavior.

## Review Notes
- The SIGNAL SQLSTATE '45000' usage is correct and is the standard approach for user-defined errors in MySQL 5.5+.
- The FOLLOWS/PRECEDES syntax for multiple triggers is correctly noted as a MySQL 5.7+ feature.
- The SHOW TRIGGERS LIKE clause correctly filters by table name, matching the comment's intent.
- All SQL syntax examples are syntactically correct and follow MySQL conventions.
- The OLD/NEW pseudo-row explanations are accurate: NEW is writable in BEFORE triggers and read-only in AFTER triggers.
