# Validation Summary: MySQL Trigger Syntax Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- MySQL (trigger syntax, BEFORE/AFTER triggers, NEW/OLD references, trigger management)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: SHOW TRIGGERS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html
- MySQL 8.0 Reference Manual: SIGNAL Statement — https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual: Server System Variables — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Trigger Syntax and Examples — https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html

## Issues Found

1. **`@@trigger_depth` is not a valid MySQL system variable.** The "Preventing Recursive Triggers" section used `@@trigger_depth` to check the current nesting level, but MySQL does not expose such a system variable. Replaced the example with the standard approach of using a user-defined session variable (`@trigger_running`) as a guard flag to prevent recursive/cascading trigger execution.

2. **`SHOW TRIGGERS LIKE 'orders%'` was misleading.** The `LIKE` clause in `SHOW TRIGGERS` filters by **table name**, not trigger name. Added a clarifying comment (`-- LIKE filters by table name, not trigger name`) to prevent readers from misinterpreting the filter target.

## Review Notes
- All other SQL examples (BEFORE/AFTER INSERT, UPDATE, DELETE) are syntactically correct and use proper MySQL trigger conventions.
- The NEW/OLD reference table is accurate.
- The FOLLOWS/PRECEDES clause for multiple triggers is correctly noted as a MySQL 5.7+ feature.
- The AFTER DELETE example uses `DELETE FROM order_items WHERE order_id = OLD.id` which works but in practice this pattern is often better handled by foreign key ON DELETE CASCADE constraints. This is a design preference, not a technical error.
- The summary section's claims are all accurate.
