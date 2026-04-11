# Validation Summary: How to Use TINYTEXT, TEXT, MEDIUMTEXT, LONGTEXT in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (TEXT family data types: TINYTEXT, TEXT, MEDIUMTEXT, LONGTEXT)
- SQL (DDL, DML, FULLTEXT indexing)
- InnoDB storage engine

## Sources Consulted
- MySQL 8.0 Reference Manual: The BLOB and TEXT Types — https://dev.mysql.com/doc/refman/8.0/en/blob.html
- MySQL 8.0 Reference Manual: Data Type Default Values — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Release Notes (8.0.13) — BLOB and TEXT default value support — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-13.html
- MySQL 8.0 Reference Manual: InnoDB Limits (index key prefix lengths) — https://dev.mysql.com/doc/refman/8.0/en/innodb-limits.html
- MySQL 8.0 Reference Manual: Server System Variables (max_sort_length) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_sort_length

## Issues Found

### 1. TEXT DEFAULT value claim is outdated
- **What was wrong:** The post stated in multiple places that TEXT columns cannot have a DEFAULT value other than NULL. This was true before MySQL 8.0.13 (released October 2018) but is no longer accurate.
- **What was changed:** Updated the syntax section to note that MySQL 8.0.13+ supports explicit default values for TEXT columns. Updated the comparison table to show "Supported (MySQL 8.0.13+)". Removed the "allows default values" advantage from the VARCHAR best-practice bullet. Updated the summary paragraph.
- **Why:** MySQL 8.0.13 introduced support for BLOB and TEXT default values. Since MySQL 5.7 reached EOL in October 2023, most deployments are on 8.0+ where this applies.

### 2. VARCHAR index prefix limit outdated (767 bytes)
- **What was wrong:** The TEXT vs VARCHAR comparison table stated VARCHAR indexes are "Supported (up to 767 bytes)". The 767-byte limit applied to older InnoDB REDUNDANT/COMPACT row formats or when `innodb_large_prefix` was OFF.
- **What was changed:** Updated to "Supported (up to 3072 bytes with DYNAMIC row format)" to reflect the default behavior in MySQL 5.7.7+ and MySQL 8.0.
- **Why:** Since MySQL 5.7.7, the default row format is DYNAMIC and `innodb_large_prefix` is ON, allowing index key prefixes up to 3072 bytes. MySQL 8.0 removed the `innodb_large_prefix` variable entirely (always behaves as ON).

### 3. Sorting/GROUP BY description for TEXT was misleading
- **What was wrong:** The comparison table said TEXT columns "Require prefix" for sorting/GROUP BY, implying you must use a prefix expression in SQL.
- **What was changed:** Updated to "Uses `max_sort_length` bytes (default 1024)" to accurately describe the behavior.
- **Why:** MySQL sorts TEXT columns without requiring an explicit prefix in the query. It uses the `max_sort_length` system variable (default 1024 bytes) to determine how many bytes to consider for sorting.

## Review Notes
- All SQL code examples are syntactically correct and would execute successfully.
- The storage limit table values (byte counts and length prefixes) are accurate per the MySQL documentation.
- The utf8mb4 character calculation (65,535 / 4 = 16,383 characters) is correct.
- The FULLTEXT index examples use correct syntax and the MATCH...AGAINST patterns are valid.
- The post does not specify a target MySQL version; the fixes align it with MySQL 8.0, which is the current GA release series.
