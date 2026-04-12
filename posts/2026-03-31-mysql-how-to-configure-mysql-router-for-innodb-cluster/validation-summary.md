# Validation Summary: How to Configure MySQL Router for InnoDB Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Router
- MySQL InnoDB Cluster
- MySQL Shell (referenced implicitly via cluster admin)
- Python (mysql.connector for application example)

## Sources Consulted
- MySQL Router 8.0 Reference Manual — Deploying MySQL Router with InnoDB Cluster: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-deploying-with-cluster.html
- MySQL Router 8.0 Reference Manual — Configuration File Options: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-conf-options.html
- MySQL Router 8.0 Reference Manual — Bootstrapping: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-deploying-bootstrapping.html
- MySQL Router 8.0 Reference Manual — Routing Strategies: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-conf-options.html#option_mysqlrouter_routing_strategy

## Issues Found
- **Re-Bootstrapping section was misleading**: The original text stated "If you add or remove nodes from the cluster, re-run bootstrap." This is incorrect — MySQL Router's metadata-cache protocol automatically detects topology changes (node additions/removals) through periodic metadata refresh. Re-bootstrapping is only required for configuration-level changes such as cluster name changes, credential rotation, or metadata server updates. Updated the section to clarify when re-bootstrapping is actually needed.

## Review Notes
- The default ports (6446, 6447, 6448, 6449) are accurate for a bootstrapped MySQL Router configuration.
- The routing strategies (`first-available` for RW, `round-robin-with-fallback` for RO) are correct and match the auto-generated bootstrap configuration.
- The `metadata-cache://` destination protocol and role parameters (PRIMARY, SECONDARY) are correctly shown.
- The log output shown is illustrative rather than exact MySQL Router log format, but this is acceptable for a tutorial context.
- The package name `mysql-router` is correct when using the official MySQL APT/YUM repositories; some setups may use `mysql-router-community` depending on repository configuration.
