# Validation Summary: What Is a Functional Index in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0.13+ (functional / expression indexes)
- InnoDB storage engine
- MySQL information_schema
- JSON functions and operators (`->>`, `CAST`)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: CREATE TABLE and Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL Blog: Virtual Columns and Effective Functional Indexes in InnoDB — https://dev.mysql.com/blog-archive/virtual-columns-and-effective-functional-indexes-in-innodb/

## Issues Found
1. **Invalid `IS_GENERATED` column in information_schema query**: The "Functional Index Under the Hood" section queried `information_schema.COLUMNS` using `IS_GENERATED` as both a selected column and a filter (`IS_GENERATED = 'ALWAYS'`). This column does not exist in MySQL's `information_schema.COLUMNS` table and would produce an "Unknown column" error. Fixed by replacing `IS_GENERATED` with `EXTRA` and filtering on `EXTRA = 'VIRTUAL GENERATED'`, which is the correct way to identify virtual generated columns (including hidden ones created by functional indexes) in MySQL 8.0.

## Review Notes
- The LOWER() functional index example for case-insensitive email lookups is technically correct, but worth noting that MySQL's default collation (`utf8mb4_0900_ai_ci`) is already case-insensitive. A regular index on `email` would handle case-insensitive equality comparisons without needing LOWER(). The functional index approach is most relevant when using a case-sensitive collation like `utf8mb4_bin`.
- The limitation "the expression cannot reference other generated columns" is not explicitly listed in the MySQL 8.0 documentation for functional key parts. The documented restrictions focus on: no subqueries, no parameters/variables, no stored/loadable functions, no SPATIAL/FULLTEXT, and no primary keys. This claim may be conflated with generated column restrictions. It is not clearly wrong, but could be more precise.
- The date part extraction example indexes only MONTH but the WHERE clause also filters by YEAR — only the MONTH condition benefits from the index. This is accurate behavior but readers might assume both conditions are optimized.
