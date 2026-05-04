# Validation Summary: How to Configure MySQL Remote Connections over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (server configuration, user management, SSL/TLS)
- IPv6 networking
- ip6tables (Linux IPv6 firewall)
- ufw (Uncomplicated Firewall)
- systemd (`systemctl`)
- `ss` socket statistics utility
- `nc` (netcat) connectivity testing

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables (`bind_address`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_bind_address
- MySQL 8.0 Reference Manual — `CREATE USER` Statement: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual — `ALTER USER` Statement (REQUIRE SSL/X509): https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual — Encrypted Connection TLS Protocols and Ciphers / `require_secure_transport`: https://dev.mysql.com/doc/refman/8.0/en/encrypted-connections.html
- MySQL 8.0 Reference Manual — Command Options for Encrypted Connections (`--ssl-ca`, `--ssl-cert`, `--ssl-key`): https://dev.mysql.com/doc/refman/8.0/en/connection-options.html#encrypted-connection-options
- RFC 4291 — IP Version 6 Addressing Architecture (textual representation rules)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- iptables / ip6tables man page
- ufw man page

## Issues Found
1. **Invalid IPv6 address `2001:db8::client`** in the `CREATE USER`/`GRANT` examples (Step 2) and Summary. The literal `client` contains characters (`l`, `i`, `n`, `t`) that are not valid hexadecimal digits, so the string is not a syntactically valid IPv6 address and would be rejected by MySQL when used as a host specifier. Replaced with `2001:db8::abcd`, which is a valid documentation-range IPv6 address.
2. **Invalid IPv6 subnet `2001:db8:app::/48`** in the firewall examples (Step 3) and Summary. The label `app` contains the character `p`, which is not a valid hexadecimal digit, so the prefix is not a valid IPv6 network and `ip6tables`/`ufw` would reject it. Replaced (in all occurrences) with `2001:db8:abcd::/48`, a valid documentation-range prefix.

## Review Notes
- `bind-address = ::` correctly tells MySQL to listen on all IPv6 interfaces. MySQL also supports `bind-address = *` (all IPv4 + IPv6) and a comma-separated list of addresses since 8.0.13; the post's choice is fine for an IPv6-focused tutorial.
- `FLUSH PRIVILEGES` after `CREATE USER`/`GRANT` is unnecessary (those statements implicitly reload the grant tables); it is only required after directly modifying the `mysql.user`/`mysql.db` tables. It is harmless, so left as-is.
- The `mysql` client SSL options `--ssl-ca`, `--ssl-cert`, `--ssl-key` still work in MySQL 8.x, but `--ssl-mode=VERIFY_CA` (or `VERIFY_IDENTITY`) is the modern recommended way to enforce certificate verification on the client. Not changed because the example as written is still valid.
- `systemctl restart mysql` is correct on Debian/Ubuntu; on RHEL/CentOS the unit is typically `mysqld`. Acceptable as written for the post's target audience.
- The example output line `tcp6  LISTEN  0  80  [::]:3306  [::]:*  users:(("mysqld"...))` shows a backlog of `80` rather than the typical default (`128` on most distros), but this is illustrative output, not a command to run.
