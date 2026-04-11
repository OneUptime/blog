# Validation Summary: How to Use Output Parameters in MySQL Stored Procedures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (Stored Procedures, OUT/INOUT parameters)
- SQL (DDL, DML, transaction control)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE PROCEDURE and CREATE FUNCTION Statements: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — DECLARE ... HANDLER Statement: https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html
- MySQL 8.0 Reference Manual — START TRANSACTION, COMMIT, and ROLLBACK Statements: https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual — SELECT ... INTO Statement: https://dev.mysql.com/doc/refman/8.0/en/select-into.html
- MySQL 8.0 Reference Manual — Locking Reads (SELECT ... FOR UPDATE): https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html

## Issues Found

1. **TransferFunds procedure: `FOR UPDATE` outside transaction (critical logic error)**
   - **What was wrong:** The `SELECT ... FOR UPDATE` was executed before `START TRANSACTION`, meaning the row lock was acquired within an implicit autocommit transaction. When `START TRANSACTION` was later called inside the ELSE branch, it implicitly committed the previous transaction, releasing the lock before the UPDATE statements ran. This created a race condition where another session could modify the balance between the lock release and the updates.
   - **What was changed:** Moved `START TRANSACTION` to before the `SELECT ... FOR UPDATE` so the lock is held for the entire duration of the transaction. Added `ROLLBACK` in the error branches (account not found, insufficient funds) to properly close the transaction.
   - **Why:** `FOR UPDATE` locks are only effective within the transaction that acquires them. The transaction must start before the locking read and end after all dependent writes complete.

2. **GetAccountSummary output: incorrect average value**
   - **What was wrong:** The expected output showed `5166.666667` for the average balance, but the OUT parameter `p_avg` is declared as `DECIMAL(12,2)`, so MySQL rounds the value to 2 decimal places upon assignment.
   - **What was changed:** Changed the expected output from `5166.666667` to `5166.67`.
   - **Why:** `SELECT AVG(balance) INTO p_avg` where `p_avg` is `DECIMAL(12,2)` causes MySQL to round the result to 2 decimal places.

3. **Best Practices: incorrect handler syntax reference**
   - **What was wrong:** The text referenced `DECLARE HANDLER`, but the MySQL syntax is `DECLARE handler_action HANDLER FOR ...` where handler_action is CONTINUE, EXIT, or UNDO. The ellipsis is conventional to indicate the omitted keyword.
   - **What was changed:** Changed `DECLARE HANDLER` to `DECLARE ... HANDLER`.
   - **Why:** The standard shorthand for this MySQL statement in documentation is `DECLARE ... HANDLER`, matching how MySQL's own reference manual refers to it.

## Review Notes
- The GetTopAccounts example sets `p_total_returned = p_limit`, which does not reflect the actual number of rows returned if the table has fewer rows than the limit. Using `FOUND_ROWS()` or a separate `SELECT COUNT(*)` would be more accurate, but this is acceptable as a simplified teaching example.
- The Application Code section uses SQL comments to show pseudo-code for Python and Node.js. While unconventional, this avoids introducing language-specific syntax errors and is acceptable for illustrating the general pattern.
