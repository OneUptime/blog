# Validation Summary: How to Handle MySQL Error Handling Best Practices

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- MySQL (error codes, SQLSTATE, stored procedures, SIGNAL, DECLARE HANDLER)
- Python (PyMySQL library)
- SQL (DDL, DML, constraint handling, deadlock recovery)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server Error Message Reference: https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
- MySQL 8.0 Reference Manual — DECLARE ... HANDLER Statement: https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html
- MySQL 8.0 Reference Manual — SIGNAL Statement: https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual — INSERT ... SET Syntax: https://dev.mysql.com/doc/refman/8.0/en/insert.html
- PyMySQL documentation and source code (Connection vs Cursor API): https://pymysql.readthedocs.io/en/latest/

## Issues Found

1. **Error 1205 SQLSTATE was incorrect**: Listed as `40001` but MySQL's ER_LOCK_WAIT_TIMEOUT (1205) has SQLSTATE `HY000`. Only error 1213 (deadlock) uses SQLSTATE `40001`. Fixed to `HY000`.

2. **EXIT HANDLER description was incorrect**: The post stated the EXIT HANDLER "rolls back to the statement that triggered it." This is wrong — EXIT HANDLERs do not perform any automatic rollback. They execute the handler body and then exit the enclosing BEGIN...END block. MySQL does not implement UNDO handlers. Fixed the description to accurately explain EXIT HANDLER behavior.

3. **`conn.execute()` is not valid in PyMySQL**: The `create_user` and `safe_insert` functions called `conn.execute()` directly on a PyMySQL connection object. PyMySQL's `Connection` class does not have an `execute()` method — you must create a `Cursor` via `conn.cursor()` and call `cursor.execute()`. Fixed both functions to use `with conn.cursor() as cursor:` pattern.

4. **Missing DELIMITER in transfer_funds procedure**: The first stored procedure example correctly used `DELIMITER $$` / `DELIMITER ;` wrapping, but the `transfer_funds` procedure omitted it. Without the delimiter change, semicolons inside the procedure body would prematurely terminate the CREATE PROCEDURE statement in a MySQL client. Added `DELIMITER $$` / `DELIMITER ;` wrapping and changed the final `END;` to `END $$`.

## Review Notes
- The `safe_insert` function uses f-string interpolation for the table name (`f"INSERT INTO {table} SET ..."`), which is a SQL injection risk. This is tangential to the post's error handling focus, but readers should be cautioned that table/column names should be validated against an allowlist rather than interpolated directly.
- The `transfer_funds` procedure does not wrap its operations in an explicit transaction (START TRANSACTION / COMMIT). While it can be called within an external transaction, a financial transfer example would benefit from noting that the caller must manage the transaction boundary for atomicity.
- The deadlock retry function creates a new connection on each retry attempt. This is a valid approach but may be expensive; reusing the same connection after rollback is more common in practice.
