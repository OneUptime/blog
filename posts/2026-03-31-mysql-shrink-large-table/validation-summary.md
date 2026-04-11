# Validation Summary: How to Shrink a Large MySQL Table

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- information_schema and performance_schema
- OPTIMIZE TABLE / ALTER TABLE
- Percona Toolkit (pt-online-schema-change)
- MySQL partitioning
- innodb_file_per_table configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE — https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html
- MySQL 8.0 Reference Manual: information_schema.TABLES — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: performance_schema.events_stages_current — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-stages-current-table.html
- MySQL 8.0 Reference Manual: innodb_file_per_table — https://dev.mysql.com/doc/refman/8.0/en/innodb-file-per-table-tablespaces.html
- MySQL 8.0 Reference Manual: RENAME TABLE — https://dev.mysql.com/doc/refman/8.0/en/rename-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE ... DROP PARTITION — https://dev.mysql.com/doc/refman/8.0/en/alter-table-partition-operations.html
- Percona Toolkit: pt-online-schema-change — https://docs.percona.com/percona-toolkit/pt-online-schema-change.html

## Issues Found
1. **Incorrect column names in performance_schema query**: The monitoring progress query used `STAGE` and `STATE` as column names in `performance_schema.events_stages_current`. This table has no such columns. The correct column for the stage name is `EVENT_NAME`, and there is no `STATE` column. Changed `SELECT STAGE, STATE, WORK_COMPLETED, WORK_ESTIMATED` to `SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED`.

## Review Notes
- `innodb_file_per_table` is ON by default in MySQL 5.6.6+ and MySQL 8.0. The post correctly explains the scenario where it might be OFF (legacy configurations) but does not explicitly note it is ON by default in modern MySQL. This is a minor omission, not an error.
- The `CREATE TABLE ... LIKE` approach (Method 3) copies table structure including indexes but does not copy foreign key constraints. The post does not claim otherwise, but users with foreign keys should be aware of this caveat.
- The `ORDER BY data_free DESC` in the information_schema query is unnecessary when filtering to a single table, but it is not incorrect.
