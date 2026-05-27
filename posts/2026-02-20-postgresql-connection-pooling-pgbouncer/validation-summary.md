# Validation Summary: How to Set Up PgBouncer for PostgreSQL Connection Pooling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- PgBouncer
- Connection pooling
- PgBouncer configuration
- psql
- psycopg2
- systemd

## Sources Consulted
- PgBouncer Configuration: https://www.pgbouncer.org/config
- PgBouncer Features and pooling mode compatibility: https://www.pgbouncer.org/features.html
- PgBouncer Usage / SHOW command reference: https://www.pgbouncer.org/usage
- PgBouncer FAQ for prepared statements in transaction pooling: https://www.pgbouncer.org/faq.html
- PgBouncer 1.21.0 release notes: https://www.pgbouncer.org/2023/10/pgbouncer-1-21-0
- PgBouncer changelog: https://www.pgbouncer.org/changelog
- PostgreSQL Password Authentication documentation: https://www.postgresql.org/docs/current/auth-password.html
- Psycopg 2.9 documentation for `psycopg2.connect`: https://www.psycopg.org/docs/module.html

## Issues Found
- The `auth_query` example used `pg_shadow` and omitted `auth_user`. Updated it to the documented PgBouncer pattern using `auth_user` and `pg_authid`, including checks for login capability and password validity.
- The SCRAM `userlist.txt` examples for admin and stats users used placeholder values named like hashes but not shaped like valid SCRAM secrets. Updated them to SCRAM-form placeholders matching the configured `auth_type = scram-sha-256`.
- The session-mode compatibility note grouped `NOTIFY` with session-only features. PgBouncer documents `NOTIFY` as compatible with transaction pooling, while `LISTEN`, SQL `PREPARE`/`EXECUTE`, and session-level `SET` are not. Updated the list.
- The `SHOW POOLS` metric descriptions slightly overstated `cl_active` and `sv_active`. Updated them to match PgBouncer's documented meanings.
- The prepared-statement guidance treated all prepared statements as session-level features. Updated the text to distinguish SQL-level `PREPARE`/`EXECUTE` from protocol-level named prepared statements, which PgBouncer can track in transaction pooling mode starting with 1.21.

## Review Notes
- PgBouncer 1.24 and newer enable prepared statement tracking by default with `max_prepared_statements = 200`; older 1.21-1.23 deployments still need a nonzero value to enable the feature. The post's explicit `max_prepared_statements = 100` remains valid as a tuning example.
- The installation commands are distribution-dependent but plausible for common package repositories.
- The Python example uses valid psycopg2 connection-string usage.
