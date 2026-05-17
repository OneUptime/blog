# Validation Summary: How to Install and Configure PostgreSQL for Local Development on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL 16
- Ubuntu (apt package management)
- PostgreSQL APT (PGDG) repository
- `psql` CLI
- `pg_hba.conf` (Host-Based Authentication)
- `postgresql.conf` (server configuration)
- `createuser`, `createdb`, `dropdb`, `pg_dump`, `pg_restore`, `pg_lsclusters`, `pg_ctlcluster`
- pgAdmin 4 (desktop)
- systemd (`systemctl`)

## Sources Consulted
- PostgreSQL 16 WAL configuration docs — https://www.postgresql.org/docs/16/runtime-config-wal.html
- PostgreSQL 16 `createuser` docs — https://www.postgresql.org/docs/16/app-createuser.html
- PostgreSQL 16 `createdb` docs — https://www.postgresql.org/docs/16/app-createdb.html
- PostgreSQL 16 `psql` docs — https://www.postgresql.org/docs/16/app-psql.html
- PostgreSQL APT repository wiki — https://wiki.postgresql.org/wiki/Apt
- pgAdmin 4 APT download docs — https://www.pgadmin.org/download/pgadmin-4-apt/
- Ubuntu Server PostgreSQL guide — https://ubuntu.com/server/docs/how-to/databases/install-postgresql/

## Issues Found
1. **`wal_level = minimal` would prevent PostgreSQL from starting.** Per the official PG 16 docs, "the server will not even start in this mode if `max_wal_senders` is non-zero." Since Ubuntu's default for `max_wal_senders` is 10, a reader following the original snippet verbatim would get a startup failure on `sudo systemctl restart postgresql`. Fixed by adding `max_wal_senders = 0` immediately below the `wal_level = minimal` line, with a comment explaining the dependency.
2. **Contradictory comment on `max_connections`.** The original read `max_connections = 100 # Reduce from default 100 is fine`, which conflates "default is 100" with "reduce from default" in the same line. Rewrote the comment to `Default of 100 is fine for development` for clarity. No functional change.

## Review Notes
- The APT repository setup correctly uses the modern `signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc` pattern (not deprecated `apt-key`).
- The default `pg_hba.conf` snippet matches what Ubuntu's PGDG package ships for PG 14+ (`scram-sha-256` for host, `peer` for local).
- Switching `pg_hba.conf` to `md5` (as the post suggests for development) works but is weaker than `scram-sha-256`; for a dev-only local box this trade-off is reasonable, and the post is clearly scoped to development.
- `createdb --locale=en_US.UTF-8` may fail with "new collation is incompatible with the collation of the template database" on clusters whose template1 was initialized with a different locale. The workaround is `--template=template0`. Not strictly an error in the post (en_US.UTF-8 is the common case on Ubuntu), but worth knowing.
- The pgAdmin 4 APT repository instructions correctly use the modern `signed-by=` keyring approach.
- Log path `/var/log/postgresql/postgresql-16-main.log` is correct for the Debian/Ubuntu postgresql-common layout.
