# Validation Summary: How to Implement Soft Deletes in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- SQL
- PL/pgSQL trigger functions
- Row-level security
- Partial and expression indexes
- Views

## Sources Consulted
- PostgreSQL Documentation: Row Security Policies - https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL Documentation: CREATE POLICY - https://www.postgresql.org/docs/current/sql-createpolicy.html
- PostgreSQL Documentation: CREATE TRIGGER - https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL Documentation: Trigger Functions - https://www.postgresql.org/docs/current/plpgsql-trigger.html
- PostgreSQL Documentation: Overview of Trigger Behavior - https://www.postgresql.org/docs/current/trigger-definition.html
- PostgreSQL Documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL Documentation: Partial Indexes - https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL Documentation: Indexes on Expressions - https://www.postgresql.org/docs/current/indexes-expressional.html

## Issues Found
- The soft-delete trigger converted every `DELETE` into an update and returned `NULL`, which meant the later purge query would also be intercepted and old soft-deleted rows would not be physically deleted. Updated the trigger to return `OLD` when `OLD.deleted_at IS NOT NULL`, allowing purge deletes to proceed while still converting deletes of active rows into soft deletes.

## Review Notes
- The RLS example is syntactically valid. In production, remember that PostgreSQL table owners normally bypass row-level security unless `ALTER TABLE ... FORCE ROW LEVEL SECURITY` is used, and roles with `BYPASSRLS` also bypass policies.
- The partial unique index for active emails is the clearer option for soft deletes. The expression-index option is valid, but applications should choose a sentinel timestamp that cannot be used as a real `deleted_at` value.
