# Validation Summary: How to Handle Triggers in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL
- SQL triggers
- MySQL stored program syntax
- MySQL trigger metadata and debugging
- MySQL replication behavior for triggers

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement - https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: SHOW TRIGGERS Statement - https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html
- MySQL 8.0 Reference Manual: SIGNAL Statement - https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL Restrictions and Limitations: Restrictions on Stored Programs - https://dev.mysql.com/doc/mysql-reslimits-excerpt/8.0/en/stored-program-restrictions.html
- MySQL 8.0 FAQ: Triggers - https://dev.mysql.com/doc/refman/8.0/en/faqs-triggers.html

## Issues Found
- Several trigger examples reset the MySQL client delimiter to `;` and then created another multi-statement trigger ending with `END//` without setting `DELIMITER //` again. Added the missing `DELIMITER //` statements so the examples are syntactically usable in the MySQL client.
- The introductory audit example said it logged all changes, but the trigger only logs salary changes. Updated the wording to match the code.
- The order total `AFTER UPDATE` trigger only recalculated `NEW.order_id`, which could leave the old order total stale if an item moved between orders. Added a recalculation for `OLD.order_id` when the order ID changes.
- The soft-delete section implied a `BEFORE DELETE` trigger could replace deletion with a soft delete, but the example archives the row and then allows the delete to continue. Updated the wording and comments to describe archiving hard deletes or preventing hard deletes.
- The `SHOW TRIGGERS LIKE 'employees'` comment implied exact table filtering. Clarified that `LIKE` filters by table name pattern, matching the MySQL documentation.
- The management snippet suggested temporarily disabling triggers by removing privileges. Updated it to state that MySQL has no direct `DISABLE TRIGGER` statement and that temporary disabling is handled by dropping and recreating the trigger.
- The recursive trigger pitfall described an infinite loop and said MySQL only prevents the same-trigger case. Updated it to explain that MySQL raises an error when a trigger tries to modify a table already being used by the invoking statement.
- The first testing example inserted into `employees` and then checked `employees_audit`, but the post defines only an `AFTER UPDATE` audit trigger. Replaced it with a test for the `users_before_insert` normalization trigger.

## Review Notes
The replication note is accurate at a high level: with row-based replication, trigger effects from the source are applied on replicas but the replica trigger itself is not activated for the replicated source statement; with statement-based replication, replica triggers can activate. Future improvements could mention version-specific behavior for MySQL 5.7.2+ multiple triggers with the same timing and event.
