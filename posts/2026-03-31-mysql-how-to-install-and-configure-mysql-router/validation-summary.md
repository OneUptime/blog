# Validation Summary: How to Install and Configure MySQL Router

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL Router 8.0
- InnoDB Cluster
- MySQL Replication
- systemd service configuration
- Ubuntu/Debian and RHEL/CentOS/Rocky Linux package management

## Sources Consulted
- MySQL Router 8.0 Official Documentation: https://dev.mysql.com/doc/mysql-router/8.0/en/
- MySQL Router Configuration Reference: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-conf-options.html
- MySQL Router Routing Strategies: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-conf-options.html#option_mysqlrouter_routing_strategy
- MySQL Router Connection Sharing (8.0.33): https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-connection-sharing.html
- MySQL APT Repository documentation: https://dev.mysql.com/doc/mysql-apt-repo-quick-guide/en/
- MySQL YUM Repository documentation: https://dev.mysql.com/doc/mysql-yum-repo-quick-guide/en/

## Issues Found
1. **"Connection multiplexing" listed as a MySQL Router feature (line 17)**: MySQL Router does not provide traditional connection multiplexing (as seen in ProxySQL or PgBouncer). The related feature, introduced in MySQL Router 8.0.33, is officially called "connection sharing" — it allows reuse of idle server-side connections but is not true multiplexing. Changed "Connection multiplexing" to "Connection sharing (reuse of idle server connections, available since 8.0.33)" to align with official MySQL terminology.

## Review Notes
- The MySQL APT config package version (0.8.29-1) and YUM repo RPM version (el8-9) are specific point-in-time versions. Readers should check https://dev.mysql.com/downloads/repo/ for the latest repository package versions.
- The `mysqlrouter --version` output showing "Ver 8.0.36" is an example; actual output will depend on the installed version.
- All configuration options (`logging_folder`, `runtime_folder`, `data_folder`, `user`, `routing_strategy`, `protocol`, `bind_address`, `bind_port`, `destinations`) are valid MySQL Router 8.0 configuration directives.
- The routing strategies `first-available` (for write routing) and `round-robin` (for read routing) are correctly applied for their respective use cases.
- Ports 6446 (read-write) and 6447 (read-only) are the standard default MySQL Router ports.
