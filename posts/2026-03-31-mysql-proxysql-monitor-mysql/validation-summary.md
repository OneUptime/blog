# Validation Summary: How to Monitor MySQL Through ProxySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL
- ProxySQL (admin interface, stats schema, monitor module, REST API)
- Prometheus (metrics scraping)

## Sources Consulted
- ProxySQL official documentation: https://proxysql.com/documentation/
- ProxySQL admin interface stats tables documentation: https://proxysql.com/documentation/stats-statistics/
- ProxySQL GitHub repository (schema definitions for monitor tables): https://github.com/sysown/proxysql
- ProxySQL global variables documentation: https://proxysql.com/documentation/global-variables/admin-variables/
- ProxySQL monitor module documentation: https://proxysql.com/documentation/monitor-module/
- ProxySQL RESTful API / Prometheus metrics documentation: https://proxysql.com/documentation/prometheus-exporter/

## Issues Found

1. **Incorrect column name in replication lag query**: The query on `mysql_server_replication_lag_log` used `replication_lag` as a column name, but the actual column is `repl_lag`. This would cause a SQL error when executed. Fixed the column name.

2. **Inaccurate `OFFLINE_HARD` description**: The post stated that `OFFLINE_HARD` means a server "was manually taken offline." In reality, `OFFLINE_HARD` indicates a server has been immediately removed from the connection pool and can be set either manually by an administrator or automatically by the ProxySQL monitor module (e.g., when a server is completely unreachable). Updated the description to reflect both possibilities.

3. **Incomplete Prometheus metrics setup**: The post showed setting `admin-stats_credentials` and loading admin variables, but omitted the required `admin-restapi_enabled=1` setting. Without enabling the REST API, the `/metrics` endpoint at port 6070 would not be accessible. Added the missing variable to the setup command.

## Review Notes
- The `mysql-monitor_slave_lag_when_null` variable name uses legacy "slave" terminology. ProxySQL still uses this naming as of current versions, so it is technically correct, but users should be aware this may change in future versions as the ecosystem moves toward "replica" terminology.
- The post does not specify a ProxySQL version. All content is accurate for ProxySQL 2.x. Users on older 1.x versions may encounter differences in available stats tables and variables.
- The Prometheus section could benefit from mentioning `SAVE ADMIN VARIABLES TO DISK;` to persist the REST API configuration across restarts, but this is a style choice rather than an error since other sections in the post similarly omit the SAVE step in some cases.
- The `stats_mysql_query_digest` query correctly treats `sum_time` as microseconds (dividing by 1000 for milliseconds), which aligns with ProxySQL's internal time tracking.
