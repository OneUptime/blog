# Validation Summary: How to Configure MySQL to Listen on All IPv4 Interfaces

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (server configuration, user management, GRANT system)
- Linux config file conventions (my.cnf / mysqld.cnf)
- systemd (`systemctl`)
- Networking utilities (`ss`, `netstat`)
- UFW firewall
- iptables

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables (`bind_address`, `skip_name_resolve`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — `CREATE USER` Statement: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual — `GRANT` Statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — Account Names (host wildcard `%` and IP/netmask): https://dev.mysql.com/doc/refman/8.0/en/account-names.html
- MySQL 8.0 Reference Manual — Using Option Files: https://dev.mysql.com/doc/refman/8.0/en/option-files.html
- Debian/Ubuntu MySQL package layout (`/etc/mysql/mysql.conf.d/mysqld.cnf`)
- RHEL/CentOS MySQL package layout (`/etc/my.cnf`)
- `ss(8)` and `netstat(8)` man pages
- Ubuntu UFW manual: https://manpages.ubuntu.com/manpages/jammy/en/man8/ufw.8.html
- iptables(8) man page

## Issues Found
No technical issues found.

## Review Notes
- `skip-name-resolve = ON` is accepted by MySQL's option-file parser; the equivalent forms `skip-name-resolve` (no value) and `skip-name-resolve = 1` are also valid. Left as-written.
- `DELETE FROM mysql.user ...` followed by `FLUSH PRIVILEGES` works but is the legacy approach. Modern best practice is `DROP USER 'root'@'<host>'` per user, since direct manipulation of the grant tables is discouraged in MySQL 5.7+. The example as written is still functional and documented behavior.
- The expected `netstat` output line is simplified (real output also includes Recv-Q/Send-Q columns and a PID/Program field with `-p`). Adequate for illustrative purposes.
- On RHEL/CentOS, the systemd unit is typically named `mysqld` rather than `mysql`. The post's `systemctl restart mysql` works on Debian/Ubuntu (which is the dominant convention here). Users on RHEL-based distros may need `systemctl restart mysqld`. Not a technical error in context, but worth noting.
- `bind-address = 0.0.0.0` listens only on IPv4 interfaces, which matches the post's stated goal. To also listen on IPv6, MySQL 8.0 supports `bind-address = *` or a comma-separated list (e.g. `bind-address = 0.0.0.0,::`). Out of scope for this IPv4-focused post.
