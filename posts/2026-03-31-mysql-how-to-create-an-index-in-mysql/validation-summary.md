# Validation Summary: How to Create an Index in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL DDL (CREATE INDEX, ALTER TABLE, DROP INDEX)
- MySQL EXPLAIN query analysis
- B-Tree, UNIQUE, FULLTEXT, and SPATIAL index types

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: SHOW INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/show-index.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: DROP INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/drop-index.html

## Issues Found
1. **EXPLAIN output `type` column was incorrect**: The example showed `type: const`, but `const` is only used when MySQL matches against a PRIMARY KEY or UNIQUE index. Since `idx_email` was created as a regular non-unique index (`CREATE INDEX`, not `CREATE UNIQUE INDEX`), the correct access type is `ref`. Fixed `const` to `ref` in the `type` column of the EXPLAIN output.

2. **SHOW INDEX output `Non_unique` column was incorrect**: The example showed `Non_unique: 0` for `idx_email`, which indicates a unique index. Since `idx_email` was created as a regular non-unique index, the `Non_unique` column should be `1`. Fixed `0` to `1`.

## Review Notes
- The `key_len` value of 1022 in the EXPLAIN output is correct for a VARCHAR(255) column with utf8mb4 encoding (255 * 4 bytes + 2 bytes for length prefix = 1022), which is the default character set in MySQL 8.0.
- The post correctly notes that SPATIAL indexes work with geometry data but does not mention the requirement that the column must be declared NOT NULL. This is a minor omission but not incorrect as stated.
- All SQL syntax examples are correct and work on MySQL 5.7+ and 8.0+.
- The indexing best practices advice (high cardinality columns, WHERE/JOIN/ORDER BY usage) is standard and accurate.
