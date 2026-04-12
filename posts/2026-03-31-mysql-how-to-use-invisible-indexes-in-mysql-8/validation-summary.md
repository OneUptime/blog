# Validation Summary: How to Use Invisible Indexes in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Invisible Indexes
- Query Optimizer / EXPLAIN
- information_schema.statistics
- optimizer_switch session variable

## Sources Consulted
- MySQL 8.0 Reference Manual: Invisible Indexes — https://dev.mysql.com/doc/refman/8.0/en/invisible-indexes.html
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: CREATE INDEX — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: Switchable Optimizations — https://dev.mysql.com/doc/refman/8.0/en/switchable-optimizations.html
- MySQL 8.0 Release Notes — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/

## Issues Found
- **Incorrect version number**: The overview stated invisible indexes were introduced in "MySQL 8.0.0". The feature was introduced in MySQL 8.0.1 (Development Milestone Release, October 2016). Changed to "MySQL 8.0" which is the standard way to reference the feature availability.

## Review Notes
- All SQL syntax (`ALTER INDEX ... INVISIBLE/VISIBLE`, `CREATE INDEX ... INVISIBLE`, `CREATE TABLE` with `INVISIBLE` index) is correct per MySQL 8.0 documentation.
- The `information_schema.statistics.is_visible` column reference is correct.
- The `SHOW INDEX` output description (Visible column with YES/NO) is accurate.
- The `use_invisible_indexes` optimizer switch name and on/off syntax are correct.
- The primary key restriction (error 3522, `ER_PK_INDEX_CANT_BE_INVISIBLE`) and error message text are accurate.
- The safe index removal workflow is a well-established best practice and is correctly described.
- The description of invisible indexes being maintained but ignored by the optimizer is accurate.
