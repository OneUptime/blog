# Validation Summary: How to Configure PostgreSQL to Accept IPv6 Connections

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- PostgreSQL 16 (postgresql.conf, pg_hba.conf)
- IPv6 networking (RFC 4291 addressing)
- psql client
- systemd (systemctl)
- ss (iproute2)
- ip6tables
- Linux PostgreSQL packaging paths (/etc/postgresql/16/main/)

## Sources Consulted
- PostgreSQL 16 documentation — Connection settings (`listen_addresses`): https://www.postgresql.org/docs/16/runtime-config-connection.html
- PostgreSQL 16 documentation — Client Authentication (pg_hba.conf): https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- PostgreSQL 16 documentation — `pg_hba_file_rules` view: https://www.postgresql.org/docs/16/view-pg-hba-file-rules.html
- PostgreSQL 16 documentation — `pg_reload_conf()`: https://www.postgresql.org/docs/16/functions-admin.html
- PostgreSQL source: GUC parsing for comma-separated `listen_addresses` (handles IPv6 entries)
- RFC 4291 — IP Version 6 Addressing Architecture (hex digits 0–9, a–f only)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- man ss(8), man ip6tables(8), man systemctl(1)

## Issues Found
1. **Invalid IPv6 address `2001:db8:app::/48`** in the "Configure pg_hba.conf for IPv6 Clients" section. The letter `p` is not a valid hexadecimal digit, so this address cannot be parsed by PostgreSQL (or any IPv6 parser, e.g. Python's `ipaddress` module rejects it with `AddressValueError`). Replaced with `2001:db8:abcd::/48`, which uses only valid hex digits while preserving the documentation prefix.
2. **Invalid IPv6 address `2001:db8::app/128`** in the "Full pg_hba.conf Example" section. Same problem (`p` is not hex). Replaced with `2001:db8::abcd/128`.

## Review Notes
- The default value of `listen_addresses` is correctly stated as `'localhost'` (PostgreSQL 16 default).
- `listen_addresses` does require a server restart (it is `PGC_POSTMASTER`), as the post says — reload alone is insufficient. This is correct.
- Comma-separated IPv6 entries in `listen_addresses` (e.g. `'2001:db8::10,localhost,::1'`) are accepted by PostgreSQL's GUC list parser; the colons inside an IPv6 address do not collide with the comma separator.
- The `pg_hba_file_rules` columns selected (`type`, `database`, `user_name`, `address`, `auth_method`) are valid in PostgreSQL 10+.
- `md5` is shown in some early examples; modern PostgreSQL deployments should prefer `scram-sha-256` (which the post does demonstrate later). The post is internally consistent but could note this preference more explicitly in a future revision.
- The Python connection example uses `psycopg2`; users on newer projects may prefer `psycopg` (psycopg 3). Not an error, just a forward-looking note.
- `ip6tables` is correct for legacy iptables; on modern distros using nftables, `nft list ruleset` may be more appropriate, but `ip6tables` still works via the nft compatibility layer.
