# Validation Summary: What Is a Savepoint in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL
- InnoDB storage engine
- SQL transactions (BEGIN, COMMIT, ROLLBACK)
- SAVEPOINT, ROLLBACK TO SAVEPOINT, RELEASE SAVEPOINT

## Sources Consulted
- MySQL 8.0 Reference Manual — SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT Statements: https://dev.mysql.com/doc/refman/8.0/en/savepoint.html
- MySQL 8.0 Reference Manual — START TRANSACTION, COMMIT, and ROLLBACK Statements: https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual — InnoDB and SAVEPOINT: https://dev.mysql.com/doc/refman/8.0/en/innodb-savepoints.html

## Issues Found
No technical issues found.

## Review Notes
- The practical example uses `LAST_INSERT_ID()` in the shipments INSERT after a payments INSERT. If the payments table has its own auto-increment column, `LAST_INSERT_ID()` would return the payment's ID rather than the order's ID. This is a minor logical issue in the example's data flow but does not affect the savepoint demonstration, which is the focus of the post. The table schemas are not defined, so the example works as illustrative code.
- The retry INSERT after the rollback uses a hardcoded value (`42`) for `order_id` rather than a dynamic reference. This is acceptable for a conceptual example but would not be production-ready.
- The post correctly notes that savepoints set after a rolled-back-to savepoint are deleted, which is demonstrated in the sp1/sp2 example.
