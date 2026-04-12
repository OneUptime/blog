# Validation Summary: How to Implement a Follow/Follower System in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL DDL (CREATE TABLE, indexes, foreign keys, CHECK constraints)
- SQL stored procedures (DELIMITER, CREATE PROCEDURE)
- SQL queries (JOINs, subqueries, EXISTS, GROUP BY, aggregation)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: CHECK Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE / INSERT IGNORE — https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual: ROW_COUNT() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual: CREATE PROCEDURE — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: GREATEST() — https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html#function_greatest

## Issues Found
No technical issues found.

## Review Notes
- The `CHECK (follower_id != followee_id)` constraint is only enforced in MySQL 8.0.16+. In earlier versions, it is parsed but silently ignored. The post does not specify a minimum MySQL version, but MySQL 8.0 is the current supported major version so this is acceptable.
- The stored procedures do not wrap operations in explicit transactions. If the INSERT succeeds but an UPDATE fails, denormalized counts could become inconsistent. For a production system, wrapping the operations in `START TRANSACTION ... COMMIT` would be more robust, but this is a design improvement rather than a correctness error.
- The Activity Feed section references a `posts` table that is not defined in the schema. This is clearly illustrative and not an error — the section demonstrates how to combine the follows table with other application tables.
