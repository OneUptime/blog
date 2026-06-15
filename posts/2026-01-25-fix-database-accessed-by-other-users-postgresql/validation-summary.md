# Validation Summary: How to Fix 'database is being accessed by other users' Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- PostgreSQL
- SQL
- psql
- Bash
- Python psycopg2

## Sources Consulted
- PostgreSQL 18 DROP DATABASE documentation: https://www.postgresql.org/docs/current/sql-dropdatabase.html
- PostgreSQL 13 DROP DATABASE documentation: https://www.postgresql.org/docs/13/sql-dropdatabase.html
- PostgreSQL 18 ALTER DATABASE documentation: https://www.postgresql.org/docs/current/sql-alterdatabase.html
- PostgreSQL 18 ALTER ROLE documentation: https://www.postgresql.org/docs/current/sql-alterrole.html
- PostgreSQL 18 Server Signaling Functions documentation: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL 18 pg_stat_activity documentation: https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL 18 Client Connection Defaults documentation: https://www.postgresql.org/docs/current/runtime-config-client.html
- PostgreSQL 18 pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html

## Issues Found
- The introduction described ALTER DATABASE broadly as requiring exclusive database access. Updated this to specify renaming a database with ALTER DATABASE, since other ALTER DATABASE forms such as changing owner or settings do not have the same active-connection requirement.
- The DROP/rename examples did not consistently state that they must be run while connected to a different database. Added comments clarifying that these commands should be run from another database such as postgres.
- The DROP DATABASE WITH (FORCE) explanation said it automatically terminates all connections and drops the database. Updated it to state that PostgreSQL attempts to terminate connections and can still fail when connections remain, or when prepared transactions, active logical replication slots, or subscriptions exist.
- The shell script interpolated the database name directly into SQL, which could fail for quoted identifiers and was unsafe. Updated it to use psql variables with identifier and literal quoting, and added ON_ERROR_STOP.
- The notification function comment implied notices were sent to all connected sessions. Updated the comment to clarify that RAISE NOTICE logs notices in the current session.
- The pg_terminate_backend description called termination "immediate." Updated the wording to "terminates the session" and "disconnects the client," matching PostgreSQL's documented SIGTERM behavior more closely.
- The PL/pgSQL safe_drop_database function attempted to execute DROP DATABASE inside a function. This is invalid because DROP DATABASE cannot run inside a transaction block. Replaced it with a psql automation block that runs statements separately from a different database.

## Review Notes
- The remaining pg_stat_activity, pg_cancel_backend, pg_terminate_backend, connection limit, idle timeout, pg_restore, and psycopg2 examples are technically consistent with the reviewed documentation.
- PostgreSQL 13 is now unsupported as of the review date, but the version-specific claim that DROP DATABASE WITH (FORCE) exists in PostgreSQL 13+ is accurate.
