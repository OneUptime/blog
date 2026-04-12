# Validation Summary: How to Create a One-Time Event in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Event Scheduler
- MySQL `CREATE EVENT` statement
- MySQL `information_schema.EVENTS` table

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE EVENT Statement (https://dev.mysql.com/doc/refman/8.0/en/create-event.html)
- MySQL 8.0 Reference Manual: Event Scheduler Overview (https://dev.mysql.com/doc/refman/8.0/en/events-overview.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA EVENTS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-events-table.html)
- MySQL 8.0 Reference Manual: DROP EVENT Statement (https://dev.mysql.com/doc/refman/8.0/en/drop-event.html)
- MySQL 8.0 Reference Manual: SHOW EVENTS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-events.html)

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and follows current MySQL 8.0 conventions.
- The `ON SCHEDULE AT` clause correctly accepts both literal datetime strings and datetime expressions like `NOW() + INTERVAL`.
- The explanation of `ON COMPLETION NOT PRESERVE` (default, drops the event) vs `ON COMPLETION PRESERVE` (keeps the event as disabled) is accurate.
- The `information_schema.EVENTS` column names (`EVENT_NAME`, `STATUS`, `EXECUTE_AT`, `LAST_EXECUTED`) are all valid.
- The `DELIMITER` usage for multi-statement event bodies is correctly demonstrated.
- The `event_scheduler` global variable and how to enable it are accurately described.
