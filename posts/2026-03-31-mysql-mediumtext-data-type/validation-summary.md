# Validation Summary: How to Use MEDIUMTEXT Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (MEDIUMTEXT data type, TEXT family)
- SQL DDL (CREATE TABLE, ALTER TABLE)
- MySQL full-text search (FULLTEXT indexes, MATCH...AGAINST)
- MySQL INFORMATION_SCHEMA
- MySQL generated columns and SHA2 hashing

## Sources Consulted
- MySQL 8.0 Reference Manual: String Data Types — https://dev.mysql.com/doc/refman/8.0/en/string-type-syntax.html
- MySQL 8.0 Reference Manual: The BLOB and TEXT Types — https://dev.mysql.com/doc/refman/8.0/en/blob.html
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement (prefix indexes) — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: CREATE TABLE and Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: LOAD_FILE() Function — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_load-file

## Issues Found
No technical issues found.

## Review Notes
- The MEDIUMTEXT maximum size of 16,777,215 bytes (2^24 - 1) is correctly stated throughout.
- The utf8mb4 CHARACTER_MAXIMUM_LENGTH of 4,194,303 is correct (floor of 16,777,215 / 4).
- The off-page storage description is accurate for InnoDB with DYNAMIC/COMPRESSED row formats (the default in modern MySQL). With older COMPACT/REDUNDANT formats, the first 768 bytes may be stored inline, but the general claim that TEXT columns don't count toward the 65,535-byte row-size limit remains correct.
- The LOAD_FILE() example is syntactically correct; readers should be aware it requires the FILE privilege and that the file must be in a directory allowed by the `secure_file_priv` system variable.
- The generated column using SHA2() on a MEDIUMTEXT column is valid syntax but may have performance implications on large tables since STORED generated columns require recomputation on every INSERT/UPDATE.
- All SQL examples are syntactically correct and use current, non-deprecated MySQL features.
