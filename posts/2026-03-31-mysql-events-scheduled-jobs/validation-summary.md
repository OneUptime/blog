# Validation Summary: How to Use MySQL Events (Scheduled Jobs)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Event Scheduler
- SQL (DDL, DML)
- MySQL replication (mentioned in best practices)
- information_schema.EVENTS

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE EVENT — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: Event Scheduler Overview — https://dev.mysql.com/doc/refman/8.0/en/events-overview.html
- MySQL 8.0 Reference Manual: Replication of Invoked Features — https://dev.mysql.com/doc/refman/8.0/en/replication-features-invoked.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA EVENTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-events-table.html

## Issues Found
1. **Incorrect replication best practice**: The original text stated "On replicated setups, events fire on each server independently. Use `log_slave_updates` or restrict events to the primary node to avoid duplication." This was inaccurate in two ways: (a) replicated events are automatically set to `SLAVESIDE_DISABLED` status on replicas and do not fire by default, and (b) `log_slave_updates` controls binary log propagation and is unrelated to event execution control. Fixed the bullet point to accurately describe replication behavior and correct advice.

## Review Notes
- The `VALUES()` function used in `ON DUPLICATE KEY UPDATE` (Event 2) is deprecated as of MySQL 8.0.20. The recommended replacement is row/column aliases with `AS`. The current code still works in all MySQL 8.0 versions but may be removed in a future major release. Not changed since the post does not target a specific MySQL version and the syntax remains functional.
- The EVERY interval list in the syntax section omits `YEAR`, `QUARTER`, and compound intervals (e.g., `DAY_HOUR`). This is acceptable for a tutorial — the listed intervals cover the most common use cases.
- The `STARTS CONCAT(CURDATE() + INTERVAL 1 DAY, ' 00:05:00')` in Event 2 works via implicit string-to-datetime conversion but could be written more cleanly as `STARTS CURDATE() + INTERVAL 1 DAY + INTERVAL 5 MINUTE`. Not changed as the current form is functional.
