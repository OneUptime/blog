# Validation Summary: How to Fix ERROR 2003 Can't Connect to MySQL Server on Host

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (server and client)
- systemd (systemctl, journalctl)
- Linux networking tools (ss, netstat, nc, telnet)
- UFW (Ubuntu firewall)
- firewalld (CentOS/RHEL firewall)
- MySQL user grants and privileges

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (bind-address) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_bind_address
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: Client Error Message Reference (CR_CONN_HOST_ERROR / ERROR 2003) — https://dev.mysql.com/doc/refman/8.0/en/error-messages-client.html
- Linux man pages: errno(3) for ECONNREFUSED (111), ETIMEDOUT (110)
- macOS/BSD errno values: ECONNREFUSED (61)
- UFW documentation — https://help.ubuntu.com/community/UFW
- firewalld documentation — https://firewalld.org/documentation/

## Issues Found
No technical issues found.

## Review Notes
- `FLUSH PRIVILEGES` is included after `CREATE USER` and `GRANT` statements. While not strictly necessary (it is only required after directly modifying the grant tables such as `mysql.user`), including it is harmless and is common practice in documentation. Not a correctness issue.
- The post states MySQL binds to `127.0.0.1` by default. The MySQL server's own built-in default (when no config is specified) is `*` (all interfaces) as of MySQL 8.0. However, the default config files shipped by Debian/Ubuntu packages do set `bind-address = 127.0.0.1`, so the statement is accurate for the practical context of this troubleshooting guide.
- The guide covers both Debian/Ubuntu and RHEL/CentOS paths, which is good for broad applicability.
