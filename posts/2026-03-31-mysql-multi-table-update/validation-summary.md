# Validation Summary: How to Use Multi-Table UPDATE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (multi-table UPDATE syntax)
- SQL (DML — UPDATE with JOIN)
- InnoDB (row-level locking, transaction behavior)

## Sources Consulted
- MySQL 8.0 Reference Manual — UPDATE Statement: https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual — JOIN Syntax: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — START TRANSACTION, COMMIT, and ROLLBACK: https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html

## Issues Found
No technical issues found.

## Review Notes
- The pattern `l.old_status = o.status` in the first UPDATE example relies on MySQL reading original column values from other tables before applying SET assignments. The MySQL documentation states "For multiple-table updates, there is no guarantee that assignments are carried out in any particular order." In practice, MySQL does use original (pre-update) values for cross-table column references in multi-table UPDATE, so the expected output is correct. However, readers relying on this behavior should be aware it is not explicitly guaranteed by the documentation.
- All CREATE TABLE, INSERT, UPDATE, and SELECT statements are syntactically correct and produce the expected output.
- The comparison table and best practices section provide sound guidance.
- The limitation about not referencing a table in a subquery that is also being updated is correct for standard subqueries; MySQL 8.0.14+ relaxed this for CTEs, but the post's statement remains accurate for the general case.
