# Validation Summary: How to Configure TimescaleDB with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- TimescaleDB (PostgreSQL extension)
- PostgreSQL 15
- IPv6 networking
- `postgresql.conf` (`listen_addresses`, `port`)
- `pg_hba.conf` (host-based authentication, IPv6 CIDR)
- `systemctl` / `pg_ctl` for service control
- `ss` (socket statistics) for verifying listeners
- `psql` CLI client
- psycopg2 (Python PostgreSQL client)
- JDBC and SQLAlchemy connection URL formats

## Sources Consulted
- PostgreSQL documentation: Connections and Authentication (`listen_addresses`) — https://www.postgresql.org/docs/15/runtime-config-connections.html
- PostgreSQL documentation: pg_hba.conf — https://www.postgresql.org/docs/15/auth-pg-hba-conf.html
- PostgreSQL documentation: psql client (`-h`, `\dx`) — https://www.postgresql.org/docs/15/app-psql.html
- TimescaleDB documentation: `create_hypertable` — https://docs.timescale.com/api/latest/hypertable/create_hypertable/
- TimescaleDB documentation: `time_bucket` — https://docs.timescale.com/api/latest/hyperfunctions/time_bucket/
- psycopg2 documentation: connection parameters — https://www.psycopg.org/docs/module.html
- PostgreSQL JDBC driver: connection URL syntax (IPv6 brackets) — https://jdbc.postgresql.org/documentation/use/
- RFC 3986 (URI generic syntax — IPv6 host bracketing)
- RFC 3849 (`2001:db8::/32` documentation prefix)

## Issues Found
No technical issues found.

- `listen_addresses` syntax and accepted values (specific address, `*`, comma-separated list including `::1`/`127.0.0.1`) match the PostgreSQL 15 docs.
- `pg_hba.conf` `host` lines using IPv6 CIDR notation (`::1/128`, `2001:db8::/32`, `::/0`) and `scram-sha-256` are valid.
- Reload commands (`systemctl reload postgresql`, `pg_ctl reload -D ...`) are correct.
- `ss -6 -tlnp` flags are correct for listing IPv6 TCP listeners with process info.
- `psql -h 2001:db8::10` works without brackets because `-h` takes a host argument, not a URI.
- `\dx timescaledb` correctly displays the installed extension's details.
- `create_hypertable('metrics', 'time')` and `time_bucket('5 minutes', time)` are current TimescaleDB API calls.
- psycopg2 `connect()` accepts an IPv6 string directly in the `host` parameter.
- JDBC and SQLAlchemy URLs correctly bracket the IPv6 literal (per RFC 3986).

## Review Notes
- The post targets PostgreSQL 15. The same configuration applies to PostgreSQL 14–17; only the path (`/etc/postgresql/<version>/main/`) needs to change for other versions.
- `2001:db8::/32` is the IETF documentation prefix (RFC 3849), so the example addresses are appropriate for documentation and won't conflict with real deployments.
- The "Allow all IPv6 connections (`::/0`)" entry is correctly flagged as development-only.
- For production deployments, readers should also consider enabling SSL (`ssl = on` in `postgresql.conf` and `hostssl` instead of `host` in `pg_hba.conf`); this is out of scope for an IPv6-focused post but worth noting as a follow-up.
