# Validation Summary: How to Use ON COMPLETION PRESERVE in MySQL Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Event Scheduler
- MySQL `ON COMPLETION PRESERVE` / `ON COMPLETION NOT PRESERVE` clauses
- `information_schema.EVENTS` system table
- `CREATE EVENT` and `ALTER EVENT` DDL statements

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: ALTER EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-event.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA EVENTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-events-table.html

## Issues Found
- **Incorrect duration in SQL comment**: The comment on the recurring event example said "ends after 6 months" but the `STARTS` date is `2026-04-01` and the `ENDS` date is `2027-04-01`, which is 12 months (1 year). Changed the comment to "ends after 1 year".

## Review Notes
- All SQL syntax is correct and follows the MySQL CREATE EVENT / ALTER EVENT grammar.
- The default `ON COMPLETION NOT PRESERVE` behavior (event dropped after last execution) is accurately described per MySQL docs.
- The `ON COMPLETION PRESERVE` behavior (event retained as DISABLED) is accurately described.
- The `information_schema.EVENTS` columns used (EVENT_NAME, STATUS, EXECUTE_AT, LAST_EXECUTED) are all valid columns in that table.
- The `ALTER EVENT ... ON SCHEDULE AT NOW() + INTERVAL 1 HOUR ENABLE` syntax for re-enabling a preserved event is correct.
- The post correctly notes that `ON COMPLETION NOT PRESERVE` is the default when the clause is omitted.
