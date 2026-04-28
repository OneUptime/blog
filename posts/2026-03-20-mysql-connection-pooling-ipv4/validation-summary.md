# Validation Summary: How to Set Up MySQL Connection Pooling with ProxySQL on IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ProxySQL 2.5.5
- MySQL
- Debian/Ubuntu and RHEL/CentOS package management
- systemd
- IPv4 networking

## Sources Consulted
- ProxySQL v2.5.5 GitHub release assets (https://github.com/sysown/proxysql/releases/tag/v2.5.5) — verified actual Debian package naming convention
- ProxySQL example configuration `etc/proxysql.cnf` at v2.5.5 (https://github.com/sysown/proxysql/blob/v2.5.5/etc/proxysql.cnf) — verified `mysql_variables.interfaces` vs `admin_variables.mysql_ifaces`
- ProxySQL Global Variables documentation (https://proxysql.com/documentation/global-variables/) — confirmed `mysql-interfaces` is one of three variables that cannot be changed at runtime

## Issues Found
1. **Incorrect Debian package filename.** The post referenced `proxysql_2.5.5-debian-bullseye_amd64.deb`, which does not exist in the v2.5.5 release. The actual asset for Debian 11 (Bullseye) is `proxysql_2.5.5-debian11_amd64.deb`. Updated the URL and `dpkg -i` filename accordingly. Also changed `curl -O` to `curl -LO` so the redirect from GitHub releases is followed.

2. **Wrong config field for the MySQL listener.** The post showed `mysql_ifaces="10.0.0.5:6033"` as a `/etc/proxysql.cnf` entry. In ProxySQL, `mysql_ifaces` belongs to `admin_variables` (admin port 6032). The MySQL client listener (port 6033) is configured via `interfaces` inside `mysql_variables`. Replaced the example with `mysql_variables = { interfaces="10.0.0.5:6033" }`.

3. **`mysql-interfaces` is not runtime-mutable.** The original UPDATE/LOAD/SAVE block implied the change would apply via `LOAD MYSQL VARIABLES TO RUNTIME`. Per ProxySQL docs, `mysql-interfaces` is one of three variables that cannot be loaded at runtime and requires a restart. Removed the misleading `LOAD ... TO RUNTIME` step and added a `systemctl restart proxysql` hint plus a comment explaining the constraint.

## Review Notes
- The ProxySQL admin (6032) and MySQL client (6033) default ports, the `mysql_servers` / `mysql_users` / `mysql_query_rules` schemas, and the `LOAD/SAVE ... TO RUNTIME/DISK` syntax all check out against the v2.5.5 source.
- The `stats.stats_mysql_connection_pool` table reference is correct.
- The `INSERT INTO mysql_users` does not specify `active` (defaults to 1) — fine, but readers extending the example may want to be aware.
- The MySQL backend `GRANT` example shows both `GRANT ALL` and `GRANT SELECT` for the same user; the inline comment `-- On replicas` makes the intent reasonable, though in a real replication topology the GRANT typically replicates from the primary rather than being applied separately on replicas.
- ProxySQL 2.5.5 was released in mid-2023; newer 2.x releases exist. The version pin is fine for a tutorial but readers may want to use a current release.
