# Validation Summary: How to Set Trigger Order with FOLLOWS and PRECEDES in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7.2+ for FOLLOWS/PRECEDES support)
- SQL triggers
- `information_schema.TRIGGERS` system view

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual — Trigger Syntax and Examples: https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA TRIGGERS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-triggers-table.html
- MySQL 8.0 Reference Manual — Restrictions on Stored Programs (trigger restrictions on same-table DML): https://dev.mysql.com/doc/refman/8.0/en/stored-program-restrictions.html

## Issues Found

1. **PRECEDES example used `AFTER INSERT` trigger that modified the same table via `UPDATE`**: The original example defined an `AFTER INSERT ON orders` trigger that ran `UPDATE orders SET region = ...`. MySQL prohibits a trigger from modifying the table it is associated with using DML statements (error 1442: "Can't update table in stored function/trigger because it is already used by statement which invoked this stored function/trigger"). Changed to a `BEFORE INSERT` trigger using `SET NEW.region = get_region(NEW.user_id)`, which is the correct pattern for enriching row data before it is written.

2. **Missing `NEW.` prefix on column reference**: The original example called `get_region(user_id)` inside the trigger body. In MySQL trigger bodies, bare column names do not implicitly resolve to `NEW` or `OLD` row values — you must explicitly use `NEW.user_id`. Fixed to `get_region(NEW.user_id)`.

## Review Notes
- The `FOLLOWS` and `PRECEDES` clauses were introduced in MySQL 5.7.2. The post does not mention a minimum version requirement. This is acceptable since MySQL 5.7+ is widely deployed, but readers on very old installations (5.6 or earlier) would encounter syntax errors.
- The email regex pattern is functional but basic. It correctly uses double-backslash escaping for MySQL string literal context. This is fine for a tutorial example.
- The claim that MySQL lacks `ALTER TRIGGER` for reordering is correct — there is no such statement in MySQL.
