# Validation Summary: How to Configure ProxySQL Failover for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ProxySQL (proxy layer, admin interface, monitor module)
- MySQL (replication, read_only variable)
- Keepalived (VRRP for ProxySQL high availability)
- Orchestrator / MHA (mentioned as external failover tools)

## Sources Consulted
- ProxySQL official documentation — Backend Monitoring: https://www.proxysql.com/documentation/backend-monitoring/
- ProxySQL official documentation — MySQL Tables: https://proxysql.com/documentation/main-runtime/mysql-tables/
- ProxySQL wiki — mysql_replication_hostgroups: https://proxysql.com/documentation/main-runtime/
- ProxySQL GitHub repository (schema definitions and issue discussions): https://github.com/sysown/proxysql
- Keepalived official documentation for VRRP configuration

## Issues Found

1. **Misleading claim about external tool updating `mysql_servers`** (line 13): The intro stated that automatic failover requires "an external tool to update `mysql_servers` with the new primary after promotion." This is incorrect when using `mysql_replication_hostgroups` — ProxySQL automatically reassigns servers between hostgroups based on the `read_only` variable. The external tool only needs to promote the replica (set `read_only=OFF`). Fixed to clarify that ProxySQL handles the hostgroup reassignment automatically.

2. **Typo: "shunns" → "shuns"** (line 51): Double-n spelling error in the "Handling the Failed Primary" section. Fixed to correct spelling.

3. **Incorrect column names in `mysql_server_connect_log` query** (lines 58–59): The query used `connect_success` and `error` as column names. The actual ProxySQL column names are `connect_success_time_us` (connection time in microseconds) and `connect_error` (error message string). Fixed to use the correct column names.

## Review Notes
- The `mysql_replication_hostgroups` table's `check_type` column was introduced in ProxySQL 2.0. The post does not specify a ProxySQL version, but the SQL is correct for ProxySQL 2.0+.
- The Keepalived configuration shown is minimal and sufficient for illustration purposes. A production setup would typically include authentication, health check scripts for ProxySQL, and a BACKUP instance configuration.
- The post correctly notes that ProxySQL does not perform primary promotion itself — this is an important distinction that many users confuse.
