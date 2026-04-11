# Validation Summary: How to Use MySQL for Inventory Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB, stored procedures, transactions)
- SQL DDL (CREATE TABLE, CHECK constraints, FOREIGN KEY, ENUM, INDEX)
- SQL DML (SELECT FOR UPDATE, UPDATE, INSERT)
- Stored procedures (DELIMITER, SIGNAL, ROW_COUNT())

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — CHECK Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual — SELECT ... FOR UPDATE: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual — CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — SIGNAL Statement: https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual — ROW_COUNT(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count

## Issues Found
- **"Confirming a Sale" code block missing stored procedure wrapper**: The code used stored procedure constructs (`IF/END IF`, `SIGNAL`, `ROW_COUNT()` in conditional flow, and unbound `p_`-prefixed parameter variables) but was presented as standalone SQL without a `CREATE PROCEDURE` block. This would cause a syntax error if executed directly. Fixed by wrapping it in a `DELIMITER $$ CREATE PROCEDURE confirm_sale(...) BEGIN ... END $$ DELIMITER ;` block, consistent with how the `reserve_stock` procedure was presented earlier in the post.

## Review Notes
- `CHECK` constraints are only enforced in MySQL 8.0.16+. Earlier versions parse but silently ignore them. The post does not mention a minimum version requirement, which could mislead users on older MySQL installations.
- The `stock_movements` table has no foreign key back to `products`. This is a valid design choice (avoids FK locking overhead and allows flexible reference_id values) but means referential integrity for movements relies on application logic.
- The `reserve_stock` procedure does not handle the case where the product does not exist in the `inventory` table. If `product_id` is missing, `v_available` would be NULL, the `IF` check would not trigger (NULL comparisons are falsy), and the subsequent UPDATE would affect 0 rows — silently succeeding without actually reserving anything. For a production system, a NULL check on `v_available` would be advisable.
