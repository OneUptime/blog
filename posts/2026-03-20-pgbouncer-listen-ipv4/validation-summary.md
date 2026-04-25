# Validation Summary: How to Configure PgBouncer to Listen on a Specific IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- PgBouncer
- PostgreSQL
- `pgbouncer.ini`
- `userlist.txt`
- SCRAM-SHA-256 / MD5 password formats
- `psql`
- `ss`
- `iptables`
- systemd / `systemctl`

## Sources Consulted
- PgBouncer Configuration — https://www.pgbouncer.org/config
- PgBouncer Usage — https://www.pgbouncer.org/usage
- PgBouncer Installation / systemd Integration — https://www.pgbouncer.org/install.html
- PostgreSQL Documentation: `pg_shadow` — https://www.postgresql.org/docs/current/view-pg-shadow.html
- PostgreSQL Documentation: `pg_authid` — https://www.postgresql.org/docs/current/catalog-pg-authid.html
- PostgreSQL Documentation: Predefined Roles — https://www.postgresql.org/docs/current/predefined-roles.html
- PostgreSQL Documentation: `psql` — https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL Documentation: `SET` — https://www.postgresql.org/docs/current/sql-set.html
- Local CLI help: `ss --help`
- Local CLI help: `systemctl --help`
- Local CLI help: `iptables -h`

## Issues Found
- The introduction said PgBouncer may listen on all interfaces by default. Official PgBouncer docs say that when `listen_addr` is unset, PgBouncer accepts only Unix socket connections. I corrected the introduction to reflect the actual default behavior.
- The `max_client_conn` comment described it as a PostgreSQL connection limit. In PgBouncer, `max_client_conn` is the client-side limit, while `default_pool_size` controls server connections per user/database pool. I corrected the comments and the conclusion so the sizing guidance matches the upstream docs.
- The admin console comment implied it could be bound separately on loopback. PgBouncer exposes the console through the special `pgbouncer` database on the configured listener(s), with access controlled by `admin_users` and `stats_users`. I corrected that comment.
- The `userlist.txt` SQL example did not emit a valid `auth_file` entry. I replaced it with a query that outputs the correctly quoted username/password line format expected by PgBouncer.
- The `auth_query` section had two technical problems: `pg_read_all_settings` does not grant access to password catalogs, and `pg_shadow_lookup` is not a built-in PostgreSQL function. I replaced that section with the SECURITY DEFINER function pattern documented by PgBouncer, including schema-qualified function usage and the required grants.
- The pooling-mode comparison listed `SET LOCAL` as a reason to use session pooling. PostgreSQL documents `SET LOCAL` as transaction-scoped, not session-scoped. I replaced it with session-state examples that actually require session pooling.

## Review Notes
- The post is technically sound after the fixes above.
- PgBouncer still supports MD5-format secrets, but PostgreSQL documents MD5-encrypted passwords as deprecated. The post already prefers SCRAM-SHA-256, which is the right default.
- The sample systemd unit using `Type=forking` and `pgbouncer -d` is valid. Upstream PgBouncer also documents `Type=notify` / socket activation when PgBouncer is built with `--with-systemd`.
- The firewall examples are syntactically valid, but real deployments may need additional rules depending on the host's existing default policies.
- `psql` was not installed in the local review environment, so its CLI syntax was checked against official PostgreSQL documentation rather than local `--help` output.
