# Validation Summary: How MySQL Handles Temporary Tables Internally

## Status
validated

## Post Type
Technical reference / Guide

## Technologies Covered
- MySQL 8.0+
- TempTable storage engine
- InnoDB temporary tablespaces
- Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual - Internal Temporary Table Use in MySQL: https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html
- MySQL 8.0 Reference Manual - InnoDB Temporary Tablespaces: https://dev.mysql.com/doc/refman/8.0/en/innodb-temporary-tablespace.html
- MySQL 8.0 Reference Manual - INNODB_TEMP_TABLE_INFO Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-temp-table-info-table.html
- MySQL 8.0 Reference Manual - INNODB_SESSION_TEMP_TABLESPACES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-session-temp-tablespaces-table.html
- MySQL 8.0.26 Release Notes (temptable_use_mmap deprecation): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-26.html

## Issues Found

1. **`UNION ALL` does not always create temporary tables**: The post listed `UNION ALL` alongside `UNION` as always creating temp tables. `UNION ALL` only requires a temporary table when combined with `ORDER BY` or `LIMIT`; otherwise rows are streamed directly. Fixed to clarify the distinction.

2. **`ibtmp1` usage incorrectly described**: The post stated that on-disk internal temporary tables are stored in `ibtmp1`. Since MySQL 8.0.16, on-disk internal temp tables use session temporary tablespaces (files in the `#innodb_temp` directory). `ibtmp1` (the global temporary tablespace) only stores rollback segments for user-created temporary tables. Rewrote the section to accurately describe the architecture.

3. **`temptable_use_mmap` deprecated since MySQL 8.0.26**: The post presented `temptable_use_mmap` as current without noting its deprecation. Added a deprecation note and pointed to `temptable_max_mmap` as the preferred alternative.

4. **`INNODB_TEMP_TABLE_INFO` scope not clarified**: The post implied this table could identify sessions causing `ibtmp1` growth from internal temp tables. It only tracks user-created temporary tables. Added a clarifying note and introduced `INNODB_SESSION_TEMP_TABLESPACES` as the broader monitoring option.

5. **Summary incorrectly stated explicit temp tables stored in `ibtmp1`**: Fixed to accurately state that since MySQL 8.0.16, on-disk temporary tables use session temporary tablespaces in `#innodb_temp`, while `ibtmp1` holds only rollback segments.

## Review Notes
- The `temptable_use_mmap` variable is deprecated in MySQL 8.0.26 and removed in MySQL 8.4. The post now notes the deprecation but users targeting MySQL 8.4+ should be aware it no longer exists.
- The `INNODB_TEMP_TABLE_INFO` table remains available in MySQL 8.0 but only tracks user-created temporary tables, which limits its usefulness for diagnosing internal temp table issues.
- The advice about CTEs materializing intermediate results is slightly imprecise — MySQL 8.0 may merge CTEs rather than materializing them, similar to derived tables. This was left as-is since it's not incorrect in context.
