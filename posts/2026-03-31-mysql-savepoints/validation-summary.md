# Validation Summary: How to Use Savepoints in MySQL Transactions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL (DDL, DML, transactions)
- MySQL savepoints (SAVEPOINT, ROLLBACK TO SAVEPOINT, RELEASE SAVEPOINT)
- MySQL CHECK constraints (8.0.16+)
- MySQL stored procedures

## Sources Consulted
- MySQL 8.0 Reference Manual — SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT Statements: https://dev.mysql.com/doc/refman/8.0/en/savepoint.html
- MySQL 8.0 Reference Manual — CHECK Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual — User-Defined Variables: https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.0 Server Error Reference (ER_CHECK_CONSTRAINT_VIOLATED / Error 3819): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found
1. **Stored procedure example used an unused variable and hardcoded savepoint name.** The procedure declared `v_savepoint` and set it to `CONCAT('batch_item_', i)` but never used it — the SAVEPOINT statement used the hardcoded name `batch_item_1` instead. MySQL does not allow variables as savepoint identifiers (they must be literal identifiers), so the variable could never be used directly. Additionally, the procedure had no error handling, making the savepoints ineffective. **Fix:** Removed the unused `v_savepoint` variable, renamed the savepoint to `current_item` (overwritten each iteration, which is a valid pattern), and added a `DECLARE CONTINUE HANDLER FOR SQLEXCEPTION` that performs `ROLLBACK TO SAVEPOINT current_item` to demonstrate the actual working pattern.

## Review Notes
- The CHECK constraint syntax used (`CONSTRAINT chk_stock CHECK (stock_qty >= 0)`) requires MySQL 8.0.16 or later. The post does not specify a version requirement. Since MySQL 5.7 reached end of life in October 2023, this is reasonable but could be noted for readers on older versions.
- The post does not mention that `ROLLBACK TO SAVEPOINT` deletes all savepoints that were set after the target savepoint. This is documented MySQL behavior and could be relevant for readers building complex savepoint hierarchies, but is acceptable to omit in an introductory tutorial.
- InnoDB does not release row locks stored in memory after a `ROLLBACK TO SAVEPOINT` (though locks on newly inserted rows are released). This is a performance consideration not covered in the post, which is acceptable for a tutorial audience.
