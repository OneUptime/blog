# Validation Summary: How to Call One Stored Procedure from Another in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored procedures, CALL statement, DELIMITER, SIGNAL/HANDLER, OUT/INOUT parameters)
- SQL (DDL, DML, ETL patterns)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements (https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html)
- MySQL 8.0 Reference Manual: CALL Statement (https://dev.mysql.com/doc/refman/8.0/en/call.html)
- MySQL 8.0 Reference Manual: SIGNAL Statement (https://dev.mysql.com/doc/refman/8.0/en/signal.html)
- MySQL 8.0 Reference Manual: DECLARE ... HANDLER Statement (https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html)
- MySQL 8.0 Reference Manual: Server System Variables — max_sp_recursion_depth (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_sp_recursion_depth)

## Issues Found
No technical issues found.

## Review Notes
- The `get_discount` procedure declares an `IN p_order_total DECIMAL(10,2)` parameter that is never used in the procedure body. This is not a technical error (the SQL is valid), but a minor code quality observation. The parameter could be useful for future discount logic based on order total (e.g., volume discounts), so it is reasonable to leave it as-is in an illustrative example.
- The `TRUNCATE TABLE` in `load_processed_data()` is a DDL statement that causes an implicit commit in MySQL. This is fine in the ETL context shown but would be worth noting if the procedure were used inside a transaction.
- All code examples use correct MySQL syntax and would execute successfully given the appropriate table schemas.
