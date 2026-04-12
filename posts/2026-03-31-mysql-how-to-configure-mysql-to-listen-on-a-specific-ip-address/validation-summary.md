# Validation Summary: How to Configure MySQL to Listen on a Specific IP Address

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7, 8.0+)
- bind-address configuration in my.cnf
- ss and netstat CLI tools
- UFW firewall
- systemd service management

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (bind-address) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_bind_address
- MySQL 8.0 Reference Manual: CREATE USER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Release Notes for 8.0.13 (multiple bind-address support) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-13.html
- UFW manual page for firewall rule syntax

## Issues Found
No technical issues found.

## Review Notes
- The section heading "Binding to Multiple Addresses (MySQL 8.0+)" is slightly imprecise since the feature was introduced in 8.0.13 specifically, but the body text correctly states "MySQL 8.0.13 and later", so this is not an error.
- `FLUSH PRIVILEGES` after `GRANT` is technically unnecessary in MySQL 5.7.6+ and 8.0 (the server reloads grant tables automatically after account management statements), but it is harmless and is a widely used convention in MySQL tutorials.
- The default bind-address in MySQL is `*` (not `0.0.0.0`), which means all IPv4 and IPv6 interfaces. The post's phrasing "may bind to all available network interfaces (`0.0.0.0`)" is slightly imprecise but acceptable since the post uses "may" as a hedge and many readers work in IPv4-only environments. Additionally, many Linux distribution packages override the default to `127.0.0.1`.
- On Debian/Ubuntu, the bind-address is more commonly configured in `/etc/mysql/mysql.conf.d/mysqld.cnf` (included from the main config), but `/etc/mysql/my.cnf` is still a valid location.
