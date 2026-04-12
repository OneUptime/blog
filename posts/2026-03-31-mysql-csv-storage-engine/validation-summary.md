# Validation Summary: What Is the CSV Storage Engine in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL CSV Storage Engine
- SQL (CREATE TABLE, INSERT, SELECT, CHECK TABLE, REPAIR TABLE)

## Sources Consulted
- MySQL 8.0 Reference Manual: The CSV Storage Engine — https://dev.mysql.com/doc/refman/8.0/en/csv-storage-engine.html
- MySQL 8.4 Reference Manual: The CSV Storage Engine — https://dev.mysql.com/doc/refman/8.4/en/csv-storage-engine.html
- MySQL 8.0 Reference Manual: CSV Storage Engine Limitations — https://dev.mysql.com/doc/refman/8.0/en/se-csv-limitations.html
- MySQL 8.4 Reference Manual: Removal of File-based Metadata Storage — https://dev.mysql.com/doc/refman/8.4/en/data-dictionary-file-removal.html
- MySQL 8.0 Reference Manual: Repairing and Checking CSV Tables — https://dev.mysql.com/doc/refman/8.0/en/se-csv-repair.html
- MySQL 5.7 Reference Manual: The CSV Storage Engine — https://dev.mysql.com/doc/refman/5.7/en/csv-storage-engine.html

## Issues Found

1. **Outdated `.frm` file reference**: The post listed `tablename.frm` as one of the three files created by a CSV table. In MySQL 8.0+, `.frm` files were removed entirely; table definitions are stored in the transactional data dictionary and an `.sdi` file is created instead. Updated the file list to reflect both MySQL 5.7 and 8.0+ behavior.

2. **Incorrect CSV file content example**: The example showed unquoted integer values (`1,"Alice Smith",...`). MySQL's CSV engine quotes ALL values including integers (`"1","Alice Smith",...`). Fixed the example to match actual MySQL output.

3. **Misleading claim about auto-detection of CSV files**: The post stated "You can also place a correctly formatted CSV file directly in the database directory and MySQL will serve it as a table automatically." This is incorrect — the table definition must already exist (via a prior `CREATE TABLE`). Rewrote to clarify that you can replace the `.CSV` file of an existing table and use `REPAIR TABLE` to update metadata.

## Review Notes
- The post does not specify a MySQL version. The fixes now cover both 5.7 and 8.0+ behavior for the file layout section.
- The practical use case section's comment "External process drops a new CSV file, then MySQL reads it" works correctly given that the table is already created in the preceding SQL — this is consistent with the corrected guidance.
- All SQL examples are syntactically correct and use valid CSV engine patterns.
- The claim about CSV tables not supporting PRIMARY KEY or any indexes is correct per official documentation.
