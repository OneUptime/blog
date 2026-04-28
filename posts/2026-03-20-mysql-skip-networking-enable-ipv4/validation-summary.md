# Validation Summary: How to Disable MySQL skip-networking to Enable IPv4 TCP Connections

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (server configuration: `skip-networking`, `bind-address`, `mysqlx-bind-address`)
- MySQL user account management (CREATE USER, GRANT)
- systemd (`systemctl`)
- Linux networking utilities (`ss`)
- Firewall tooling (`ufw`, `iptables`)
- TCP/IPv4 networking concepts

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html (verified `bind_address`, `skip_networking`)
- MySQL 8.0 Reference Manual — Server Command Options: https://dev.mysql.com/doc/refman/8.0/en/server-options.html (verified `--skip-networking`, `--bind-address`)
- MySQL X Plugin documentation — `mysqlx_bind_address`: https://dev.mysql.com/doc/refman/8.0/en/x-plugin-options-system-variables.html
- MySQL Connecting to the Server — `-h 127.0.0.1` forces TCP vs `localhost` using Unix socket: https://dev.mysql.com/doc/refman/8.0/en/connecting.html
- MySQL CREATE USER / GRANT syntax: https://dev.mysql.com/doc/refman/8.0/en/create-user.html and https://dev.mysql.com/doc/refman/8.0/en/grant.html
- ufw and iptables manual pages for syntax verification

## Issues Found
No technical issues found.

Verified items:
- `skip-networking` accurately described as disabling TCP/IP and leaving only Unix socket connectivity.
- `bind-address` values (`127.0.0.1`, `0.0.0.0`, specific IP) are correctly described.
- `SHOW VARIABLES LIKE 'bind_address'` is valid (variable added in MySQL 8.0.13).
- `SHOW VARIABLES LIKE 'skip_networking'` is valid.
- `mysqlx-bind-address` is the correct option name for the X Protocol bind address.
- `mysql -h 127.0.0.1` correctly forces a TCP connection (vs. `localhost` which uses the Unix socket on Unix systems).
- CREATE USER / GRANT / FLUSH PRIVILEGES syntax is correct.
- `ss -tlnp | grep :3306` is a valid way to confirm MySQL is listening on TCP.
- `ufw allow from 192.168.1.0/24 to any port 3306` is valid ufw syntax.
- `iptables` rules use correct flags and ordering (ACCEPT before DROP on the same chain).

## Review Notes
- On some distributions the systemd unit name is `mysqld` rather than `mysql`; readers may need to adjust `systemctl restart mysql` accordingly. This is a minor distribution-specific note and not an error.
- The comment "Optional: also disable IPv6 by setting only IPv4 bind" alongside `mysqlx-bind-address = 0.0.0.0` is slightly imprecise — `mysqlx-bind-address` controls the X Protocol bind address (port 33060), not the classic protocol. The IPv4-only effect is real, but the line affects the X Protocol listener specifically. Left as-is since it is not technically wrong.
- Since MySQL 8.0.13, `bind-address` accepts a comma-separated list of addresses; the post's single-value examples remain valid for the typical case.
