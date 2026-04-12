# Validation Summary: How to Choose Between DELETE and TRUNCATE in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (DELETE, TRUNCATE TABLE statements)
- InnoDB storage engine
- SQL DDL vs DML classification
- AUTO_INCREMENT behavior
- MySQL triggers
- MySQL transactions and rollback
- Foreign key constraints

## Sources Consulted
- MySQL 8.0 Reference Manual: TRUNCATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/truncate-table.html
- MySQL 8.0 Reference Manual: DELETE Statement — https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual: Statements That Cause an Implicit Commit — https://dev.mysql.com/doc/refman/8.0/en/implicit-commit.html
- MySQL 8.0 Reference Manual: AUTO_INCREMENT Handling in InnoDB — https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: InnoDB and FOREIGN KEY Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html

## Issues Found
1. **Inaccurate rollback explanation for TRUNCATE**: The post stated TRUNCATE "cannot be rolled back in most storage engines." In MySQL, TRUNCATE TABLE is a DDL statement that causes an implicit commit both before and after execution — this applies to all storage engines, not "most." The qualifier was misleading. Changed to: "causes an implicit commit before and after executing, so it cannot be rolled back."

## Review Notes
- The post correctly notes that in InnoDB, DELETE FROM (without WHERE) on a large table is slow due to per-row undo log generation. This is accurate.
- The AUTO_INCREMENT behavior described (DELETE preserves the counter, TRUNCATE resets it) is accurate for MySQL 8.0+. In MySQL 5.7 and earlier, the InnoDB auto-increment counter was stored only in memory, so a DELETE of all rows followed by a server restart could effectively reset it. This version-specific nuance is not mentioned but is a minor edge case.
- The foreign key constraint behavior is correctly described: TRUNCATE fails if any FK references exist on the table, regardless of whether the referencing table has rows.
- All SQL syntax examples are correct and would execute as described.
