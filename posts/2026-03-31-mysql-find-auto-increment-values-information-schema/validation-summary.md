# Validation Summary: How to Find All Auto-Increment Values Using INFORMATION_SCHEMA in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (INFORMATION_SCHEMA)
- SQL (DDL and DML)
- Database Administration (auto-increment monitoring, overflow prevention)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html)
- MySQL 8.0 Reference Manual: Integer Types (https://dev.mysql.com/doc/refman/8.0/en/integer-types.html)
- MySQL 8.0 Reference Manual: AUTO_INCREMENT Handling in InnoDB (https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html)
- MySQL 8.0 Reference Manual: ALTER TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)

## Issues Found
No technical issues found.

## Review Notes
- The COLUMN_TYPE matching in the "Calculate Remaining Capacity" CASE statement uses exact values like `'int'` and `'int unsigned'`. This is correct for MySQL 8.0.17+ where integer display widths are no longer reported in COLUMN_TYPE. On older MySQL versions (5.7 or pre-8.0.17), COLUMN_TYPE would return values like `int(11)` or `int(10) unsigned`, causing the CASE to return NULL. This is acceptable for a 2026 blog post since MySQL 5.7 is EOL and 8.0.17+ is the practical baseline.
- The CASE statement only covers INT and BIGINT types. TINYINT, SMALLINT, and MEDIUMINT auto-increment columns would return NULL for remaining_ids. These are rarely used for auto-increment in practice, so this is a reasonable scope.
- The ALTER TABLE MODIFY example is correct but does not mention that this is a potentially expensive operation on large tables (table rebuild). Readers working with large production tables should be aware of online DDL tools like pt-online-schema-change or gh-ost.
- The `EXTRA = 'auto_increment'` filter is correct for standard auto-increment columns. In edge cases with generated columns, EXTRA may contain additional attributes, but this does not affect typical auto-increment lookups.
