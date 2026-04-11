# Validation Summary: What Is a MySQL Prefix Index

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (DDL and DML)
- MySQL indexing (prefix indexes, FULLTEXT indexes)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: Column Indexes (Prefix Indexes) — https://dev.mysql.com/doc/refman/8.0/en/column-indexes.html
- MySQL 8.0 Reference Manual: innodb_large_prefix (deprecated) — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_large_prefix
- MySQL 8.0 Reference Manual: innodb_default_row_format — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_default_row_format
- MySQL 8.0 Reference Manual: InnoDB Limits — https://dev.mysql.com/doc/refman/8.0/en/innodb-limits.html
- MySQL 8.0 Reference Manual: FULLTEXT Indexes — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html

## Issues Found
- **Inaccurate reference to `innodb_large_prefix` for MySQL 8.0**: The post stated the 3072-byte index key limit comes from "`innodb_large_prefix` enabled, the default in MySQL 8.0." In reality, `innodb_large_prefix` was deprecated in MySQL 8.0.0 and removed in MySQL 8.0.36. The 3072-byte limit in MySQL 8.0 is the default because the default `innodb_default_row_format` is `DYNAMIC`, not because of the `innodb_large_prefix` variable. Fixed the explanation to reference `ROW_FORMAT=DYNAMIC` and `ROW_FORMAT=COMPRESSED` (which support the 3072-byte limit) and `ROW_FORMAT=COMPACT` and `ROW_FORMAT=REDUNDANT` (which are limited to 767 bytes).

## Review Notes
- All SQL examples are syntactically correct and demonstrate valid usage patterns.
- The selectivity analysis technique using `COUNT(DISTINCT LEFT(column, N))` is the standard recommended approach.
- The limitations section correctly identifies that prefix indexes cannot serve as covering indexes and cannot be used for ORDER BY or GROUP BY.
- The FULLTEXT index comparison is accurate and helpful for readers who might be choosing between the two.
- The error message (ERROR 1170) is correct for MySQL.
