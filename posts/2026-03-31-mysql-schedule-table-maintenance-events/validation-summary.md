# Validation Summary: How to Schedule Table Maintenance with MySQL Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (Event Scheduler, InnoDB storage engine)
- ANALYZE TABLE, OPTIMIZE TABLE, CHECK TABLE, REPAIR TABLE
- information_schema.TABLES
- MySQL scheduled events (CREATE EVENT)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: CHECK TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/check-table.html
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html
- MySQL 8.0 Reference Manual: ANALYZE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html

## Issues Found
1. **Incorrect description of CHECK TABLE options (line 117)**:
   - **FAST**: The post stated "FAST skips rows that have not been modified since the last check." This is incorrect — `FAST` checks only tables that have not been closed properly, and it is ignored for InnoDB tables. The original description was closer to the `CHANGED` option. Fixed to: "FAST checks only tables that have not been closed properly (ignored for InnoDB)."
   - **QUICK**: The post stated "QUICK skips checking the delete-links of rows." This is a MyISAM-specific characterization. The accurate description is that `QUICK` does not scan rows to check for incorrect links. Fixed to: "QUICK does not scan rows to check for incorrect links."

## Review Notes
- The post does not mention that the MySQL Event Scheduler must be enabled (`SET GLOBAL event_scheduler = ON;`) for events to run. This is a critical prerequisite that readers will need to know. A future update could add this as an introductory note.
- Example 4 uses `CHECK TABLE ... FAST QUICK` on tables that are presumably InnoDB (given the post's context). The `FAST` option is silently ignored for InnoDB, so it has no effect. The SQL is not wrong (it runs without error), but readers should be aware it provides no benefit for InnoDB tables.
- The OPTIMIZE TABLE locking description ("locks the table briefly or uses online rebuild in MySQL 5.6+") is a reasonable simplification. In MySQL 5.6+ with online DDL, concurrent DML is allowed during most of the rebuild, but brief metadata locks are still taken at the start and end of the operation.
