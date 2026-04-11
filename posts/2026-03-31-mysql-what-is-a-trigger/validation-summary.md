# Validation Summary: What Is a Trigger in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (triggers, DML events, SIGNAL/SQLSTATE, audit logging)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement (https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html)
- MySQL 8.0 Reference Manual: Trigger Restrictions (https://dev.mysql.com/doc/refman/8.0/en/trigger-restrictions.html)
- MySQL 8.0 Reference Manual: SIGNAL Statement (https://dev.mysql.com/doc/refman/8.0/en/signal.html)
- MySQL 8.0 Reference Manual: Server System Variables (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)

## Issues Found

1. **Incorrect claim about OUT parameters in triggers**: The post stated that triggers cannot call stored procedures with `OUT` parameters. This is inaccurate. The actual MySQL restriction is that triggers cannot call stored procedures that return data to the client (e.g., via unbuffered SELECT statements). Stored procedures with OUT parameters can be called from triggers. Fixed by changing the wording to "stored procedures that return data to the client."

2. **Non-existent `@@trigger_recursion_depth` system variable**: The post referenced a `@@trigger_recursion_depth` system variable with a default of 0. This variable does not exist in MySQL. MySQL prevents recursive trigger execution by design — a trigger cannot activate itself. This is not configurable. Fixed by replacing the claim with a statement that MySQL prevents recursive trigger execution by design.

## Review Notes
- The `!=` operator used in the audit trigger (`OLD.status != NEW.status`) will not detect transitions involving NULL values (e.g., NULL to a non-NULL value), since NULL comparisons with `!=` return NULL rather than TRUE. Using `NOT (OLD.status <=> NEW.status)` would be more robust, but this is a best-practice note, not a correctness error in the context of this tutorial.
- All SQL syntax (DELIMITER, CREATE TRIGGER, FOR EACH ROW, SIGNAL SQLSTATE, SHOW TRIGGERS, DROP TRIGGER) is correct and current for MySQL 8.0.
- The six trigger types listed are correct and complete.
- The use of `SET NEW.column = value` inside a BEFORE trigger is correctly demonstrated (this is only valid in BEFORE triggers, not AFTER triggers, and the post correctly uses it in a BEFORE UPDATE trigger).
