# Validation Summary: How to Manage Connection Limits in PostgreSQL

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- PostgreSQL
- PgBouncer
- SQLAlchemy
- node-postgres / pg-pool
- HikariCP
- Linux package managers and systemd

## Sources Consulted
- PostgreSQL documentation: Connections and Authentication - https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL documentation: Client Connection Defaults / idle_session_timeout - https://www.postgresql.org/docs/current/runtime-config-client.html
- PostgreSQL documentation: CREATE ROLE - https://www.postgresql.org/docs/current/sql-createrole.html
- PostgreSQL documentation: ALTER ROLE - https://www.postgresql.org/docs/current/sql-alterrole.html
- PostgreSQL documentation: ALTER DATABASE - https://www.postgresql.org/docs/current/sql-alterdatabase.html
- PostgreSQL documentation: ALTER SYSTEM - https://www.postgresql.org/docs/current/sql-altersystem.html
- PostgreSQL documentation: System Administration Functions - https://www.postgresql.org/docs/current/functions-admin.html
- PgBouncer configuration documentation - https://www.pgbouncer.org/config.html
- PgBouncer usage documentation - https://www.pgbouncer.org/usage.html
- SQLAlchemy pooling documentation - https://docs.sqlalchemy.org/en/latest/core/pooling.html
- SQLAlchemy engine configuration documentation - https://docs.sqlalchemy.org/en/latest/core/engines.html
- node-postgres Pool API documentation - https://node-postgres.com/apis/pool
- HikariCP configuration documentation - https://github.com/brettwooldridge/HikariCP

## Issues Found
- The restart verification command only checked `max_connections`, but the post also changed `superuser_reserved_connections`, which is also a start-time parameter. Updated the command sequence to reload configuration first and check `pending_restart` for both settings.
- The role and database limit inspection queries used `> 0`, which hides valid zero-connection limits. Changed both queries to `<> -1`, matching PostgreSQL's documented unlimited sentinel value.
- The PgBouncer admin-console example connected as `pgbouncer`, but the configuration did not grant that user admin-console access or include it in the auth-file generation. Added `admin_users = pgbouncer` and a matching auth-file entry.
- The PgBouncer auth-file example generated an MD5 password for `app_user` using `password`, while the PostgreSQL role example used `secret`. Updated the hash input and plain-text example so the credentials are consistent.
- The summary recommended "roughly 400 connections per GB of RAM" as a starting point. PostgreSQL documentation does not support a fixed connections-per-GB rule, and connection capacity depends on workload and memory settings. Replaced it with workload- and RAM-based sizing guidance.

## Review Notes
- PostgreSQL 18 documents `reserved_connections` in addition to `superuser_reserved_connections`. The post remains technically valid for its examples, but a future update could mention `reserved_connections` for newer PostgreSQL deployments.
- PgBouncer transaction pooling is a reasonable default for many applications, but some session-level features require session pooling or application changes.
