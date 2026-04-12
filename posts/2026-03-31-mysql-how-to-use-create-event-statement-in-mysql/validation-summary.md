# Validation Summary: How to Use CREATE EVENT Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Event Scheduler
- MySQL CREATE EVENT statement
- MySQL ALTER EVENT / DROP EVENT statements
- MySQL INFORMATION_SCHEMA.EVENTS table

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: ALTER EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-event.html
- MySQL 8.0 Reference Manual: Event Scheduler Overview — https://dev.mysql.com/doc/refman/8.0/en/events-overview.html
- MySQL 8.0 Reference Manual: SHOW EVENTS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-events.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA EVENTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-events-table.html
- MySQL 8.0 Reference Manual: DECLARE ... HANDLER Statement — https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html

## Issues Found
- **Incorrect comment for SET GLOBAL**: The comment said "Enable it for the current session" but the command `SET GLOBAL event_scheduler = ON;` sets a server-wide (global) variable, not a session-level one. Changed the comment to "Enable it at runtime" to accurately reflect that this is a global runtime setting.

## Review Notes
- The basic syntax omits `DISABLE ON SLAVE` (or `DISABLE ON REPLICA` in MySQL 8.0.26+) from the `[ENABLE | DISABLE]` clause. This is acceptable for a tutorial aimed at general usage.
- The basic syntax omits the optional `DEFINER` clause, which is a reasonable simplification.
- The two one-time event examples both use the name `one_time_cleanup`. In practice the first would need to be dropped before creating the second, but as independent illustrative examples this is fine.
- All SQL syntax, DELIMITER usage, DECLARE HANDLER patterns, INFORMATION_SCHEMA queries, and ALTER/DROP EVENT commands are correct.
- The TIMESTAMP/WEEKDAY calculation for the weekly event correctly computes the next Monday at 01:00:00.
