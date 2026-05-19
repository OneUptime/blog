# Validation Summary: How to Install PostgreSQL on Ubuntu Server Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- PostgreSQL 16
- Ubuntu Server
- PGDG (PostgreSQL Global Development Group) APT repository
- `pg_ctlcluster` (Debian/Ubuntu cluster management)
- `psql` client and meta-commands
- `pg_hba.conf` authentication (peer, scram-sha-256, md5, trust)
- `pg_stat_statements` extension
- systemd service management

## Sources Consulted
- PostgreSQL official APT repository documentation: https://www.postgresql.org/download/linux/ubuntu/
- PostgreSQL 16 `CREATE DATABASE` docs: https://www.postgresql.org/docs/16/sql-createdatabase.html
- PostgreSQL 16 `CREATE ROLE` / `CREATE USER` docs: https://www.postgresql.org/docs/16/sql-createrole.html
- PostgreSQL 16 `GRANT` docs: https://www.postgresql.org/docs/16/sql-grant.html
- PostgreSQL 16 `ALTER DEFAULT PRIVILEGES` docs: https://www.postgresql.org/docs/16/sql-alterdefaultprivileges.html
- PostgreSQL 16 server configuration / runtime config: https://www.postgresql.org/docs/16/runtime-config.html
- PostgreSQL 16 `pg_hba.conf` docs: https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- PostgreSQL 16 `pg_stat_statements` docs: https://www.postgresql.org/docs/16/pgstatstatements.html (column names `mean_exec_time` / `total_exec_time` introduced in PostgreSQL 13)
- Debian/Ubuntu `pg_ctlcluster(8)` and `pg_lsclusters(1)` manpages
- `psql` meta-command reference: https://www.postgresql.org/docs/16/app-psql.html

## Issues Found
- **Missing `DATABASE` keyword in GRANT statement.** The original SQL `GRANT ALL PRIVILEGES ON myapp_db TO myapp_user;` is invalid for granting database-level privileges — PostgreSQL would interpret `myapp_db` as a table name (the default object type for `GRANT ... ON ...`). Per the official `GRANT` docs, granting on a database requires `ON DATABASE database_name`. Changed to `GRANT ALL PRIVILEGES ON DATABASE myapp_db TO myapp_user;`.

## Review Notes
- The PGDG bootstrap script path (`/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh`) is correct as of the current `postgresql-common` package and is the method recommended on the official PostgreSQL APT download page.
- Cluster paths (`/var/lib/postgresql/16/main`, `/etc/postgresql/16/main/...`, `/var/log/postgresql/postgresql-16-main.log`, `/var/run/postgresql/.s.PGSQL.5432`) all match the Debian/Ubuntu layout.
- `CREATE DATABASE ... TEMPLATE template0` is correctly used when specifying non-default encoding/locale options — `template1` may carry a different encoding and the create would fail.
- The `pg_stat_statements` column names (`mean_exec_time`, `total_exec_time`) are correct for PostgreSQL 13+; appropriate here for PG 16. The older `mean_time` / `total_time` columns were renamed in 13.
- The note that `random_page_cost = 1.1` is appropriate for SSDs and `effective_io_concurrency = 200` is a reasonable SSD value matches the official tuning guidance.
- Minor stylistic observation (not corrected): the comment "Test configuration for syntax errors" precedes `pg_ctlcluster 16 main reload`, which actually performs a reload rather than a dry-run syntax check. The reload does surface syntax errors in practice, so the statement is not technically wrong, but PostgreSQL has no first-class offline config-syntax checker.
- `\du myapp_user` correctly accepts a pattern argument and will filter to that role.
- `listen_addresses = 'localhost'` requires a full restart to change (not a reload), which is noted in the "Some settings require a full restart" callout.
