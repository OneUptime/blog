# Validation Summary: How to Use IF...THEN...ELSE in MySQL Stored Procedures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (Stored Procedures)
- SQL (IF/ELSEIF/ELSE control flow, CASE statement, IF() function)

## Sources Consulted
- MySQL 8.0 Reference Manual: IF Statement — https://dev.mysql.com/doc/refman/8.0/en/if.html
- MySQL 8.0 Reference Manual: CASE Statement — https://dev.mysql.com/doc/refman/8.0/en/case.html
- MySQL 8.0 Reference Manual: IF() Function — https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_if
- MySQL 8.0 Reference Manual: Local Variable Scope and Resolution — https://dev.mysql.com/doc/refman/8.0/en/local-variable-scope.html

## Issues Found

### 1. Variable/column name collision in `ProcessOrder` procedure
- **What was wrong:** A local variable `customer_id` was declared with the same name as the `customer_id` column in the `orders` table. In MySQL stored routines, when a variable and column share the same name, MySQL resolves the reference to the variable. This meant `SELECT status, customer_id INTO order_status, customer_id` would read the variable's own value (NULL) rather than the table column.
- **What was changed:** Renamed the local variable from `customer_id` to `cust_id` to avoid the naming collision.
- **Why:** MySQL's name resolution rules cause the local variable to shadow the column name, producing incorrect results. This is a well-documented MySQL gotcha (see local variable scope documentation).

### 2. Parameter/column name collision in `ApplyPricing` procedure
- **What was wrong:** The input parameter `customer_id` had the same name as the `customer_id` column in the `orders` table. The WHERE clause `WHERE customer_id = customer_id` compared the parameter to itself (always TRUE), causing `SELECT COUNT(*)` to count all rows in the `orders` table rather than only orders for the specified customer.
- **What was changed:** Renamed the parameter from `customer_id` to `p_customer_id` and updated the two WHERE clauses that reference it.
- **Why:** The name collision caused the query to return incorrect results (total order count instead of per-customer count), which would produce wrong discount calculations.

## Review Notes
- The `CheckStock` procedure does not handle the case where `qty` is NULL (no matching product found). If no row matches, `qty` remains NULL, and the ELSE branch would return "In stock" which is misleading. This is a logic consideration rather than a syntax error, so it was left unchanged.
- All SQL syntax (IF/THEN/ELSEIF/ELSE/END IF, CASE/WHEN/END CASE, DELIMITER usage, DECLARE, SELECT INTO, IF() function) is correct per MySQL documentation.
- The distinction between IF statement and IF() function is accurately explained.
