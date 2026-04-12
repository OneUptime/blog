# Validation Summary: How to Create a BEFORE UPDATE Trigger in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (BEFORE UPDATE triggers, SIGNAL statement, SHOW TRIGGERS, SHOW CREATE TRIGGER, DROP TRIGGER)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual — SIGNAL Statement: https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual — SHOW TRIGGERS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html
- MySQL 8.0 Reference Manual — SHOW CREATE TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/show-create-trigger.html
- MySQL 8.0 Reference Manual — DROP TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/drop-trigger.html

## Issues Found
No technical issues found.

## Review Notes
- The `<>` operator in Example 3 (`IF OLD.price <> NEW.price`) does not catch transitions to or from NULL (NULL <> value evaluates to NULL, not TRUE). If the `price` column allows NULLs, a NULL-safe comparison such as `IF NOT (OLD.price <=> NEW.price)` would be more robust. This is not an error in the post since the products table schema is not defined and the pattern shown is standard practice, but it could be worth noting in a future revision.
- The SIGNAL statement (Example 1) requires MySQL 5.5 or later, which is not called out explicitly but is unlikely to be a concern for modern deployments.
