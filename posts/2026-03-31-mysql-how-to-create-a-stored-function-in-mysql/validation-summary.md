# Validation Summary: How to Create a Stored Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored functions, stored procedures)
- SQL (DDL, DML, DELIMITER, GRANT)
- MySQL binary logging configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE FUNCTION Statement (https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html)
- MySQL 8.0 Reference Manual: Stored Routines and Binary Logging (https://dev.mysql.com/doc/refman/8.0/en/stored-programs-logging.html)
- MySQL 8.0 Reference Manual: SHOW FUNCTION STATUS (https://dev.mysql.com/doc/refman/8.0/en/show-function-status.html)
- MySQL 8.0 Reference Manual: GRANT Statement (https://dev.mysql.com/doc/refman/8.0/en/grant.html)

## Issues Found

1. **`GetCustomerTotalOrders` incorrectly marked as `DETERMINISTIC`**: This function reads from the `orders` table, so the same `p_customer_id` input can return different results as orders are added or removed. Changed to `NOT DETERMINISTIC`.

2. **`GetDiscountPct` incorrectly marked as `DETERMINISTIC`**: Same issue as above — it queries the `orders` table to count rows, so output depends on mutable table state, not just the input parameter. Changed to `NOT DETERMINISTIC`.

3. **`DaysUntilExpiry` incorrectly marked as `READS SQL DATA`**: This function does not read from any table. It only uses the built-in `CURDATE()` function and its input parameter. Changed to `NO SQL`, which is consistent with the `FullName` example earlier in the post and is the appropriate characteristic for functions that don't access table data.

4. **Comparison table: "Limited (cannot call CALL)" for stored functions was inaccurate**: Since MySQL 5.5+, stored functions can use `CALL` to invoke stored procedures, provided the procedure does not return result sets. The actual key restriction is that stored functions cannot return result sets. Changed to "Yes (cannot return result sets)".

## Review Notes
- The overall structure and explanations are clear and well-organized.
- The `log_bin_trust_function_creators` section is accurate. Note that in MySQL 8.0.34+, this variable is deprecated in favor of requiring proper `DETERMINISTIC`/`NO SQL`/`READS SQL DATA` declarations, but it still functions.
- All SQL syntax (DELIMITER, CREATE FUNCTION, SHOW FUNCTION STATUS, DROP FUNCTION, GRANT EXECUTE) is correct.
- The distinction between `RETURNS` (clause) and `RETURN` (statement) is a helpful and accurate note for readers.
