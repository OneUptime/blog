# Validation Summary: How to Rename Tables and Columns Safely in PostgreSQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- SQL DDL
- PL/pgSQL triggers
- PostgreSQL views
- PostgreSQL foreign keys and dependencies

## Sources Consulted
- PostgreSQL ALTER TABLE documentation: https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL Modifying Tables documentation: https://www.postgresql.org/docs/current/ddl-alter.html
- PostgreSQL CREATE VIEW documentation: https://www.postgresql.org/docs/current/sql-createview.html
- PostgreSQL CREATE TRIGGER documentation: https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL PL/pgSQL Trigger Functions documentation: https://www.postgresql.org/docs/current/plpgsql-trigger.html

## Issues Found
- The simple rename examples described table and column renames as "instant." PostgreSQL documents `ALTER TABLE` as taking an `ACCESS EXCLUSIVE` lock unless a subform specifies otherwise, while rename operations do not change stored data. Updated the comments to describe them as metadata-only operations that still take a lock.
- The column migration trigger only copied `old_name` to `new_name`. That would not preserve compatibility after the application starts writing `new_name`, because old readers could see stale or null `old_name` values. Updated the trigger to synchronize both columns for inserts and single-sided updates during the transition.
- The compatibility view grant only allowed `SELECT`. Since the post discusses compatibility during application migration, old application writes through an updatable compatibility view may also need DML privileges. Updated the grant to include `INSERT`, `UPDATE`, and `DELETE`.

## Review Notes
PostgreSQL simple views are automatically updatable only when they meet documented conditions. The examples shown are simple enough for that behavior, but future revisions could mention caveats such as view ownership, row-level security, non-null omitted columns on inserts, and the fact that `SELECT *` in a view captures the columns present when the view is created.
