# Validation Summary: How to Configure Connection Multiplexing with ProxySQL for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ProxySQL (v2.5.5)
- MySQL
- Connection multiplexing / connection pooling

## Sources Consulted
- ProxySQL GitHub Wiki — Multiplexing: https://github.com/sysown/proxysql/wiki/Multiplexing
- ProxySQL GitHub Wiki — Global Variables: https://github.com/sysown/proxysql/wiki/Global-variables
- ProxySQL GitHub Wiki — mysql_query_rules: https://github.com/sysown/proxysql/wiki/mysql_query_rules
- ProxySQL GitHub Wiki — stats_mysql_connection_pool: https://github.com/sysown/proxysql/wiki/stats_mysql_connection_pool
- ProxySQL GitHub Wiki — stats_mysql_processlist: https://github.com/sysown/proxysql/wiki/stats_mysql_processlist
- ProxySQL GitHub Releases: https://github.com/sysown/proxysql/releases

## Issues Found

1. **Incorrect `multiplex` value 2 description (line 82):** The blog described value `2` as "reset multiplexing after query." The actual meaning is "do not disable multiplexing for queries containing `@` variables." Fixed the description to match official documentation.

2. **Non-existent stats variable `Backend_query_num_init` (line 98):** This variable does not exist in `stats_mysql_global`. Replaced with `Server_Connections_connected`, which is a real and relevant variable for monitoring backend connection usage alongside `Client_Connections_connected`.

3. **Incorrect `MultiplexDisabled` column reference (line 112):** `MultiplexDisabled` is not a top-level column in `stats_mysql_processlist`. The multiplexing status is stored inside the `extended_info` JSON field. Changed the query to filter using `WHERE extended_info LIKE '%MultiplexDisabled":true%'`.

4. **Misleading `GET_LOCK()` bullet and missing conditions (lines 104-107):** The original text "User-defined functions and stored procedures using `GET_LOCK()`" implied that UDFs/stored procedures were the issue, when `GET_LOCK()` itself disables multiplexing regardless of context. Replaced with `GET_LOCK()` calls and added three additional missing conditions that permanently disable multiplexing: `CREATE TEMPORARY TABLE`, `SQL_CALC_FOUND_ROWS`, and `PREPARE` statements via text protocol.

## Review Notes
- The ProxySQL version (2.5.5) used in the installation example is valid but was released in August 2023. Newer versions may be available; readers should check the ProxySQL releases page for the latest version.
- The default admin credentials (`admin`/`admin`) are correct but the post could benefit from a note about changing them in production environments.
- The `mysql-free_connections_pct` variable, `mysql-max_connections`, and `mysql-connection_max_age_ms` are all valid and correctly used.
- The `stats_mysql_connection_pool` column names are all correct.
