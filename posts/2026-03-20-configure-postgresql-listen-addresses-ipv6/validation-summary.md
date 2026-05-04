# Validation Summary: How to Configure PostgreSQL listen_addresses for IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- PostgreSQL (postgresql.conf, listen_addresses, pg_hba.conf, pg_settings)
- IPv6 networking (loopback `::1`, global addresses, dual-stack)
- Linux network tools: `ss`, `netstat`
- `psql` client
- `systemctl` (service management)

## Sources Consulted
- PostgreSQL 16 docs — Connection settings: https://www.postgresql.org/docs/16/runtime-config-connection.html (default `listen_addresses = 'localhost'`, parameter is PGC_POSTMASTER and requires server restart, comma-separated list syntax, empty value means Unix-socket-only)
- PostgreSQL `pg_settings` system view — confirms `name`, `setting`, `unit`, `pending_restart` columns exist
- `ss(8)` man page / local `ss --help` — confirms `-6` filter for IPv6, `-t` TCP, `-l` listening, `-n` numeric, `-p` processes; verified actual output column layout
- `netstat(8)` — confirms `-6 -tlnp` filter usage and `tcp6` proto label format
- `psql` reference — `-h ::1` IPv6 host syntax, `SHOW config_file`, `SHOW listen_addresses`

## Issues Found
- **Expected `ss` output format was incorrect.** The post showed expected `ss -6 -tlnp | grep 5432` output as `tcp6 LISTEN 0 128 [::]:5432 ...` and (in the multiple-addresses section) `tcp LISTEN 0 128 0.0.0.0:5432 ...`. The leading `tcp`/`tcp6` proto column is `netstat` output style; `ss` does not emit a protocol-prefix column — its first column is `State` (e.g., `LISTEN`). Updated both expected-output comments to drop the bogus `tcp`/`tcp6` prefix and match the real `ss` columns (`LISTEN 0 128 [::]:5432 [::]:* users:...`).

## Review Notes
- The claim that `listen_addresses = '*'` causes PostgreSQL to listen on both IPv4 and IPv6 is correct on a dual-stack system: PostgreSQL binds to all available IP interfaces, producing both `0.0.0.0:5432` and `[::]:5432` listeners.
- The post could optionally mention `listen_addresses = '::'` (listen on all IPv6 interfaces only) as a cleaner IPv6-only configuration than enumerating specific addresses, but this is an enhancement, not a correction.
- Default `listen_addresses = 'localhost'` is verified correct for PostgreSQL 9.0+ (and currently in 16). The note that `localhost` covers both IPv4 and IPv6 loopback is accurate when `/etc/hosts` resolves localhost to both `127.0.0.1` and `::1` (standard on modern distros).
- `pending_restart` column in `pg_settings` was added in PostgreSQL 9.5; the query in the post is valid for all currently supported versions.
- The reminder about updating `pg_hba.conf` for IPv6 client connections is accurate and important — `listen_addresses` alone is necessary but not sufficient for remote IPv6 access.
