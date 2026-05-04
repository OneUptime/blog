# Validation Summary: How to Configure MySQL bind-address for IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MySQL 8.0+ server (`mysqld.cnf` / `my.cnf` configuration)
- IPv6 networking (RFC 4291 addressing, `2001:db8::/32` documentation prefix)
- `bind_address` system variable
- `ss` (iproute2) socket statistics
- `mysql` command-line client
- MySQL SQL-level user account host specifiers
- `ip6tables` and `ufw` IPv6 firewalling
- `systemctl` service management

## Sources Consulted
- MySQL 8.0 Reference Manual — IPv6 connection support: https://dev.mysql.com/doc/refman/8.0/en/ipv6-support.html
- MySQL 8.0 Reference Manual — Server System Variables (`bind_address`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_bind_address
- MySQL 8.0 Reference Manual — Connecting to the MySQL Server: https://dev.mysql.com/doc/refman/8.0/en/connecting.html
- MySQL 8.0 Reference Manual — `CREATE USER` (account-name host syntax): https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- RFC 4291 — IP Version 6 Addressing Architecture (hex digit set, `::1` loopback)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- iproute2 `ss(8)` man page

## Issues Found
1. **`bind-address = 0.0.0.0` mislabeled as IPv4+IPv6.** The original line said this listens on "all IPv4 and IPv6 interfaces". Per the MySQL manual, `0.0.0.0` is the IPv4 wildcard and listens on IPv4 only. Fixed the comment, and added an explicit `bind-address = *` example (the documented MySQL 8.0+ default that listens on all IPv4 *and* IPv6).
2. **"Multiple bind addresses" example was invalid in two ways.** The original showed two separate `bind-address = ...` lines in `[mysqld]`, which simply makes the second override the first under MySQL option-file rules. It also implied the comma-separated list could contain wildcards. The MySQL docs state the list form requires non-wildcard IPs (wildcards `*`, `0.0.0.0`, `::` are explicitly disallowed in lists). Replaced with a documented example using two specific IPs (`198.51.100.20,2001:db8::10`) and a comment pointing to `bind-address = *` for the all-interfaces case.
3. **Invalid IPv6 prefix `2001:db8:app::/48`.** `app` contains `p`, which is not a hex digit, so this address is malformed. Replaced both occurrences (in the `ip6tables` and `ufw` examples) with `2001:db8:abcd::/48`, which is a valid prefix inside the `2001:db8::/32` documentation range (RFC 3849).
4. **Bracketed host `mysql -h [2001:db8::10]`.** The square-bracket URI form is not documented for the mysql client `-h` flag; official examples pass the bare IPv6 address. Replaced with a more useful example (`--protocol=TCP`) that forces the mysql client to use TCP instead of a Unix socket — a common pitfall when the host happens to be the local machine.
5. **`ss` expected output column showed `tcp6`.** `netstat` prefixes IPv6 sockets with `tcp6`, but `ss` uses `tcp` for both families and distinguishes them via the `[::]` notation in the local-address column. Updated the expected output line to `tcp` to match real `ss` output.

## Review Notes
- The `bind-address = ::` behavior (listening on both IPv4 and IPv6) depends on the kernel `IPV6_V6ONLY` socket option / `net.ipv6.bindv6only` sysctl. Most Linux distros default this to `0`, matching the MySQL manual's claim, but the post could mention this caveat for hardened systems where `bindv6only=1`.
- `bind_address` became a runtime system variable in MySQL 5.6.1; the `SHOW GLOBAL VARIABLES LIKE 'bind_address'` query is valid on every supported MySQL release (and on MariaDB).
- `mysql.connector.connect()` (the commented-out Python example) is correct usage of the official `mysql-connector-python` driver.
- The post does not call out that `bind-address` is read at server start only — changes require a server restart, not just `FLUSH PRIVILEGES`. The `systemctl restart mysql` step covers this in practice, but a one-line note could prevent confusion.
- IPv6 user-account host syntax (`'user'@'2001:db8::%'`) does *not* support CIDR masks in MySQL — only literal addresses, `%` wildcards, and (since 8.0.23) optional `address/netmask` for IPv4. The post's examples are valid; just worth knowing for readers who try `'user'@'2001:db8::/64'`, which will not work.
