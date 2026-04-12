# Validation Summary: How to Add a Column to an Existing Table in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- ALTER TABLE DDL
- Online DDL (ALGORITHM/LOCK options)
- Generated (computed) columns
- JSON data type

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: CREATE TABLE and Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual: Data Type Default Values — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html

## Issues Found
No technical issues found.

## Review Notes
- The Online DDL section recommends `ALGORITHM=INPLACE, LOCK=NONE` for adding columns in MySQL 8.0. While correct and functional, `ALGORITHM=INSTANT` (available since MySQL 8.0.12 for columns added as the last column, and extended in MySQL 8.0.29 to support adding columns at any position) is the more efficient option. INSTANT only modifies table metadata without any table rebuild, making it nearly instantaneous regardless of table size. A future update could mention this as the preferred approach.
- The generated column examples both use the name `total_with_tax`, which is fine since they are clearly presented as alternatives (virtual vs. stored), not as sequential statements.
- The statement "The default value is applied to all existing rows immediately" is functionally accurate from a user perspective, though internally MySQL 8.0.12+ may use INSTANT DDL and store the default in metadata rather than physically updating every row.
