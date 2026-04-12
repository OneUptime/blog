# Validation Summary: How to Find Redundant Indexes with sys Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+)
- MySQL sys schema (`schema_redundant_indexes` view)
- `INFORMATION_SCHEMA.STATISTICS`
- InnoDB indexing

## Sources Consulted
- MySQL 8.0 Reference Manual — sys schema redundant indexes view: https://dev.mysql.com/doc/refman/8.0/en/sys-schema-redundant-indexes.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA STATISTICS table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual — CREATE INDEX / composite indexes and leftmost prefix rule: https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html

## Issues Found
No technical issues found.

## Review Notes
- The `sys.schema_redundant_indexes` view also exposes a built-in `sql_drop_index` column that provides ready-made DROP INDEX statements. The post generates its own drop statements manually, which is a valid approach but readers could benefit from knowing about the built-in column in a future update.
- The view is available in MySQL 5.7+ (when the sys schema was introduced). The post does not specify a minimum MySQL version, which could be noted in a future revision.
