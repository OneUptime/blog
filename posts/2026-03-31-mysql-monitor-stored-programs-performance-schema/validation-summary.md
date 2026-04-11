# Validation Summary: How to Monitor Stored Programs with Performance Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Performance Schema
- Stored Procedures
- Stored Functions
- Triggers
- Scheduled Events

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Statement Event Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-tables.html)
- MySQL 8.0 Reference Manual: events_statements_summary_by_program Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema Setup Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema Instrument Naming (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-instrument-naming.html)

## Issues Found
- **Invalid `NESTING_EVENT_TYPE` filter value**: In the "Drilling Into Stored Procedure Internals" section, the query used `WHERE NESTING_EVENT_TYPE = 'PROCEDURE'`. The value `'PROCEDURE'` is not a valid `NESTING_EVENT_TYPE`. Valid values are `TRANSACTION`, `STATEMENT`, `STAGE`, and `WAIT`. Statements executed inside a stored procedure are nested within the CALL statement event, so the correct filter is `NESTING_EVENT_TYPE = 'STATEMENT'`. Fixed the WHERE clause and updated the description text to accurately explain the filtering logic.

## Review Notes
- All other SQL queries are syntactically correct and reference valid Performance Schema columns.
- The picosecond-to-seconds (divide by 1e12) and picosecond-to-milliseconds (divide by 1e9) conversions are correct.
- The `setup_instruments` pattern `statement/sp/%` and all `setup_consumers` names are valid.
- The `OBJECT_TYPE` filter values ('PROCEDURE', 'FUNCTION', 'TRIGGER') used in the summary table queries are correct.
- The `NESTING_EVENT_TYPE = 'STATEMENT'` filter will capture statements nested inside any parent statement (not just procedure calls), so it may include statements from functions or triggers as well. For more precise filtering, users may want to join with the parent event or filter by OBJECT_TYPE. This is acceptable for a tutorial-level post.
