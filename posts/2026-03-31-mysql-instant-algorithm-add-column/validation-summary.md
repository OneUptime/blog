# Validation Summary: How to Add a Column Instantly in MySQL 8 (INSTANT Algorithm)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (specifically 8.0.12+)
- InnoDB storage engine
- DDL (Data Definition Language) / Online DDL
- ALGORITHM=INSTANT for ALTER TABLE

## Sources Consulted
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: INNODB_TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tables-table.html
- MySQL 8.0 Blog: InnoDB now supports Instant ADD COLUMN — https://dev.mysql.com/blog-archive/mysql-8-0-innodb-now-supports-instant-add-column/
- MySQL 8.0 Blog: Instant ADD and DROP Columns — https://dev.mysql.com/blog-archive/mysql-8-0-instant-add-and-drop-columns/

## Issues Found

1. **VARCHAR extension incorrectly listed as INSTANT-supported operation (removed)**
   - The post included an example `ALTER TABLE products MODIFY COLUMN sku VARCHAR(100), ALGORITHM=INSTANT;` under "Supported Operations for INSTANT."
   - Extending VARCHAR length is NOT supported by ALGORITHM=INSTANT. It requires ALGORITHM=INPLACE (when staying within the same length-byte category, e.g., both under 256 bytes) or ALGORITHM=COPY (when crossing the 256-byte boundary). Running the original example would produce an error.
   - Fix: Removed the VARCHAR extension example and its comments from the supported operations section.

2. **Data type change example used wrong algorithm (corrected)**
   - The post showed `ALTER TABLE orders MODIFY COLUMN total BIGINT, ALGORITHM=INPLACE;` with the comment "requires INPLACE or COPY."
   - Changing a column's data type is a COPY-only operation in MySQL. Using ALGORITHM=INPLACE for a data type change would fail with an error because the row data must be physically rewritten.
   - Fix: Changed the algorithm to `ALGORITHM=COPY` and updated the comment to "requires COPY."

## Review Notes
- The `INSTANT_COLS` column in `information_schema.INNODB_TABLES` is no longer used as of MySQL 8.0.29 (the INSTANT DDL implementation was redesigned). It continues to show information only for tables with columns added instantly prior to 8.0.29. The post's verification query is correct for 8.0.12-8.0.28 but readers on 8.0.29+ should be aware of this change.
- In MySQL 8.0.12-8.0.28, INSTANT ADD COLUMN only supports adding columns at the end of the table. Adding columns at a specific position (using AFTER or FIRST) requires INPLACE. MySQL 8.0.29+ lifted this restriction. The post's examples all add columns at the default (end) position, so they are correct, but this is a notable version-specific caveat.
- The performance comparison numbers are illustrative approximations, not benchmarks. They convey the correct order-of-magnitude differences between the three algorithms.
