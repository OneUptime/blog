# Validation Summary: What Is an AUTO_INCREMENT Column in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- AUTO_INCREMENT attribute
- LAST_INSERT_ID() function
- INFORMATION_SCHEMA

## Sources Consulted
- MySQL 8.0 Reference Manual: AUTO_INCREMENT Handling in InnoDB — https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html
- MySQL 8.0 Reference Manual: CREATE TABLE — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: LAST_INSERT_ID() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id
- MySQL 8.0 Reference Manual: TRUNCATE TABLE — https://dev.mysql.com/doc/refman/8.0/en/truncate-table.html
- MySQL 8.0 Reference Manual: Integer Types — https://dev.mysql.com/doc/refman/8.0/en/integer-types.html

## Issues Found
1. **Summary section: "sequential integers per connection"** — The phrase "It automatically produces unique, sequential integers per connection" incorrectly implies that each connection has its own AUTO_INCREMENT sequence. In reality, the AUTO_INCREMENT counter is per-table and shared across all connections. It is the `LAST_INSERT_ID()` return value that is connection-scoped. Fixed by removing "per connection" from the sentence.

## Review Notes
- The gap behavior section states "AUTO_INCREMENT values are never reused, even after deletes or rollbacks." This is fully accurate for MySQL 8.0+, where the counter is persisted in the redo log. In MySQL 5.7 and earlier, the in-memory counter was recalculated as MAX(id)+1 on server restart, which could reuse values from deleted rows. Since the post targets MySQL 8, this is correct as written but worth noting for version context.
- The code examples are presented as semi-independent sections. The ALTER TABLE AUTO_INCREMENT = 1000 example and the gap behavior example work correctly when read as standalone illustrations, though they would conflict if treated as a continuous narrative.
- The `LAST_INSERT_ID(expr)` sequence generator pattern is a well-documented MySQL idiom and is correctly presented.
