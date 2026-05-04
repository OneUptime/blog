# Validation Summary: How to Configure PostgreSQL pg_hba.conf for IPv6 Clients

## Status
validated

## Post Type
Reference / Configuration Guide

## Technologies Covered
- PostgreSQL 16 (`pg_hba.conf` host-based authentication)
- IPv6 addressing (RFC 4291) and documentation prefix (RFC 3849, `2001:db8::/32`)
- Authentication methods: trust, reject, md5, scram-sha-256, password, ident, ldap, cert, peer
- Connection types: local, host, hostssl, hostnossl, hostgssenc, hostnogssenc
- `pg_hba_file_rules` system view
- `pg_reload_conf()` admin function
- systemd (`systemctl reload postgresql`)

## Sources Consulted
- PostgreSQL 16 documentation, "The pg_hba.conf File": https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- PostgreSQL 16 documentation, `pg_hba_file_rules` view: https://www.postgresql.org/docs/16/view-pg-hba-file-rules.html
- PostgreSQL 16 documentation, system administration functions (`pg_reload_conf`): https://www.postgresql.org/docs/16/functions-admin.html
- RFC 4291 — IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found

1. **Invalid IPv6 addresses (multiple occurrences).** The post used illustrative IPv6 strings containing characters that are not valid hexadecimal digits (`p`, `m`, `i`, `n`, `l`, `o`, `k`, `u`, `t`, `r`, `s`). Per RFC 4291, IPv6 address groups may only contain `0-9` and `a-f`. PostgreSQL would reject these literally and the lines would also fail any IPv6 parser, so they are not just stylistic — they are syntactically invalid.

   Replaced with valid hex-only addresses inside the `2001:db8::/32` documentation prefix:
   - `2001:db8:app::/48` → `2001:db8:abcd::/48` (lines 32, 94)
   - `2001:db8::admin/128` → `2001:db8::dba/128` (lines 35, 100)
   - `2001:db8:blocked::/48` → `2001:db8:bad::/48` (line 41)
   - `2001:db8:untrusted::/48` → `2001:db8:dead::/48` (line 57)

   `2001:db8:db::/64` (line 97) was left unchanged — `db` is valid hex.

2. **Misleading description of `pg_reload_conf()` as a syntax test.** The original "Apply and Verify" section commented `SELECT pg_reload_conf();` as "Test pg_hba.conf syntax (PostgreSQL 10+)". `pg_reload_conf()` only sends SIGHUP to the postmaster; it does not pre-validate `pg_hba.conf`. It also referenced a non-existent `pg_hba_check` tool. Rewrote the section to clarify that `pg_reload_conf()` reloads (does not validate beforehand), and that the actual way to inspect parse errors is the `error` column of the `pg_hba_file_rules` view (PostgreSQL 10+). Added `error` to the listed columns in the example query.

## Review Notes
- The connection type list (`local, host, hostssl, hostnossl, hostgssenc, hostnogssenc`) and authentication method list (`trust, reject, md5, scram-sha-256, password, ident, ldap, cert`) are accurate for PostgreSQL 16. `hostgssenc` / `hostnogssenc` were introduced in PostgreSQL 12 — not noted in the post but no incorrect claim is made about their availability.
- `pg_hba_file_rules` columns referenced (`type, database, user_name, address, netmask, auth_method`) match the documented view; the view also exposes `rule_number`, `file_name`, `line_number`, `options`, and `error` in PG 16, but omitting them is not an error.
- The post recommends `scram-sha-256` over `md5` and `hostssl` for remote IPv6 — both align with current PostgreSQL guidance.
- `systemctl reload postgresql` is correct on Debian/Ubuntu with the upstream PDG packages and on RHEL-family systems where the unit is named `postgresql` (RHEL/Fedora versioned units like `postgresql-16` would need the version suffix); not flagged as an error since the example explicitly uses the Debian-style `/etc/postgresql/16/main/pg_hba.conf` path.
