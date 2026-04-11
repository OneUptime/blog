# Validation Summary: What Is ProxySQL for MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ProxySQL (v2.6.0 referenced)
- MySQL
- Percona Server (mentioned as compatible)
- MariaDB (mentioned as compatible)
- Orchestrator / MHA (mentioned for failover integration)

## Sources Consulted
- ProxySQL official documentation: https://proxysql.com/documentation/
- ProxySQL stats_mysql_query_digest documentation: https://proxysql.com/documentation/stats-mysql-query-digest/
- ProxySQL mysql_servers documentation: https://proxysql.com/documentation/main-runtime/#mysql_servers
- ProxySQL mysql_query_rules documentation: https://proxysql.com/documentation/main-runtime/#mysql_query_rules
- ProxySQL GitHub wiki: https://github.com/sysown/proxysql/wiki

## Issues Found
1. **`avg_time` is not a native column in `stats_mysql_query_digest`** — The query in the "Query Statistics" section selected `avg_time` as if it were a column in the `stats_mysql_query_digest` table. This column does not exist. The standard columns are: hostgroup, schemaname, username, client_address, digest, digest_text, count_star, first_seen, last_seen, sum_time, min_time, max_time, sum_rows_affected, and sum_rows_sent. Fixed by replacing `avg_time` with the calculated expression `sum_time/count_star AS avg_time`.

## Review Notes
- The architecture diagram shows ProxySQL listening on port 3306. The actual default ProxySQL MySQL traffic port is 6033. While configuring it on 3306 is a common and valid production practice (to be transparent to applications), readers should be aware the default is 6033. This is not an error per se, just a note for clarity.
- The default admin credentials (admin/admin) shown in connection examples are correct for a fresh install but should be changed in production. The post uses them appropriately for demonstration purposes.
- All SQL syntax for ProxySQL admin commands (INSERT INTO mysql_servers, LOAD/SAVE commands, query rules) is correct and follows current ProxySQL conventions.
- The query caching `cache_ttl` value of 5000 correctly represents 5 seconds (milliseconds). This is accurate.
