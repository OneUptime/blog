# Validation Summary: How to Use SLEEP() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- MySQL SLEEP() function
- MySQL stored procedures
- MySQL Events
- MySQL replication
- MySQL prepared statements

## Sources Consulted
- MySQL 8.0 Reference Manual: SLEEP() function — https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_sleep
- MySQL 8.0 Reference Manual: Optimizer Hints (MAX_EXECUTION_TIME) — https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html
- MySQL 8.0 Reference Manual: GET_LOCK() — https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html#function_get-lock
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: CREATE EVENT — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: Replication and the Binary Log — https://dev.mysql.com/doc/refman/8.0/en/replication.html
- MySQL 8.0 Reference Manual: DO Statement — https://dev.mysql.com/doc/refman/8.0/en/do.html

## Issues Found

### 1. SELECT SLEEP() in stored procedure generates unwanted result sets
- **What was wrong:** The stored procedure used `SELECT SLEEP(0.5);` inside a WHILE loop. In a stored procedure, SELECT without INTO sends a result set to the client on every iteration, which is functionally problematic and not the intended behavior.
- **What was changed:** Replaced `SELECT SLEEP(0.5);` with `DO SLEEP(0.5);`. The DO statement executes the expression without producing a result set.

### 2. Replication lag example used a SELECT that would not be replicated
- **What was wrong:** The example used `SELECT SLEEP(10), COUNT(*) FROM large_table;` on the primary and claimed it would increase `Seconds_Behind_Master` on the replica. However, SELECT statements are read-only and are not written to the binary log, so they are never replicated. This query would have no effect on replication lag.
- **What was changed:** Replaced with `UPDATE test_table SET updated_at = NOW() WHERE id = 1 AND SLEEP(10) >= 0;` and added a note that this applies to statement-based replication. DML statements are written to the binary log, and in statement-based replication the SLEEP() will replay on the replica, genuinely causing lag.

## Review Notes
- `SHOW SLAVE STATUS` is deprecated as of MySQL 8.0.22 in favor of `SHOW REPLICA STATUS`, and the column `Seconds_Behind_Master` has been renamed to `Seconds_Behind_Source`. The post does not target a specific MySQL version, so both forms are acceptable, but readers on MySQL 8.0.22+ should use the newer syntax.
- The `GET_LOCK()` function can return NULL (on error, e.g., if the timeout is negative) in addition to 0 and 1. The stored procedure does not handle the NULL case, which in production code could cause an infinite loop. This is acceptable for a tutorial example but worth noting.
- The security section's "DANGEROUS" example uses `user_input` (without `@` prefix) which is not valid MySQL syntax for a variable — it's used as a conceptual placeholder, which is clear enough in context but could confuse beginners who try to run it literally.
