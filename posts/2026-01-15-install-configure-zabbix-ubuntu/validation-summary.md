# Validation Summary: How to Install and Configure Zabbix on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Zabbix 6.4 (server, frontend, agent)
- Ubuntu (20.04 / 22.04 / 24.04)
- MySQL / MariaDB
- Apache HTTP Server
- PHP
- SNMP (snmpd)
- Zabbix templates, triggers, items, and alerting

## Sources Consulted
- Zabbix 6.4 Requirements (supported DB/PHP/Apache versions): https://www.zabbix.com/documentation/6.4/en/manual/installation/requirements
- Zabbix 6.4 Debian/Ubuntu installation from packages: https://www.zabbix.com/documentation/6.4/en/manual/installation/install_from_packages/debian_ubuntu
- Zabbix 6.4 "Linux by Zabbix agent active" template source: https://git.zabbix.com/projects/ZBX/repos/zabbix/browse/templates/os/linux_active?at=release/6.4
- Zabbix monitor Linux guide: https://www.zabbix.com/documentation/current/en/manual/guides/monitor_linux

## Issues Found
1. **Incorrect minimum MySQL version in the System Requirements table.** The table listed `MySQL 5.7+` as the minimum database version. Zabbix 6.4 officially supports MySQL **8.0.30–9.0.X** and enforces a database version check on startup (it refuses to run against MySQL 5.7). Changed the entry to `MySQL 8.0.30+`. Note: this does not affect the install commands, since Ubuntu 22.04/24.04 ship MySQL 8.0 by default via `mysql-server`.
2. **Outdated/incorrect template name.** The "Add Hosts to Monitor" section listed `Template OS Linux by Zabbix agent active`. The `Template OS ...` prefix was removed in Zabbix 5.4; the correct Zabbix 6.4 template name is `Linux by Zabbix agent active`. Updated accordingly.

## Review Notes
- The repository `.deb` URL and package set (`zabbix-server-mysql`, `zabbix-frontend-php`, `zabbix-apache-conf`, `zabbix-sql-scripts`, `zabbix-agent`) are correct for Zabbix 6.4 on Ubuntu 22.04.
- The schema import path `/usr/share/zabbix-sql-scripts/mysql/server.sql.gz` (gzipped, imported via `zcat`) is correct for Zabbix 6.4.
- The database setup (utf8mb4 / utf8mb4_bin collation, `log_bin_trust_function_creators` toggling around the import) matches the official procedure.
- The trigger expression syntax `last(/Custom Application Monitor/custom.app.status)=0` correctly uses the Zabbix 5.4+/6.x expression syntax.
- `PHP 7.4 or later` in the prerequisites is accurate as a minimum (Zabbix 6.4 supports 7.4.0–8.3.X). The `/etc/php/8.1/...` path is correct for Ubuntu 22.04; users on 24.04 should substitute the shipped PHP version (8.3).
- `innodb_log_file_size` is technically deprecated in favor of `innodb_redo_log_capacity` in MySQL 8.0.30+, but the directive still works and is harmless; left as-is.
- Default web login `Admin` / `zabbix` and the `agent.hostname` item key used with `zabbix_get` are both correct.
