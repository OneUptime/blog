# Validation Summary: How to Apply Second Normal Form (2NF) in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE TABLE, PRIMARY KEY, FOREIGN KEY, AUTO_INCREMENT, JOIN)
- Database normalization (Second Normal Form / 2NF)
- Relational schema design (composite keys, partial dependencies)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — FOREIGN KEY Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — Data Types (INT, DECIMAL, VARCHAR, CHAR): https://dev.mysql.com/doc/refman/8.0/en/data-types.html
- Codd, E.F. "Further Normalization of the Data Base Relational Model" — original definition of 2NF

## Issues Found
No technical issues found.

## Review Notes
- The post's definition of 2NF focuses on the primary key. Strictly, 2NF requires full functional dependency on every candidate key, but the simplified primary-key-focused definition is standard in educational materials and correct for the examples shown.
- The `order_items` foreign key references an `orders` table that is not defined in the post. This is not an error — it is implied context — but readers running the SQL verbatim would need to create the `orders` table first.
- The `unit_price` rationale (historical snapshot depending on both order and product) is a sound design justification for keeping it in the composite-key table.
