# Validation Summary: How MySQL Online DDL Works Internally

## Status
validated

## Post Type
Technical Guide / Reference

## Technologies Covered
- MySQL 8.0 (InnoDB)
- Online DDL (INSTANT, INPLACE, COPY algorithms)
- ALTER TABLE operations
- Performance Schema (events_stages_current)
- pt-online-schema-change (Percona Toolkit)

## Sources Consulted
- MySQL 8.0 Reference Manual — EXPLAIN Statement: https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual — InnoDB Online DDL Operations: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual — Online DDL Space Requirements: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-space-requirements.html
- MySQL 8.0 Reference Manual — InnoDB Change Buffer: https://dev.mysql.com/doc/refman/8.0/en/innodb-change-buffer.html
- MySQL 8.0 Reference Manual — Performance Schema events_stages_current Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-stages-current-table.html
- MySQL 8.0 Reference Manual — InnoDB Online DDL: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl.html

## Issues Found

1. **EXPLAIN ALTER TABLE is not valid MySQL syntax (High severity):** The post used `EXPLAIN ALTER TABLE ...` in two places to check algorithm support. MySQL's EXPLAIN only supports SELECT, DELETE, INSERT, REPLACE, UPDATE, and TABLE statements — not DDL. Replaced with the correct approach: attempt the ALTER with the desired ALGORITHM clause and let MySQL raise an error if unsupported.

2. **Incorrect terminology: "change buffer" instead of "online log" (High severity):** The INPLACE algorithm description said DML is "tracked in a change buffer." The InnoDB change buffer is an unrelated mechanism for buffering secondary index page changes. During INPLACE Online DDL, concurrent DML is recorded in a temporary online log (sized by `innodb_sort_buffer_size`, capped by `innodb_online_alter_log_max_size`). Fixed the terminology to "temporary online log."

3. **Wrong column names in performance_schema query (High severity):** The monitoring query used `SCHEMA_NAME`, `OBJECT_NAME`, and `STAGE` columns which do not exist in `performance_schema.events_stages_current`. The actual columns are `EVENT_NAME`, `WORK_COMPLETED`, `WORK_ESTIMATED`, etc. Fixed the query to use the correct column names.

4. **Outdated INSTANT DDL operations table (Medium severity):** The table listed "Add column in middle" and "Drop column" as not supporting INSTANT. As of MySQL 8.0.29, both operations support `ALGORITHM=INSTANT`. Updated the table to reflect this with version annotations.

5. **Misleading COPY algorithm locking description (Medium severity):** The post said "DML is blocked (with `LOCK = EXCLUSIVE`)" which implied DML is only blocked when LOCK=EXCLUSIVE is specified. In reality, DML writes are always blocked during COPY regardless of the LOCK setting. LOCK=SHARED (the default for COPY) allows concurrent reads but blocks writes; LOCK=EXCLUSIVE blocks both. Corrected the description.

## Review Notes
- The pt-online-schema-change section claims "zero seconds of locking in most cases." In practice, pt-osc still requires a very brief metadata lock during the final RENAME TABLE swap, though it is typically sub-second. The "in most cases" qualifier makes this acceptable but could be more precise.
- The INSTANT DDL operations table could note the 64 row-version limit (`TOTAL_ROW_VERSIONS`) introduced in 8.0.29 — once exceeded, a table rebuild via COPY or INPLACE is required to reset the counter.
