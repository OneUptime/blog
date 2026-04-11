# Validation Summary: How to Troubleshoot MySQL Router Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL Router
- MySQL InnoDB Cluster / Group Replication
- MySQL Shell
- mysql-connector-python (Python MySQL driver)
- systemd (service management)

## Sources Consulted
- MySQL Router 8.0 Configuration File Options — https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-conf-options.html
- MySQL Router 8.0 Connection Routing — https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-general-features-connection-routing.html
- MySQL Performance Schema Table Characteristics — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-characteristics.html
- MySQL Shell Configuring the MySQL Router User — https://dev.mysql.com/doc/mysql-shell/8.0/en/configuring-router-user.html
- MySQL Connector/Python errorcode Module — https://dev.mysql.com/doc/connector-python/en/connector-python-api-errorcode.html

## Issues Found

1. **Incorrect GRANT privileges on performance_schema tables**: The post granted INSERT, UPDATE, DELETE on `performance_schema.replication_group_members` and `performance_schema.replication_group_member_stats`. These are read-only performance_schema tables that only support SELECT. Changed to `GRANT SELECT` only.

2. **Wrong MySQL Shell function for router account setup**: The post recommended `dba.configureInstance('admin@node1:3306')` for setting up router bootstrap privileges. `dba.configureInstance()` configures a MySQL instance for InnoDB Cluster, not router accounts. Replaced with `cluster.setupRouterAccount('admin@%')`, which is the correct MySQL Shell function (available since 8.0.20) for creating router accounts with minimal privileges.

3. **Stale cursor after connection reconnect in Python example**: After `conn.reconnect()`, the existing cursor object is tied to the old connection state and would not work reliably on retry. Added `cursor = conn.cursor()` after reconnect to create a fresh cursor.

## Review Notes
- The metadata cache TTL default of 0.5 seconds is correct but only when Group Replication notifications are disabled. When GR notifications are enabled (via `--conf-use-gr-notifications` during bootstrap), the recommended TTL is 60.0 seconds. The post could mention this distinction in a future update.
- The post uses MySQL Router 8.0 conventions. MySQL Router 8.4 introduced some changes; the content remains valid for 8.0 deployments.
