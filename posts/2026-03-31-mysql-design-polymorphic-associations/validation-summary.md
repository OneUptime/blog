# Validation Summary: How to Design Polymorphic Associations in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, DML, triggers, CHECK constraints, ENUM type)
- Polymorphic association schema design pattern
- Nullable foreign key alternative pattern

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — CREATE TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual — SIGNAL Statement: https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual — CHECK Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual — The ENUM Type: https://dev.mysql.com/doc/refman/8.0/en/enum.html
- MySQL 8.0 Reference Manual — FOREIGN KEY Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html

## Issues Found
No technical issues found.

## Review Notes
- The CHECK constraint in the alternative pattern (`(post_id IS NOT NULL) + (photo_id IS NOT NULL) = 1`) relies on CHECK constraint enforcement, which is only available in MySQL 8.0.16+. Earlier MySQL versions parse but silently ignore CHECK constraints. The post does not mention this version requirement, but MySQL 8.0 is the current actively supported release, so this is reasonable.
- The trigger example covers `BEFORE INSERT` only. A production implementation would also need a `BEFORE UPDATE` trigger to prevent integrity violations when `commentable_id` or `commentable_type` are modified after insertion. This is not an error in the post — it demonstrates the concept correctly — but readers building production systems should be aware of this gap.
- All SQL syntax is valid and follows MySQL conventions. The composite index `(commentable_type, commentable_id)` is correctly ordered for the query patterns demonstrated.
