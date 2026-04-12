# Validation Summary: How to Find Table Sizes Using INFORMATION_SCHEMA in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL
- INFORMATION_SCHEMA.TABLES
- InnoDB storage engine

## Sources Consulted
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)
- MySQL 8.0 Reference Manual: SHOW TABLE STATUS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-table-status.html)
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html)
- MySQL 8.0 Reference Manual: InnoDB File-Per-Table Tablespaces (https://dev.mysql.com/doc/refman/8.0/en/innodb-file-per-table-tablespaces.html)

## Issues Found
- **`SHOW TABLE STATUS` claimed to provide exact sizes**: The original "Note on Accuracy" section stated "For exact sizes, use `SHOW TABLE STATUS` or check the file system." This is incorrect for InnoDB tables — `SHOW TABLE STATUS` draws from the same internal statistics as `INFORMATION_SCHEMA.TABLES` and returns the same estimates, not exact values. Fixed to clarify that `SHOW TABLE STATUS` returns the same estimates and that checking the file system (e.g., `.ibd` files) is the way to get exact on-disk sizes.

## Review Notes
- All SQL queries are syntactically correct and use appropriate column names from `INFORMATION_SCHEMA.TABLES`.
- The system schema exclusion list (`information_schema`, `performance_schema`, `mysql`, `sys`) is correct and complete for standard MySQL installations.
- The fragmentation query uses `DATA_LENGTH + 1` in the denominator to avoid division by zero, which is a reasonable defensive approach.
- The byte-to-MB (÷1024÷1024) and byte-to-GB (÷1073741824) conversions are correct.
- The claim that indexes larger than data "often indicates over-indexing" is a simplification — it can also be legitimate for tables with many indexed columns or full-text indexes — but is reasonable general guidance for a blog post audience.
- The `TABLE_ROWS` estimate caveat is accurate: InnoDB uses sampling-based estimates that can be off by 40-50% in some cases, while MyISAM tracks exact counts.
