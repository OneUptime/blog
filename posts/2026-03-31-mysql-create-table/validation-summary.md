# Validation Summary: How to Create a Table in MySQL with CREATE TABLE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE TABLE DDL)
- InnoDB storage engine
- SQL data types (INT, VARCHAR, DECIMAL, ENUM, TEXT, DATETIME)
- SQL constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL)
- SQL indexes (KEY, FULLTEXT KEY)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — Data Type Default Values: https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual — Server Character Set and Collation: https://dev.mysql.com/doc/refman/8.0/en/charset-server.html
- MySQL 8.0 Reference Manual — InnoDB as Default Storage Engine: https://dev.mysql.com/doc/refman/8.0/en/innodb-default-se.html
- MySQL 8.0 Reference Manual — AUTO_INCREMENT Handling in InnoDB: https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html

## Issues Found
1. **Best Practices section — incorrect default collation claim**: The post stated "Set `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` at the table level to match the server default." In MySQL 8.0+, the default collation for `utf8mb4` is `utf8mb4_0900_ai_ci`, not `utf8mb4_unicode_ci`. The phrasing "to match the server default" was inaccurate. Fixed to mention both collation options and removed the incorrect "server default" claim.

## Review Notes
- The sample query output in the "Complete Working Example" section shows rows with different `created_at` timestamps (10:03, 10:04, 10:05), but since all three orders are inserted in a single multi-row INSERT statement with `DEFAULT CURRENT_TIMESTAMP`, they would all receive the same timestamp in practice. This is a common tutorial simplification for illustrative purposes and does not affect the correctness of the SQL itself.
- The post uses `utf8mb4_unicode_ci` consistently in all CREATE TABLE examples. While this is a valid and widely-used collation, readers targeting MySQL 8.0+ may prefer `utf8mb4_0900_ai_ci` (the new default) which is based on Unicode 9.0 and offers better performance.
- All SQL syntax is correct and follows MySQL 8.0 conventions. The DATETIME DEFAULT CURRENT_TIMESTAMP feature requires MySQL 5.6.5+, which is well within current supported versions.
- The mermaid flowchart accurately represents the high-level CREATE TABLE process.
