# Validation Summary: How to Alter an Event in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Event Scheduler
- ALTER EVENT statement
- MySQL privilege system (EVENT privilege)
- information_schema.EVENTS

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-event.html
- MySQL 8.0 Reference Manual: Event Scheduler Overview — https://dev.mysql.com/doc/refman/8.0/en/events-overview.html
- MySQL 8.0 Reference Manual: SHOW EVENTS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-events.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA EVENTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-events-table.html

## Issues Found

1. **Syntax block clause ordering was incorrect**: The `RENAME TO` clause was listed before `ON COMPLETION [NOT] PRESERVE` in the syntax block. Per the official MySQL grammar, `ON COMPLETION` must come before `RENAME TO`. If a user attempted to use both clauses in one statement following the blog's order, it would produce a syntax error. Fixed by reordering to match the official syntax. Also added `DISABLE ON SLAVE` as a valid option alongside `ENABLE` and `DISABLE`.

2. **Privilege requirement was inaccurate**: The post stated "you need the `EVENT` privilege on the schema, or be the event's definer." The MySQL documentation states unconditionally that `ALTER EVENT` requires the `EVENT` privilege on the schema — being the event's definer is not a substitute. Fixed by removing the incorrect alternative.

## Review Notes
- The `DISABLE ON SLAVE` option was renamed to `DISABLE ON REPLICA` in MySQL 8.0.26+. The blog uses the older term which remains supported as an alias. Future updates could mention both forms.
- The `[DEFINER = user]` clause is omitted from the syntax block. This is acceptable for a simplified tutorial but worth noting for completeness.
- All SQL code examples are syntactically correct and demonstrate valid use cases.
- The information_schema.EVENTS column names referenced (EVENT_NAME, STATUS, INTERVAL_VALUE, INTERVAL_FIELD, STARTS, ENDS, ON_COMPLETION, LAST_EXECUTED) are all valid.
