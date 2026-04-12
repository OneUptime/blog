# Validation Summary: How to Use DEALLOCATE PREPARE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DEALLOCATE PREPARE / DROP PREPARE)
- MySQL Performance Schema (`prepared_statements_instances`)
- MySQL prepared statement lifecycle (PREPARE / EXECUTE / DEALLOCATE PREPARE)
- MySQL stored procedures with prepared statements

## Sources Consulted
- MySQL 8.0 Reference Manual — DEALLOCATE PREPARE Statement: https://dev.mysql.com/doc/refman/8.0/en/deallocate-prepare.html
- MySQL 8.0 Reference Manual — PREPARE Statement: https://dev.mysql.com/doc/refman/8.0/en/prepare.html
- MySQL 8.0 Reference Manual — EXECUTE Statement: https://dev.mysql.com/doc/refman/8.0/en/execute.html
- MySQL 8.0 Reference Manual — prepared_statements_instances Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-prepared-statements-instances-table.html

## Issues Found
- **Incorrect column name in Performance Schema query**: The query against `performance_schema.prepared_statements_instances` used `THREAD_ID`, which is not a valid column in that table. The correct column name is `OWNER_THREAD_ID`. Fixed `THREAD_ID` to `OWNER_THREAD_ID`.

## Review Notes
- The `dynamic_report` procedure concatenates `table_name` directly into SQL strings without escaping, which is a SQL injection risk. However, since the post is about DEALLOCATE PREPARE and not about SQL injection prevention, this is acceptable in context.
- The claim that `DEALLOCATE PREPARE` is the "SQL standard form" is reasonable — it aligns with the SQL standard's `DEALLOCATE PREPARE` syntax, while `DROP PREPARE` is a MySQL-specific synonym.
- All other code examples (PREPARE/EXECUTE/DEALLOCATE lifecycle, stored procedures, error behavior) are syntactically correct and accurately described.
