# Validation Summary: How to Implement a Likes/Votes System in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored procedures, transactions, composite primary keys, denormalized counters)
- SQL (DDL, DML, aggregate functions, JOIN patterns)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: START TRANSACTION, COMMIT, and ROLLBACK Statements — https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual: SELECT ... FOR UPDATE — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: UPDATE Syntax (multi-table UPDATE with JOIN) — https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual: GREATEST() function — https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html#function_greatest

## Issues Found

1. **Misleading section description**: The "Adding a Vote" section intro claimed "Use `INSERT ... ON DUPLICATE KEY UPDATE` to handle vote changes atomically" but the code actually uses a stored procedure with explicit SELECT/branching/INSERT/UPDATE/DELETE logic — no `INSERT ... ON DUPLICATE KEY UPDATE` was used anywhere. Fixed by changing the description to accurately reflect the stored procedure approach.

2. **Missing transaction in stored procedure**: The procedure performed a SELECT followed by separate INSERT/UPDATE/DELETE statements without any transaction boundaries. The summary claimed the procedure handled transitions "atomically," but without `START TRANSACTION`/`COMMIT`, concurrent calls for the same user/post could race (e.g., two requests reading NULL for existing_vote and both inserting). Fixed by adding `START TRANSACTION`, `SELECT ... FOR UPDATE` (to lock the row and prevent races), and `COMMIT`.

3. **Reconciliation query uses JOIN instead of LEFT JOIN**: The recount query used `JOIN` to match posts with their aggregated vote counts. Posts that had all their votes removed (no rows in the votes table) would not be matched by the subquery, leaving their denormalized counters stale instead of resetting them to 0. Fixed by changing to `LEFT JOIN` and wrapping the SET assignments with `COALESCE(..., 0)`.

## Review Notes
- The stored procedure does not validate that `p_vote_type` is 1 or -1. Passing any other value (e.g., 0 or 2) would insert an invalid vote and increment counters incorrectly. Input validation at the application layer is assumed but not enforced at the database level.
- The schema comment says "polymorphic - can handle multiple entity types" but the design is specific to a single `posts` table. A truly polymorphic design would need an `entity_type` column in the votes table. The comment is aspirational rather than accurate, but this is a minor documentation issue rather than a code error.
- The `SELECT ... FOR UPDATE` added to the fix will acquire no lock when the row does not exist (new vote case). InnoDB gap locks on the primary key range provide some protection, but under very high concurrency a duplicate key error is theoretically possible — the composite PRIMARY KEY will safely reject it, preventing data corruption.
