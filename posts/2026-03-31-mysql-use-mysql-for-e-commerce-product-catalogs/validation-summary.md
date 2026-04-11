# Validation Summary: How to Use MySQL for E-Commerce Product Catalogs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB engine)
- SQL DDL (CREATE TABLE, ALTER TABLE)
- MySQL JSON columns and JSON path operators
- MySQL generated (virtual/stored) columns
- MySQL FULLTEXT indexing and MATCH...AGAINST search
- MySQL composite indexes

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON Data Type — https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual: The JSON Column Inline Path Operator (->> and ->) — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#operator_json-inline-path
- MySQL 8.0 Reference Manual: JSON_UNQUOTE() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-unquote
- MySQL 8.0 Reference Manual: CREATE TABLE and Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: InnoDB FULLTEXT Indexes — https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html

## Issues Found
- **Redundant JSON_UNQUOTE with ->> operator**: The generated column definition used `JSON_UNQUOTE(attributes->>'$.brand')`. The `->>` operator is already shorthand for `JSON_UNQUOTE(JSON_EXTRACT(...))`, so wrapping it in an additional `JSON_UNQUOTE()` is redundant (double-unquote). Changed to `attributes->>'$.brand'` which is the correct and idiomatic form.

## Review Notes
- All SQL DDL syntax is correct for MySQL 8.0+.
- The FULLTEXT index on InnoDB is correctly used (supported since MySQL 5.6+).
- The self-referencing FK pattern for hierarchical categories is standard and correct.
- The MATCH...AGAINST clause is correctly duplicated in both SELECT and WHERE, which is the standard MySQL pattern (the optimizer recognizes this and evaluates it only once).
- The composite index `(category_id, is_active, base_price)` correctly supports the browse-with-filter query pattern described.
- The summary's recommendation to consider Elasticsearch for very large catalogs with faceted search is a reasonable architectural note.
