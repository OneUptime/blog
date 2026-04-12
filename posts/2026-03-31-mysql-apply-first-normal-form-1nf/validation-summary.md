# Validation Summary: How to Apply First Normal Form (1NF) in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, DML, foreign keys, AUTO_INCREMENT)
- Relational database normalization (First Normal Form / 1NF)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE syntax: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — FOREIGN KEY constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — GROUP BY handling / ONLY_FULL_GROUP_BY: https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- Codd, E.F. "A Relational Model of Data for Large Shared Data Banks" (1970) — original 1NF definition

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples are syntactically correct and use current, non-deprecated MySQL syntax.
- The 1NF definition aligns with Codd's original relational model and standard database textbook definitions.
- The GROUP BY clause in the count query correctly includes all non-aggregated columns (`o.id, o.customer`), which is required under the `ONLY_FULL_GROUP_BY` SQL mode enabled by default since MySQL 5.7.5.
- The INSERT for `order_items` assumes `AUTO_INCREMENT` assigns `id=1` to Alice's order on a fresh table, which is correct behavior for a clean setup as presented in the tutorial.
- The post could optionally mention MySQL's `JSON` column type as a modern alternative that still violates 1NF principles, but this is not an error — just a potential future enhancement.
