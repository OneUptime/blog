# Validation Summary: How to Create and Use Triggers in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (triggers, stored programs, DML events)
- SQL (CREATE TRIGGER, SIGNAL SQLSTATE, DELIMITER, SHOW TRIGGERS)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual — Trigger Syntax and Examples: https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html
- MySQL 8.0 Reference Manual — SIGNAL Statement: https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual — SHOW TRIGGERS: https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html
- MySQL 8.0 Reference Manual — Server System Variables (verified `trigger_recursion_depth` does not exist): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — innodb_autoinc_lock_mode: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_autoinc_lock_mode

## Issues Found

### 1. Mermaid diagram showed an infinite loop and incorrect flow
**What was wrong:** The flowchart arrow from the BEFORE trigger node (D) looped back to the "MySQL executes the DML" node (B), creating a visual infinite loop. Additionally, it presented BEFORE and AFTER triggers as mutually exclusive paths, when in reality a table can have both for the same event.
**What was changed:** Replaced the diagram with a corrected sequential flow: check for BEFORE trigger -> run it if present -> apply the DML change -> check for AFTER trigger -> run it if present -> continue.
**Why:** The original diagram would mislead readers into thinking BEFORE triggers cause the DML to re-execute in a loop, and that BEFORE and AFTER triggers cannot coexist for the same event.

### 2. Best Practices bullet referenced non-existent/irrelevant MySQL variables
**What was wrong:** The bullet about recursive triggers referenced `innodb_autoinc_lock_mode` (which controls AUTO_INCREMENT locking behavior, not trigger recursion) and `trigger_recursion_depth` (which does not exist as a MySQL system variable). It also implied MySQL supports recursive triggers with the right configuration, which is incorrect — MySQL prevents a trigger from activating itself recursively by design.
**What was changed:** Rewrote the bullet to accurately describe cascading triggers (triggers across different tables) as the actual concern, and noted that MySQL prevents self-recursive trigger activation.
**Why:** The original text contained two factual errors (wrong variable purpose, invented variable) and a misleading implication that recursive triggers are possible in MySQL with configuration changes.

## Review Notes
- All SQL code examples (CREATE TABLE, CREATE TRIGGER, INSERT, UPDATE, DELETE, SELECT) are syntactically correct and would work as described.
- The use of DELIMITER, NEW/OLD references, SIGNAL SQLSTATE, USER(), and SHOW CREATE TRIGGER are all accurate per MySQL documentation.
- The Special Row References table correctly documents when NEW and OLD are available.
- The note about modifying NEW.column values only in BEFORE triggers is correct.
- The BEFORE UPDATE trigger example correctly demonstrates both validation (SIGNAL) and value modification (SET NEW.last_modified) in the same trigger.
- Sample output values are illustrative (timestamps will vary at runtime) but structurally accurate.
