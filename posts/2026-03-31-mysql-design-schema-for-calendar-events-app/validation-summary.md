# Validation Summary: How to Design a Schema for a Calendar/Events Application in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, DML, foreign keys, indexes, ENUM type)
- iCalendar RRULE recurrence specification
- Calendar/event schema design patterns

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE Syntax: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — DATETIME vs TIMESTAMP: https://dev.mysql.com/doc/refman/8.0/en/datetime.html
- MySQL 8.0 Reference Manual — AUTO_INCREMENT: https://dev.mysql.com/doc/refman/8.0/en/example-auto-increment.html
- MySQL 8.0 Reference Manual — Foreign Key Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- RFC 5545 — iCalendar Specification (RRULE): https://datatracker.ietf.org/doc/html/rfc5545#section-3.3.10

## Issues Found
1. **Missing foreign key and index for `recurrence_id` in the `events` table.** The summary text describes `recurrence_id` as "pointing back to the master recurring event," but the original DDL did not include a foreign key constraint or index for this column. Added `KEY idx_recurrence (recurrence_id)` and `CONSTRAINT fk_evt_recurrence FOREIGN KEY (recurrence_id) REFERENCES events (id) ON DELETE CASCADE` to enforce the self-referencing relationship and support efficient lookups.

## Review Notes
- The choice of `DATETIME` over `TIMESTAMP` for UTC storage is a valid design decision. `TIMESTAMP` would auto-convert between UTC and the session time zone, but is limited to the range 1970–2038. `DATETIME` with application-enforced UTC avoids this limitation and is the more common modern recommendation for calendar applications.
- The `ENUM` for `freq` covers the four most common iCalendar RRULE frequencies (daily, weekly, monthly, yearly). The iCalendar spec also defines secondly, minutely, and hourly frequencies, but omitting these is reasonable for a typical calendar application.
- The `interval_` column uses a trailing underscore to avoid conflict with the MySQL reserved word `INTERVAL` — this is correct practice.
- The `CURRENT_TIMESTAMP` default on a `DATETIME` column requires MySQL 5.6.5 or later. Since MySQL 5.6 reached end-of-life in February 2021, this is not a concern for any supported version.
