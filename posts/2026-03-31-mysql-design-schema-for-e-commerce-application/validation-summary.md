# Validation Summary: How to Design a Schema for an E-Commerce Application in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, DML, ENUM types, foreign keys, composite indexes)
- SQL schema design patterns (normalization, denormalization of unit price)
- E-commerce domain modeling (products, inventory, customers, orders, payments)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — DECIMAL Data Type: https://dev.mysql.com/doc/refman/8.0/en/fixed-point-types.html
- MySQL 8.0 Reference Manual — ENUM Type: https://dev.mysql.com/doc/refman/8.0/en/enum.html
- MySQL 8.0 Reference Manual — Foreign Key Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — AUTO_INCREMENT: https://dev.mysql.com/doc/refman/8.0/en/example-auto-increment.html
- MySQL 8.0 Reference Manual — GROUP BY Handling (ONLY_FULL_GROUP_BY and functional dependence): https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- MySQL 8.0 Reference Manual — Date and Time Functions (CURDATE, DATE_FORMAT, INTERVAL): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html

## Issues Found
No technical issues found.

## Review Notes
- All six CREATE TABLE statements are syntactically correct and use appropriate MySQL data types.
- Foreign key relationships correctly model the entity graph: products <- inventory, customers <- addresses, customers/addresses <- orders, orders/products <- order_items, orders <- payments.
- The `ON DELETE CASCADE` on addresses, order_items is a reasonable design choice for cascading deletes.
- The composite index `(customer_id, status)` on orders is well-chosen for the described query patterns.
- The second query uses `DATE_FORMAT(NOW(), '%Y-%m-01')` which returns a string; MySQL performs implicit type conversion when comparing to the DATETIME column. This works correctly but an alternative like `DATE(DATE_FORMAT(NOW(), '%Y-%m-01'))` or `DATE_SUB(LAST_DAY(NOW()), INTERVAL DAY(LAST_DAY(NOW()))-1 DAY)` could make the intent more explicit. This is a style preference, not an error.
- The `GROUP BY p.id` with `p.name` in SELECT is valid under MySQL 5.7.5+ default ONLY_FULL_GROUP_BY mode because `p.name` is functionally dependent on the primary key `p.id`.
- The post correctly advises using DECIMAL for monetary values and denormalizing unit_price into order_items for historical price accuracy.
