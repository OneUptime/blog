# Validation Summary: How to Index JSON Data Using Generated Columns in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7, 8.0, 8.0.17+)
- JSON columns and JSON functions (JSON_EXTRACT, JSON_UNQUOTE, JSON_CONTAINS, JSON_OVERLAPS)
- Generated columns (VIRTUAL and STORED)
- Multi-valued indexes
- The ->> shorthand operator

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE INDEX — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: CREATE TABLE and Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 5.7 Reference Manual: Secondary Indexes and Generated Columns — https://dev.mysql.com/doc/refman/5.7/en/create-table-secondary-indexes.html
- MySQL 8.0 Reference Manual: Multi-Valued Indexes — https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-multi-valued
- MySQL 8.0 Reference Manual: JSON Path Syntax and Operators — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html

## Issues Found
1. **Incorrect claim about MySQL 5.7 virtual column indexing.** The post stated: "In MySQL 5.7, only `STORED` columns can be indexed." This is incorrect. InnoDB has supported secondary indexes on virtual generated columns since MySQL 5.7.8. The limitation to STORED-only indexing applies to other storage engines (e.g., MyISAM), not InnoDB. Fixed both the explanation in the "VIRTUAL vs STORED" section and the corresponding statement in the Summary section to accurately reflect the storage-engine-specific behavior.

## Review Notes
- The `TINYINT(1)` display width used in the products example is deprecated as of MySQL 8.0.17 (integer display widths are deprecated). It still functions correctly but will produce a deprecation warning on newer MySQL versions. Not changed since it remains widely used and functional.
- All SQL syntax (CREATE TABLE, ALTER TABLE, INSERT, EXPLAIN, generated column definitions, multi-valued index CAST syntax, JSON functions) is correct and follows current MySQL documentation.
- The ->> operator usage in generated column definitions is correct for MySQL 5.7.13+ and 8.0+.
- The multi-valued index section correctly identifies CAST(... AS CHAR(50) ARRAY) syntax and the required double parentheses for functional key parts, both introduced in MySQL 8.0.17.
