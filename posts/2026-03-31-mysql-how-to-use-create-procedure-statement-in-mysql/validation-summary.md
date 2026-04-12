# Validation Summary: How to Use CREATE PROCEDURE Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE PROCEDURE, stored procedures)
- SQL (DELIMITER, CALL, DECLARE, cursors, handlers)
- Python (mysql-connector-python library)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: DECLARE ... HANDLER Statement — https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html
- MySQL 8.0 Reference Manual: Cursor DECLARE Statement — https://dev.mysql.com/doc/refman/8.0/en/declare-cursor.html
- MySQL 8.0 Reference Manual: CALL Statement — https://dev.mysql.com/doc/refman/8.0/en/call.html
- MySQL Connector/Python Developer Guide: cursor.callproc() — https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-callproc.html

## Issues Found
1. **Python code used `stored_results()` instead of `callproc()` return value for OUT parameter.**
   - **What was wrong:** The Python example called `cursor.callproc('get_order_total', [42, 0])` and then iterated over `cursor.stored_results()` to get the OUT parameter value. However, `get_order_total` uses `SELECT ... INTO` which does not produce a result set — it assigns the value to the OUT parameter directly. `stored_results()` returns result sets from SELECT statements that are not `SELECT ... INTO`, so it would yield nothing useful here.
   - **What was changed:** Replaced the code to capture the return value of `callproc()` (`result_args = cursor.callproc(...)`) and access the OUT parameter via `result_args[1]`, which is the correct way to retrieve OUT parameter values with mysql-connector-python.
   - **Why:** `callproc()` returns a modified copy of the input argument list where OUT and INOUT parameters are replaced with their result values. This is the documented approach for retrieving OUT parameters.

## Review Notes
- All SQL syntax (CREATE PROCEDURE, DELIMITER, parameter modes, IF/ELSEIF/ELSE, cursor loops, DECLARE HANDLER) is correct and follows current MySQL 8.0 conventions.
- The declaration order in the cursor example (variables, then cursor, then handler) is correct per MySQL requirements.
- Error code 1062 for duplicate key violations is accurate.
- The `\G` usage in SHOW statements is a valid mysql client formatting directive.
