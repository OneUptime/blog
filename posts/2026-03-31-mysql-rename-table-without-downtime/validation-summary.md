# Validation Summary: How to Rename a Table Without Downtime in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (RENAME TABLE, views, triggers, InnoDB foreign keys)
- SQL DDL and DML operations
- Zero-downtime migration strategies

## Sources Consulted
- MySQL 8.0 Reference Manual: RENAME TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/rename-table.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: Updatable and Insertable Views — https://dev.mysql.com/doc/refman/8.0/en/view-updatability.html

## Issues Found

1. **"Indexes are renamed automatically" was incorrect.** Indexes keep their original names after a RENAME TABLE but continue to function correctly on the renamed table. Changed to clarify that indexes retain their names.

2. **"Foreign keys on other tables referencing the old name need manual updates" was incorrect for MySQL 8.0+.** Per the official docs, foreign key constraint names that point to the renamed table are automatically updated (unless there is a naming conflict). Updated the text to reflect automatic updates and changed the ALTER TABLE example comment to indicate it is only needed when a conflict occurs.

3. **View updatability statement was misleading.** The text stated "Views support SELECT but not INSERT/UPDATE/DELETE unless they are updatable simple views," which could lead readers to believe the view they just created would not support writes. The view `SELECT * FROM purchase_orders` IS an updatable simple view and fully supports INSERT, UPDATE, and DELETE. Clarified this in the text.

## Review Notes
- The dual-write trigger example only shows an AFTER INSERT trigger. A complete dual-write migration would also require UPDATE and DELETE triggers. This is acceptable as a simplified example but readers should be aware of this limitation.
- The trigger uses `SELECT * FROM orders WHERE id = NEW.id` to re-query the source table rather than using the NEW row values directly. This is functional but slightly inefficient; in production, using NEW column values directly would be preferred.
- The PROCESSLIST query approach works but is a point-in-time check. In production, consider using `performance_schema.events_statements_current` for more reliable metadata lock monitoring.
