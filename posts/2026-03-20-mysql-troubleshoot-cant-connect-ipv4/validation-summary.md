# Validation Summary: How to Troubleshoot MySQL 'Can't Connect' Errors on IPv4

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (server and client)
- Linux networking (TCP/IPv4)
- systemd (`systemctl`)
- `ss` (socket statistics)
- `nc` (netcat) for port testing
- `iptables` and `ufw` firewalls
- MySQL user/grant management
- MySQL general query log

## Sources Consulted
- Linux errno reference (errno(3) man page) for codes 110 (ETIMEDOUT) and 111 (ECONNREFUSED): https://man7.org/linux/man-pages/man3/errno.3.html
- MySQL 8.0 Reference Manual — "Can't connect to [local] MySQL server" troubleshooting: https://dev.mysql.com/doc/refman/8.0/en/can-not-connect-to-server.html
- MySQL 8.0 Reference Manual — `bind_address` system variable: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_bind_address
- MySQL 8.0 Reference Manual — CREATE USER / GRANT syntax: https://dev.mysql.com/doc/refman/8.0/en/create-user.html and https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — General query log: https://dev.mysql.com/doc/refman/8.0/en/query-log.html
- Debian/Ubuntu MySQL packaging — default config path `/etc/mysql/mysql.conf.d/mysqld.cnf`
- `ss(8)`, `nc(1)`, `iptables(8)`, and `ufw(8)` man pages
- RFC 5737 (documentation IPv4 prefixes — `203.0.113.0/24` is TEST-NET-3, appropriate for examples)

## Issues Found
No technical issues found.

The mapping of TCP errno values to causes is accurate:
- `(111)` ECONNREFUSED → server not listening (TCP RST received): correct.
- `(110)` ETIMEDOUT → packets dropped silently, typical of a stateful firewall DROP rule: correct.

The Debian/Ubuntu config path (`/etc/mysql/mysql.conf.d/mysqld.cnf`), the `ss -tlnp` / `nc -zv` / `ufw allow from … to any port …` / `iptables -A INPUT -p tcp --dport … -s … -j ACCEPT` commands, and the MySQL `CREATE USER … IDENTIFIED BY …` / `GRANT ALL ON db.* TO …` / `FLUSH PRIVILEGES` syntax are all correct for MySQL 8.0 on a current Ubuntu/Debian system. The example IP `203.0.113.10` is from RFC 5737's documentation block, which is appropriate.

## Review Notes
- `mysql --debug` only produces output when the client binary is built with debug support (`-DWITH_DEBUG=1`). The stock `mysql-client` package on Ubuntu/Debian is typically built without debug, so the `--debug` flag may silently produce no extra output. `--verbose` alone still works. Not incorrect, just worth knowing.
- On MySQL 8.0.13+, the `bind-address` directive accepts a comma-separated list of addresses (e.g., `bind-address = 127.0.0.1,10.0.0.5`) which is sometimes preferable to the broader `0.0.0.0`. The post's `0.0.0.0` example is still valid; just an alternative for tighter exposure.
- `grep 3306` against `iptables -L` / `ufw status` only matches rules that explicitly reference the port number; broader catch-all rules (e.g., `ACCEPT all`) won't appear. Fine for the scoped diagnosis the post is doing.
- The general query log is high-volume and should be turned off (`SET GLOBAL general_log = 'OFF';`) once debugging is complete — the post mentions enabling it but not disabling it.
