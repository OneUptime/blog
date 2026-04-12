# Validation Summary: How to Create a BEFORE INSERT Trigger in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+ and 8.0)
- SQL triggers (BEFORE INSERT)
- SIGNAL/SQLSTATE error handling
- DELIMITER usage in mysql client

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement (https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html)
- MySQL 8.0 Reference Manual: SIGNAL Statement (https://dev.mysql.com/doc/refman/8.0/en/signal.html)
- MySQL 8.0 Reference Manual: SHOW TRIGGERS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html)
- MySQL 8.0 Reference Manual: Trigger Syntax and Examples (https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html)
- MySQL 8.0 Reference Manual: BEFORE INSERT trigger behavior with AUTO_INCREMENT (https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html)

## Issues Found
- **BEFORE vs AFTER INSERT comparison table — misleading SIGNAL behavior for AFTER INSERT**: The table stated "YES (but row already written)" for SIGNAL in AFTER INSERT triggers. This is misleading because when SIGNAL is raised in an AFTER INSERT trigger on InnoDB, the entire statement is rolled back and the row does not persist. Changed to "YES (statement rolls back)" to accurately reflect that SIGNAL in an AFTER INSERT trigger prevents the insert from being committed.

## Review Notes
- The Example 3 (Audit Log) correctly notes that `NEW.id` will be 0 for AUTO_INCREMENT columns in a BEFORE INSERT trigger, and recommends using AFTER INSERT for audit logging. This is good guidance.
- The name-capitalization trigger in the Multiple Triggers section only capitalizes the first character of the entire string, not each word. For multi-word names like "alice smith" it would produce "Alice smith" rather than "Alice Smith". This is not a bug — the example is illustrative of trigger ordering — but readers adapting this code for production should be aware.
- All SQL syntax is correct and uses current MySQL 8.0 conventions.
- The `SHOW TRIGGERS LIKE 'employees'` command is correct — the LIKE clause in SHOW TRIGGERS matches table names, not trigger names, per MySQL documentation.
- SQLSTATE '45000' and error code 1644 are correctly used for user-defined conditions.
