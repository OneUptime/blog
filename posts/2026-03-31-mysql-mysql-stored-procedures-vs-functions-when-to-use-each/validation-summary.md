# Validation Summary: MySQL Stored Procedures vs Functions: When to Use Each

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL stored procedures
- MySQL stored functions
- SQL (DDL, DML, parameter modes)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: Stored Routines and MySQL Privileges — https://dev.mysql.com/doc/refman/8.0/en/stored-routines-privileges.html
- MySQL 8.0 Reference Manual: Local Variable Scope and Resolution — https://dev.mysql.com/doc/refman/8.0/en/local-variable-scope.html
- MySQL 8.0 Reference Manual: SHOW PROCEDURE STATUS / SHOW FUNCTION STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-procedure-status.html
- MySQL 8.0 Reference Manual: SQL Syntax for Prepared Statements (SELECT clause ordering) — https://dev.mysql.com/doc/refman/8.0/en/select.html

## Issues Found

1. **Parameter name shadows column name in `GetCustomerOrderCount` function.**
   - **What was wrong:** The function parameter was named `customer_id`, identical to the column `customer_id` in the `orders` table. In the WHERE clause `WHERE customer_id = customer_id`, MySQL resolves both references to the parameter/variable, making the condition always true (or NULL). This means the function would return the total count of all orders rather than orders for the specified customer.
   - **What was changed:** Renamed the parameter from `customer_id` to `cust_id` and updated the WHERE clause to `WHERE customer_id = cust_id`.
   - **Why:** MySQL's name resolution gives precedence to local variables/parameters over column names. When both share the same name, the column reference is silently replaced by the variable, producing incorrect results.

2. **Invalid SQL clause ordering in "When to Use a Stored Function" example.**
   - **What was wrong:** The query had `JOIN` after `WHERE`, which is syntactically invalid SQL: `SELECT * FROM orders WHERE ... JOIN customers c ON ...`.
   - **What was changed:** Moved the `JOIN` clause before the `WHERE` clause: `SELECT * FROM orders JOIN customers c ON ... WHERE ...`.
   - **Why:** SQL requires FROM/JOIN clauses before WHERE. The original query would produce a syntax error.

## Review Notes
- The `TransferFunds` procedure uses parameter names (`from_account`, `to_account`, `amount`) that match column names in the `transfers` table INSERT statement. This works correctly because in the `VALUES(...)` context MySQL resolves these to the parameters, but it is a fragile pattern. A future revision could prefix parameters (e.g., `p_from_account`) for clarity.
- The `ArchiveOldOrders` procedure uses `ROW_COUNT()` after the DELETE statement, which returns the count of deleted rows specifically (not the inserted rows). Since both the INSERT and DELETE target the same set of rows, the count is effectively correct, but readers should be aware that `ROW_COUNT()` reflects only the most recent statement.
- The claim that functions "cannot modify database state (no DML inside a function by default)" is a simplification. MySQL functions can contain DML if declared with `MODIFIES SQL DATA`, though binary logging restrictions and privilege requirements make this non-trivial to set up. The "by default" qualifier makes the claim acceptable.
- The `\G` suffix in `SHOW CREATE PROCEDURE GetOrdersByStatus\G` is a mysql client formatting directive, not part of SQL syntax. This is fine for a blog post targeting mysql CLI users but would not work in all MySQL client tools.
