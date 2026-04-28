# Validation Summary: How to Configure MySQL bind-address for Remote IPv4 Connections

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0 (server configuration, user management)
- Linux service management (systemd)
- Networking utilities (`ss`, `nc`, `mysqladmin`)
- Firewall tools (`ufw`, `iptables`)

## Sources Consulted
- MySQL 8.0 Reference Manual — GRANT statement syntax: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — `bind_address` server system variable: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — CREATE USER statement: https://dev.mysql.com/doc/refman/8.0/en/create-user.html

## Issues Found
- **`GRANT ... IDENTIFIED BY` syntax in the first user grant example (line 47).** The original post used `GRANT ALL PRIVILEGES ON mydb.* TO 'appuser'@'10.0.0.5' IDENTIFIED BY 'password';`. The `IDENTIFIED BY` clause was removed from `GRANT` in MySQL 8.0, and `GRANT` no longer creates accounts implicitly — the user must be created first with `CREATE USER`. The post itself acknowledges this in the comment for the subnet example but inconsistently still used the deprecated syntax in the first example. Fixed by adding a `CREATE USER 'appuser'@'10.0.0.5' IDENTIFIED BY 'password';` line before the `GRANT`, and dropping the `IDENTIFIED BY` clause from the `GRANT`. The "MySQL 8.0+ requires CREATE USER first" comment was moved up to apply to the first example, since it is now correct for both.

## Review Notes
- The introduction states "By default, MySQL binds to `127.0.0.1`". Strictly speaking, the upstream MySQL 8.0 default for `bind_address` is `*` (listen on all IPv4/IPv6 interfaces). However, the Ubuntu/Debian MySQL packages override this to `127.0.0.1` in `mysqld.cnf`, which matches what most users encounter — left as-is since the post is oriented toward Ubuntu/Debian (which it explicitly references) and clarifying this would require restructuring rather than a technical correction.
- The "Disable IPv6 binding" comment is technically correct: setting `bind_address` to a single IPv4 address (such as `203.0.113.10`) causes MySQL to listen only on that IPv4 address, excluding IPv6. This is documented in the MySQL reference manual.
- The `iptables` rules shown are stateless and add `-j DROP` last, which is correct ordering for INPUT chain (rules are evaluated top-down). Note that `iptables` rules are not persistent across reboots without `iptables-persistent` (Debian/Ubuntu) or `iptables-services` (RHEL/CentOS) — not flagged as an issue but worth being aware of.
- On RHEL/CentOS, the systemd unit is typically `mysqld.service` rather than `mysql.service`, so `sudo systemctl restart mysqld` may be needed instead. The post only shows `mysql`, which is the Ubuntu/Debian unit name — minor distribution caveat.
- `ss -tlnp | grep mysql` works because the process binary is `mysqld` (which contains the substring "mysql"). Correct as written.
- The `nc -zv` expected output format matches the standard openbsd-netcat output on Linux. Correct.
