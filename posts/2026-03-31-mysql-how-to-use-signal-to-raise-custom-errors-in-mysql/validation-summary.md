# Validation Summary: How to Use SIGNAL to Raise Custom Errors in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SIGNAL, RESIGNAL, stored procedures, triggers)
- Python (mysql-connector-python)

## Sources Consulted
- MySQL 8.0 Reference Manual: SIGNAL Statement — https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual: RESIGNAL Statement — https://dev.mysql.com/doc/refman/8.0/en/resignal.html
- MySQL 8.0 Reference Manual: DECLARE ... CONDITION Statement — https://dev.mysql.com/doc/refman/8.0/en/declare-condition.html
- MySQL 8.0 Reference Manual: Scope Rules for Handlers — https://dev.mysql.com/doc/refman/8.0/en/stored-program-variables.html
- mysql-connector-python API reference — https://dev.mysql.com/doc/connector-python/en/

## Issues Found
- **Parameter/column name shadowing in `update_inventory` procedure**: The procedure had a parameter named `product_id` and used `WHERE product_id = product_id` in an UPDATE statement. In MySQL stored procedures, when a SQL statement references a name that matches both a column and a parameter, the column name takes precedence. This caused the WHERE clause to compare the column to itself (always true for non-NULL values), updating ALL rows instead of just the target row. The `ROW_COUNT() = 0` check would also never trigger correctly. Fixed by prefixing parameters with `p_` (`p_product_id`, `p_qty_change`) to avoid ambiguity.

## Review Notes
- The SIGNAL syntax, SQLSTATE codes ('45000', '23000', '22007'), condition information items, RESIGNAL usage, named conditions, and Python error handling are all technically correct.
- The email REGEXP pattern in the named conditions example uses `{2,}` quantifier, which requires MySQL 8.0+ (ICU regex engine). MySQL 5.x used Henry Spencer's regex library which did not support `{n,m}` quantifiers. This is acceptable since MySQL 8.0 is the current supported version.
- The `transfer_funds` procedure avoids the same parameter/column shadowing issue because its parameters (`from_account`, `to_account`, `amount`) do not share names with the referenced columns (`id`, `balance`).
