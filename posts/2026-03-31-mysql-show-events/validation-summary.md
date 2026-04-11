# Validation Summary: How to Use SHOW EVENTS in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL Event Scheduler
- MySQL SHOW EVENTS statement
- MySQL information_schema.EVENTS table
- MySQL ALTER EVENT and CREATE EVENT statements

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW EVENTS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-events.html)
- MySQL 8.0 Reference Manual: Event Scheduler Configuration (https://dev.mysql.com/doc/refman/8.0/en/events-configuration.html)
- MySQL 8.0 Reference Manual: CREATE EVENT Statement (https://dev.mysql.com/doc/refman/8.0/en/create-event.html)
- MySQL 8.0 Reference Manual: ALTER EVENT Statement (https://dev.mysql.com/doc/refman/8.0/en/alter-event.html)
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA EVENTS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-events-table.html)
- MySQL 8.0 Reference Manual: event_scheduler System Variable (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_event_scheduler)

## Issues Found
1. **Incorrect comment on SET GLOBAL statement**: The comment on `SET GLOBAL event_scheduler = ON;` said "Enable it for the current session," but `event_scheduler` is a global-only system variable — it cannot be set at the session level, and `SET GLOBAL` applies the change server-wide, not to the current session. Changed the comment to "Enable it globally."

## Review Notes
- All SQL syntax examples (SHOW EVENTS, SHOW EVENTS FROM, SHOW EVENTS LIKE, SHOW EVENTS WHERE, SHOW CREATE EVENT, CREATE EVENT, ALTER EVENT) are correct.
- The SHOW EVENTS output columns shown in the example match the MySQL 8.0 documentation.
- The information_schema.EVENTS column names used in the query are all valid.
- The Status values listed (ENABLED, DISABLED, SLAVESIDE_DISABLED) are correct.
- The CREATE EVENT examples use valid syntax for both recurring (EVERY ... STARTS) and one-time (AT) schedules.
- The collation `utf8mb4_0900_ai_ci` in the example output is specific to MySQL 8.0+, which is appropriate as it is the current major version.
