# Validation Summary: How to Fix 'role does not exist' Errors in PostgreSQL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- PostgreSQL roles and privileges
- PostgreSQL authentication and pg_hba.conf
- PostgreSQL psql, createuser, and pg_restore commands
- Docker Compose with the official PostgreSQL image
- Python psycopg2 connection errors

## Sources Consulted
- PostgreSQL CREATE ROLE documentation: https://www.postgresql.org/docs/current/sql-createrole.html
- PostgreSQL CREATE USER documentation: https://www.postgresql.org/docs/current/sql-createuser.html
- PostgreSQL role attributes documentation: https://www.postgresql.org/docs/current/role-attributes.html
- PostgreSQL database roles documentation: https://www.postgresql.org/docs/current/database-roles.html
- PostgreSQL psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL createuser documentation: https://www.postgresql.org/docs/current/app-createuser.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL pg_hba.conf documentation: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL password authentication documentation: https://www.postgresql.org/docs/current/auth-password.html
- PostgreSQL ALTER DEFAULT PRIVILEGES documentation: https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html
- PostgreSQL GRANT documentation: https://www.postgresql.org/docs/current/sql-grant.html
- PostgreSQL role removal documentation: https://www.postgresql.org/docs/current/role-removal.html
- Docker Official Image for PostgreSQL documentation: https://hub.docker.com/_/postgres

## Issues Found
- The "Create the Missing Role" example mixed a shell command inside a SQL code block. Split the `sudo -u postgres psql` command into a bash block so the remaining SQL block is valid SQL.
- The Docker Compose example was marked as `dockerfile`, and the init script was marked as `bash` even though it contained SQL. Updated the code fences and comments to match the actual formats.
- The peer authentication workaround claimed that `psql -h localhost` forces password authentication. It only forces a TCP connection; whether password authentication is used depends on matching `pg_hba.conf` rules. Updated the wording and replaced the `md5` local rule with `scram-sha-256`, since PostgreSQL 18 documentation warns that MD5-encrypted passwords are deprecated.
- The application role creation script used psql variables inside a dollar-quoted `DO` block, where psql variable interpolation does not occur. Replaced it with psql's documented `\gset` and `\if` pattern and used quoted identifier interpolation for role and database names.

## Review Notes
The PostgreSQL client binaries were not installed in the local workspace, so command verification was performed against the official PostgreSQL documentation rather than local `--help` output. The examples are generally correct for current PostgreSQL, but real deployments should prefer secret management over inline passwords and should account for schema ownership and default privileges for the role that creates future objects.
