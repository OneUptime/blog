# Validation Summary: What Is the MySQL Event Scheduler

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL Event Scheduler
- MySQL `CREATE EVENT`, `ALTER EVENT`, `DROP EVENT` statements
- MySQL `INFORMATION_SCHEMA.EVENTS` table
- MySQL stored procedures
- MySQL error handling with `DECLARE HANDLER`

## Sources Consulted
- MySQL 8.0 Reference Manual: Event Scheduler Overview — https://dev.mysql.com/doc/refman/8.0/en/event-scheduler.html
- MySQL 8.0 Reference Manual: CREATE EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: ALTER EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-event.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA EVENTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-events-table.html
- MySQL 8.0 Reference Manual: Server System Variables (event_scheduler) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_event_scheduler

## Issues Found
1. **Overview: Incorrect claim about where events are stored.** The post stated events are "stored in the `mysql` schema." Events are actually named database objects associated with the schema (database) in which they are created, not the `mysql` schema. Fixed to: "associated with the schema in which they are created."

2. **Enabling section: Misleading comment on SET GLOBAL.** The SQL comment said "Enable for the current session (temporary)," but `SET GLOBAL event_scheduler = ON` sets a server-wide global variable, not a session variable. It persists until the server restarts. Fixed the comment to: "Enable globally (persists until server restart)."

3. **INFORMATION_SCHEMA query: Wrong column name.** The query used `COMMENT` as a column name, but the correct column in `information_schema.EVENTS` is `EVENT_COMMENT`. Fixed to `EVENT_COMMENT`.

## Review Notes
- The multi-statement event bodies (using `BEGIN...END`) would require `DELIMITER` changes when executed from the `mysql` command-line client. This is a common convention in blog posts and not an error, but readers copying these examples directly into the CLI may encounter syntax errors without setting a custom delimiter first.
- The stored procedure example similarly omits the `DELIMITER` usage, which is standard for blog presentation but worth noting for beginners.
- All other SQL syntax, `INFORMATION_SCHEMA` column names, `ALTER EVENT` operations, and error handling patterns are correct per MySQL 8.0 documentation.
