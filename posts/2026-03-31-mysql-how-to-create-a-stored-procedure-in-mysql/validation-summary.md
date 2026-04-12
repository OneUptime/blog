# Validation Summary: How to Create a Stored Procedure in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored procedures, DELIMITER, CREATE PROCEDURE, CALL, DECLARE, GRANT EXECUTE)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: CALL Statement — https://dev.mysql.com/doc/refman/8.0/en/call.html
- MySQL 8.0 Reference Manual: DECLARE Statement for Local Variables — https://dev.mysql.com/doc/refman/8.0/en/declare-local-variable.html
- MySQL 8.0 Reference Manual: ALTER PROCEDURE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-procedure.html
- MySQL 8.0 Reference Manual: SHOW PROCEDURE STATUS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-procedure-status.html
- MySQL 8.0 Reference Manual: Local Variable Scope and Resolution — https://dev.mysql.com/doc/refman/8.0/en/local-variable-scope.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html

## Issues Found
No technical issues found.

## Review Notes
- The `GetOrdersByCustomer` procedure uses a parameter named `customer_id` which matches the column name `orders.customer_id`. The code works correctly because the column reference is table-qualified (`o.customer_id`), and MySQL resolves the unqualified `customer_id` to the parameter. However, this is a well-known pitfall — if the table alias were omitted, MySQL would interpret both sides as the parameter, making the WHERE clause always true. A safer convention is to prefix parameters (e.g., `p_customer_id`), but since the code as written is functionally correct, no change was made.
- The post description mentions "control flow" but no control flow constructs (IF, LOOP, WHILE, CASE) are demonstrated. This is a content scope issue rather than a technical error.
- The post covers only IN parameters. OUT and INOUT parameters are not discussed, which is fine for an introductory tutorial but worth noting for potential future expansion.
