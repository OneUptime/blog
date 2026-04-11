# Validation Summary: How to Monitor MySQL Router Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL Router 8.0.17+
- MySQL Router REST API
- MySQL Shell (`dba.getCluster()`, `cluster.listRouters()`)
- mysqlrouter_passwd CLI utility
- ss (socket statistics) for port monitoring
- Prometheus exposition format (custom scrape script)
- Python 3 (for JSON parsing in shell scripts)

## Sources Consulted
- MySQL Router 8.0.17 Release Notes — https://dev.mysql.com/doc/relnotes/mysql-router/8.0/en/news-8-0-17.html
- MySQL Router 8.0 REST API Reference — https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-rest-api-reference.html
- mysqlrouter_passwd Command Line Options — https://dev.mysql.com/doc/mysql-router/8.0/en/mysqlrouter_passwd.html
- MySQL Router 8.0 Configuration File Documentation — https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-configuration-file-example.html

## Issues Found
1. **Incorrect sample JSON response fields**: The sample response for the `/routes/{routeName}/status` endpoint used `totalConnectionsUp` and `totalConnectionsDown`, which are not real fields in the MySQL Router REST API. The correct field is `totalConnections` (a single integer representing total connections handled by the route). Fixed the sample response to use `totalConnections` and removed the fabricated `totalConnectionsDown` field.

2. **Misleading section heading**: The section titled "Check Port Usage with netstat" used `ss` commands exclusively, not `netstat`. Changed the heading to "Check Port Usage with ss" to match the actual commands shown.

## Review Notes
- The REST API base path `/api/20190715/` is tied to the API version introduced in MySQL Router 8.0.17. Future MySQL Router versions may introduce newer API versions with different base paths.
- The REST API configuration shown is for manually configured MySQL Router. When MySQL Router is bootstrapped with `mysqlrouter --bootstrap`, some REST API plugins may be enabled automatically depending on the version.
- The default log location `/var/log/mysqlrouter/mysqlrouter.log` is typical for system-package installations on Linux but may differ for other installation methods or platforms.
- The `cluster.listRouters()` output format may vary slightly between MySQL Shell versions; the fields shown are representative.
