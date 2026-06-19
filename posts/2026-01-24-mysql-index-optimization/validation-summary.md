# Validation Summary: How to Handle Index Optimization in MySQL

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- MySQL
- SQL
- MySQL indexes
- MySQL EXPLAIN and EXPLAIN ANALYZE
- MySQL Performance Schema and sys schema
- InnoDB optimizer statistics
- MySQL full-text indexes
- MySQL spatial indexes

## Sources Consulted
- MySQL 8.4 Reference Manual: EXPLAIN Output Format - https://dev.mysql.com/doc/refman/8.4/en/explain-output.html
- MySQL 8.0 Reference Manual: EXPLAIN Statement - https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.4 Reference Manual: How MySQL Uses Indexes - https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html
- MySQL 8.4 Reference Manual: Multiple-Column Indexes - https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html
- MySQL 8.4 Reference Manual: Foreign Key Constraints - https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html
- MySQL 8.4 Reference Manual: The schema_unused_indexes View - https://dev.mysql.com/doc/refman/8.4/en/sys-schema-unused-indexes.html
- MySQL 8.4 Reference Manual: The schema_index_statistics View - https://dev.mysql.com/doc/refman/8.4/en/sys-schema-index-statistics.html
- MySQL 8.4 Reference Manual: The schema_redundant_indexes View - https://dev.mysql.com/doc/refman/8.4/en/sys-schema-redundant-indexes.html
- MySQL 8.4 Reference Manual: InnoDB Persistent Statistics - https://dev.mysql.com/doc/refman/8.4/en/innodb-persistent-stats.html
- MySQL 8.4 Reference Manual: Full-Text Search Functions - https://dev.mysql.com/doc/refman/8.4/en/fulltext-search.html
- MySQL 8.4 Reference Manual: Creating Spatial Indexes - https://dev.mysql.com/doc/refman/8.4/en/creating-spatial-indexes.html
- MySQL 8.4 Reference Manual: SPATIAL Index Optimization - https://dev.mysql.com/doc/refman/8.4/en/spatial-index-optimization.html
- MySQL 8.4 Reference Manual: Using Spatial Indexes - https://dev.mysql.com/doc/refman/8.4/en/using-spatial-indexes.html
- MySQL 8.4 Reference Manual: Geometry Format Conversion Functions - https://dev.mysql.com/doc/refman/8.4/en/gis-format-conversion-functions.html
- MySQL 8.4 Reference Manual: ALTER TABLE Statement - https://dev.mysql.com/doc/refman/8.4/en/alter-table.html

## Issues Found
- Corrected the EXPLAIN ANALYZE version note from "MySQL 8.0+" to "MySQL 8.0.18+".
- Softened the composite-index leftmost-prefix wording from absolute "not usable" language to "not efficiently for filtering", because optimizer behavior can be more nuanced.
- Replaced an invalid unused-index query that selected sys-schema columns from `performance_schema.table_io_waits_summary_by_index_usage`. The post now uses `sys.schema_unused_indexes` for unused indexes and `sys.schema_index_statistics` for per-index read/write activity.
- Fixed the index-size query against `mysql.innodb_index_stats` to use `database_name`, which is the documented column name.
- Replaced the duplicate-index detection query with `sys.schema_redundant_indexes`, which is the documented sys schema view for indexes that duplicate or are made redundant by other indexes.
- Fixed the cardinality example. The previous `approx_rows` subquery counted matching rows in `information_schema.tables`, not rows in the target table. The query now joins `information_schema.tables` and uses `table_rows`.
- Made the low-cardinality guidance less absolute, since low-cardinality indexes can still be useful depending on distribution and query patterns.
- Corrected the spatial radius query so the spatial index can participate via `MBRContains()` on a bounding box, with `ST_Distance_Sphere()` kept as the precise distance filter.
- Added `axis-order=long-lat` to WKT construction for SRID 4326 point/polygon values to avoid ambiguity with geographic axis order.
- Clarified that `ALTER TABLE ... DISABLE KEYS` is a MyISAM bulk-load technique for nonunique indexes, not a general InnoDB index-disabling strategy.
- Corrected the quick-reference row for `LIKE '%suffix'`. A full-text index is not a general suffix-search replacement; a leading wildcard cannot use a normal B-tree index, and the right search strategy depends on the use case.

## Review Notes
The guide is technically relevant and generally accurate after the corrections. The insert throughput numbers are illustrative only and should not be treated as portable benchmark results, but they are presented as approximate examples.
