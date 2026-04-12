# Validation Summary: How to Design One-to-One Relationships in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB foreign keys, unique constraints, transactions)
- SQL DDL (CREATE TABLE, PRIMARY KEY, FOREIGN KEY, UNIQUE KEY)
- SQL DML (INSERT, SELECT, JOIN)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE syntax: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — Foreign Key Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — LAST_INSERT_ID(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id
- MySQL 8.0 Reference Manual — START TRANSACTION: https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual — JOIN syntax: https://dev.mysql.com/doc/refman/8.0/en/join.html

## Issues Found
No technical issues found.

## Review Notes
- The phrase "saves a join column" (in the Shared Primary Key section) is slightly informal — it saves having a separate auto-increment `id` column, not a join column per se — but the meaning is clear in context and not technically wrong.
- The term "deferred approach" in the Enforcing Not-Null Existence section is used colloquially to mean "handle atomicity via a transaction." This should not be confused with PostgreSQL's DEFERRABLE constraint feature, which MySQL does not support. The code example correctly demonstrates a transaction-based approach.
- MySQL does not provide a way to enforce that a child row must always exist for every parent row at the schema level (no deferred constraints). The transaction approach shown is the standard practical solution.
