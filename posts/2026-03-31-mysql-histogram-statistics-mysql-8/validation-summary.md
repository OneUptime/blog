# Validation Summary: How to Use Histogram Statistics in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Query Optimizer
- Histogram Statistics (ANALYZE TABLE ... UPDATE HISTOGRAM)
- information_schema.COLUMN_STATISTICS

## Sources Consulted
- MySQL 8.0 Reference Manual - Optimizer Statistics: https://dev.mysql.com/doc/refman/8.0/en/optimizer-statistics.html
- MySQL 8.0 Reference Manual - ANALYZE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html
- MySQL 8.0 Reference Manual - The INFORMATION_SCHEMA COLUMN_STATISTICS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-column-statistics-table.html

## Issues Found
1. **Incorrect column name in COLUMN_STATISTICS queries**: Three SELECT queries against `information_schema.COLUMN_STATISTICS` used `TABLE_SCHEMA` as the column name for filtering by schema. The correct column name in this table is `SCHEMA_NAME`. This is a common mistake because most other `information_schema` tables (TABLES, COLUMNS, STATISTICS, etc.) use `TABLE_SCHEMA`, but `COLUMN_STATISTICS` is an exception. Using `TABLE_SCHEMA` would produce an "Unknown column" error. Fixed all three occurrences to use `SCHEMA_NAME`.

## Review Notes
- The ANALYZE TABLE syntax, bucket defaults (100) and maximum (1024) are all correct for MySQL 8.0.
- The descriptions of singleton vs equi-height histogram types are accurate. The post simplifies by saying singleton buckets store a value and "its frequency" — technically MySQL stores cumulative frequency, but this is an acceptable simplification for a tutorial.
- The JSON path expressions using `->>` and the field names (`histogram-type`, `number-of-buckets-specified`, `buckets`) are all correct.
- The DROP HISTOGRAM syntax is correct.
- The guidance on when to use histograms is sound and aligns with MySQL documentation recommendations.
