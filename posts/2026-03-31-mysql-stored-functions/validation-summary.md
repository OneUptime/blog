# Validation Summary: How to Use MySQL Stored Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored functions, DELIMITER, CREATE FUNCTION, RETURNS, DETERMINISTIC, READS SQL DATA)
- SQL (DDL, DML, scalar expressions, ROUND, IFNULL, DECIMAL arithmetic)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE FUNCTION Statement: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — Stored Routines and MySQL Privileges: https://dev.mysql.com/doc/refman/8.0/en/stored-routines-privileges.html
- MySQL 8.0 Reference Manual — SHOW FUNCTION STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-function-status.html
- MySQL 8.0 Reference Manual — Precision Math: https://dev.mysql.com/doc/refman/8.0/en/precision-math.html
- MySQL 8.0 Reference Manual — Mathematical Functions (ROUND): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_round

## Issues Found

1. **Incorrect computed output for `profit_margin_pct` function**: Three of the five output values in the result table were wrong.
   - Mouse: was `66.62`, corrected to `66.69` — `ROUND((29.99 - 10.00) / 29.99 * 100, 2) = 66.69`
   - Keyboard: was `66.64`, corrected to `66.66` — `ROUND((59.99 - 20.00) / 59.99 * 100, 2) = 66.66`
   - Chair: was `54.99`, corrected to `55.00` — `ROUND((199.99 - 90.00) / 199.99 * 100, 2) = 55.00`

2. **Missing `category` column in `products` table**: The `get_category_avg_price` function references `WHERE category = p_category`, but the `products` table in the setup section had no `category` column. Added a `category VARCHAR(50)` column to the table definition and populated it in the INSERT statements (Electronics for Laptop/Mouse/Keyboard, Furniture for Desk/Chair).

3. **Misleading comment about JOIN ON condition**: A SQL comment stated "Use function in a join's ON condition (less common but valid)" but the function was actually used in the SELECT list, not the ON clause. Changed to "Use function in a query with a JOIN".

## Review Notes
- The note about `DETERMINISTIC` with `READS SQL DATA` is accurate — MySQL does not enforce the semantic correctness of the DETERMINISTIC declaration, so users should understand this is a pragmatic choice rather than a strict guarantee.
- The section labeled "Required attributes" lists four characteristics (DETERMINISTIC, NOT DETERMINISTIC, READS SQL DATA, MODIFIES SQL DATA). Technically these are not all required — MySQL defaults to NOT DETERMINISTIC and CONTAINS SQL if unspecified. However, when binary logging is enabled (common in production), MySQL requires either DETERMINISTIC or the SUPER/SET_USER_ID privilege, making explicit declaration effectively required in practice. The current wording is acceptable.
- The `CONTAINS SQL` and `NO SQL` data access characteristics are not mentioned. These are less commonly used but exist. Not a correctness issue, just a completeness observation.
