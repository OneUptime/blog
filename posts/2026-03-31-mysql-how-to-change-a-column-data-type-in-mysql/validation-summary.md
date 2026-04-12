# Validation Summary: How to Change a Column Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- ALTER TABLE DDL operations
- Online DDL (ALGORITHM options)

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE syntax — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: Server SQL Modes — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- MySQL 8.0 Reference Manual: The JSON Data Type — https://dev.mysql.com/doc/refman/8.0/en/json.html

## Issues Found

1. **VARCHAR widening incorrectly described as INSTANT**: The post claimed VARCHAR widening could use `ALGORITHM=INSTANT`. Per MySQL 8.0 Online DDL documentation, extending VARCHAR column size is an in-place operation (`ALGORITHM=INPLACE`), not instant. `ALGORITHM=INSTANT` is not supported for this operation and would produce an error. Fixed to use `ALGORITHM=INPLACE, LOCK=NONE`.

2. **DECIMAL precision change incorrectly described as INPLACE**: The post used `ALGORITHM=INPLACE, LOCK=NONE` for changing DECIMAL(12,2) to DECIMAL(12,4). Per MySQL 8.0 docs, "changing the column data type" requires `ALGORITHM=COPY` and does not support concurrent DML. Fixed to use `ALGORITHM=COPY`.

3. **Narrowing behavior incomplete for strict SQL mode**: The post stated "MySQL will warn but may proceed" when narrowing a column. This is only true in non-strict SQL mode. In strict SQL mode (the default since MySQL 5.7), MySQL raises an error if narrowing would truncate existing data. Fixed to describe both modes.

4. **JSON validation claim was incomplete**: The post stated "MySQL validates JSON on insert/update after the type change," implying validation only happens post-ALTER. In reality, MySQL validates existing data during the ALTER TABLE itself — if any value is not valid JSON, the operation fails. Fixed to clarify both behaviors.

## Review Notes
- The introductory text about the Online DDL section was updated to accurately describe which operations support INPLACE vs COPY, including the VARCHAR length byte threshold rule.
- The summary section was updated to remove the incorrect reference to `ALGORITHM=INSTANT` for MODIFY COLUMN operations.
