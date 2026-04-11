# Validation Summary: What Is the INSTANT Algorithm for ALTER TABLE in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL 8.0 (specifically 8.0.12, 8.0.28, 8.0.29)
- InnoDB storage engine
- Online DDL (INSTANT, INPLACE, COPY algorithms)
- information_schema.innodb_tables

## Sources Consulted
- MySQL 8.0 Reference Manual — Online DDL Operations: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0.12 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-12.html
- MySQL 8.0.28 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-28.html
- MySQL 8.0.29 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-29.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA INNODB_TABLES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tables-table.html

## Issues Found
1. **Deprecated `instant_cols` column in information_schema query**: The "Checking Table Instant Row Version" section used `instant_cols` from `information_schema.innodb_tables`, which was deprecated in MySQL 8.0.29 and replaced by `total_row_versions`. Since the post itself covers 8.0.29 features (drop column, add column at any position), using the deprecated column was inconsistent and misleading. Changed `instant_cols` to `total_row_versions` and updated the comment to match.

## Review Notes
- The "How INSTANT Works Internally" section describes the pre-INSTANT behavior (steps 1-3: create temp table, copy rows, swap) which is accurate for the COPY algorithm but is a simplification for INPLACE. INPLACE rebuilds the clustered index in place while allowing concurrent DML, rather than creating a full temp table copy. However, the key point — that both COPY and INPLACE take time proportional to table size — is correct, so this simplification is acceptable for the audience.
- The performance comparison table (COPY: 30-60 min, INPLACE: 5-15 min, INSTANT: <1s for 100M rows) provides reasonable ballpark estimates, though actual times vary greatly based on hardware, row size, indexes, and concurrent load.
- All SQL syntax examples are correct. The RENAME COLUMN ... TO syntax with ALGORITHM=INSTANT is valid since MySQL 8.0.28 (official docs tend to use CHANGE syntax in examples, but both are equivalent).
- All version numbers for supported operations were verified against MySQL release notes and are accurate.
