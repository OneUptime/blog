# Validation Summary: How to Use MySQL Router for Load Balancing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL Router
- MySQL InnoDB Cluster
- MySQL Classic Protocol and X Protocol
- systemd service management
- MySQL Router REST API

## Sources Consulted
- MySQL Router 8.0 Reference Manual (https://dev.mysql.com/doc/mysql-router/8.0/en/)
- MySQL Router configuration documentation (https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-conf-options.html)
- MySQL Router routing strategies documentation (https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-conf-options.html#option_mysqlrouter_routing_strategy)
- MySQL Router REST API documentation (https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-rest-api.html)
- MySQL Router bootstrap documentation (https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-deploying-bootstrapping.html)

## Issues Found
1. **Incorrect `round-robin-with-fallback` description**: The post described this routing strategy as "round-robin primaries; fall back to secondaries." This is backwards. Per MySQL Router documentation, `round-robin-with-fallback` distributes connections across secondary (read-only) instances using round-robin, and falls back to the primary (read-write) instance if no secondaries are available. Fixed the comment to read "round-robin secondaries; fall back to primary."

## Review Notes
- The default ports (6446, 6447, 6448, 6449) are correct for bootstrapped MySQL Router configurations with InnoDB Cluster.
- The bootstrap command flags (`--bootstrap`, `--directory`, `--conf-use-sockets`, `--conf-bind-address`, `--user`) are all valid.
- The manual configuration section uses correct INI section names and option keys (`[routing:name]`, `bind_address`, `bind_port`, `destinations`, `routing_strategy`, `protocol`).
- The `connect_timeout`, `client_connect_timeout`, and `max_connections` options are valid configuration parameters with reasonable values.
- The REST API endpoint path (`/api/20190715/router/status`) uses the correct versioned API format for MySQL Router 8.0.
- The Python DSN example uses `text` code block rather than `python`, which is a stylistic choice (likely intentional to avoid implying a specific library's connection syntax).
- In MySQL Router 8.4+, some REST API configuration has changed (REST plugins are enabled by default after bootstrap). The manual REST API configuration shown is still valid for explicit setups.
