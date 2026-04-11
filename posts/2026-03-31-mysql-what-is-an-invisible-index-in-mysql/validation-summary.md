# Validation Summary: What Is an Invisible Index in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- Invisible Indexes (ALTER INDEX ... INVISIBLE/VISIBLE)
- information_schema.STATISTICS
- performance_schema.table_io_waits_summary_by_index_usage

## Sources Consulted
- MySQL 8.0 Reference Manual — Invisible Indexes: https://dev.mysql.com/doc/refman/8.0/en/invisible-indexes.html
- MySQL 8.0 Reference Manual — ALTER TABLE: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — Optimizer Hints: https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html
- MySQL 8.0 Reference Manual — optimizer_switch: https://dev.mysql.com/doc/refman/8.0/en/switchable-optimizations.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA STATISTICS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html

## Issues Found
- **"Force Using an Invisible Index" section was incorrect.** The post claimed you could use the `/*+ INDEX(orders idx_customer) */` optimizer hint to force the optimizer to use an invisible index. This is wrong — invisible indexes are excluded before the optimizer processes hints, so optimizer hints cannot override index invisibility. The correct method is to use the `use_invisible_indexes` optimizer switch via `SET SESSION optimizer_switch = 'use_invisible_indexes=on';`. Fixed the section to use the correct approach.

## Review Notes
- All SQL syntax (`ALTER TABLE ... ALTER INDEX ... INVISIBLE/VISIBLE`, `CREATE INDEX ... INVISIBLE`, `SHOW INDEX`, `information_schema.STATISTICS.IS_VISIBLE`, `performance_schema.table_io_waits_summary_by_index_usage`) is correct for MySQL 8.0.
- The explanation that invisible indexes are still maintained on writes (incurring DML overhead) is accurate.
- The practical workflow using `performance_schema` to identify unused indexes before making them invisible is a sound approach.
- The claim that invisible indexes were introduced in MySQL 8.0 is correct (specifically MySQL 8.0.0).
