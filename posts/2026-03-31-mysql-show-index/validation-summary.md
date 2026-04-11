# Validation Summary: How to Use SHOW INDEX in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL 8.0+
- SHOW INDEX / SHOW INDEXES / SHOW KEYS statements
- information_schema.STATISTICS table
- information_schema.TABLES table
- InnoDB storage engine
- ANALYZE TABLE statement

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW INDEX Statement (https://dev.mysql.com/doc/refman/8.0/en/show-index.html)
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA STATISTICS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html)
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)
- MySQL 8.0 Reference Manual: ANALYZE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html)
- MySQL 8.0 Reference Manual: Descending Indexes (https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html)
- MySQL 8.0 Reference Manual: Invisible Indexes (https://dev.mysql.com/doc/refman/8.0/en/invisible-indexes.html)

## Issues Found
No technical issues found.

## Review Notes
- The `Collation` value `D` (descending) and the `Visible` column are MySQL 8.0+ features. The post does not explicitly state a minimum version requirement, but since MySQL 8.0 is the current GA release this is reasonable.
- The `Packed` column appears in the example output but is not described in the column reference table. This is a minor omission rather than an error — in InnoDB, `Packed` is always NULL.
- The selectivity query could produce a division-by-zero error if `TABLE_ROWS` is 0 (empty table), but this is an edge case and not a correctness issue with the demonstrated concept.
