# Validation Summary: How to Avoid Storing Comma-Separated Values in MySQL Columns

## Status
validated

## Post Type
Tutorial / Best Practice Guide

## Technologies Covered
- MySQL (DDL, DML, stored procedures)
- MySQL FIND_IN_SET function
- MySQL JSON data type and JSON_CONTAINS function
- MySQL JSON_TABLE function (MySQL 8.0+)
- Database normalization (first normal form)
- Junction table / many-to-many relationship pattern

## Sources Consulted
- MySQL 8.0 Reference Manual: FIND_IN_SET — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_find-in-set
- MySQL 8.0 Reference Manual: JSON_CONTAINS — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-contains
- MySQL 8.0 Reference Manual: JSON_TABLE — https://dev.mysql.com/doc/refman/8.0/en/json-table-functions.html
- MySQL 8.0 Reference Manual: CREATE TABLE — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: DECLARE for cursors and handlers — https://dev.mysql.com/doc/refman/8.0/en/declare.html
- MySQL 8.0 Reference Manual: JSON Data Type — https://dev.mysql.com/doc/refman/8.0/en/json.html

## Issues Found
No technical issues found.

## Review Notes
- The migration stored procedure uses `JSON_TABLE`, which requires MySQL 8.0.4+. The post does not explicitly state this version requirement. Readers on MySQL 5.7 would need an alternative splitting approach (e.g., a recursive substring loop). This is not an error since MySQL 5.7 reached EOL in October 2023, but could be noted for completeness.
- The phrase "makes joins impossible" is slightly hyperbolic — joins using `FIND_IN_SET` in the ON clause are technically possible but extremely inefficient. The phrasing is acceptable in context as it refers to standard equi-joins.
- The implicit VARCHAR-to-INT conversion in `TRIM(j.value)` being inserted into an INT column is standard MySQL behavior and works correctly, but some strict SQL practitioners might prefer an explicit `CAST(TRIM(j.value) AS UNSIGNED)`.
