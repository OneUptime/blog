# Validation Summary: How to Use ALTER TABLE in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (ALTER TABLE DDL)
- InnoDB storage engine
- MySQL online DDL (ALGORITHM/LOCK clauses)

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: RENAME TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/rename-table.html
- MySQL 8.0 Reference Manual: EXPLAIN Statement — https://dev.mysql.com/doc/refman/8.0/en/explain.html

## Issues Found
1. **Incorrect mention of EXPLAIN with ALTER TABLE**: The "Checking the Impact Before Running" section stated "use `EXPLAIN` and check the `ALTER TABLE` ALGORITHM before executing." `EXPLAIN` is not valid for DDL statements like `ALTER TABLE` in MySQL — it only works with SELECT, DELETE, INSERT, REPLACE, UPDATE, and TABLE statements. The text was corrected to describe the actual mechanism: specifying `ALGORITHM` and `LOCK` clauses directly, where MySQL raises an error if the requested algorithm is unsupported for the given operation.

## Review Notes
- All SQL syntax examples are correct and valid for MySQL 5.7+ and 8.0+.
- The post could mention `ALGORITHM=INSTANT` (available in MySQL 8.0.12+) as a faster alternative to INPLACE for supported operations like adding columns at the end of a table, but this is an enhancement, not an error.
- The `CONVERT TO CHARACTER SET` syntax correctly converts existing data, as opposed to `DEFAULT CHARACTER SET` which only changes the default for new columns.
