# Validation Summary: How to Fix max_connect_errors and Blocked Hosts in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (server administration, performance_schema)
- mysqladmin CLI tool
- Python (mysql-connector-python)

## Sources Consulted
- [MySQL 8.0 Reference Manual: The host_cache Table](https://dev.mysql.com/doc/refman/8.0/en/performance-schema-host-cache-table.html)
- [MySQL 8.0 Reference Manual: DNS Lookups and the Host Cache](https://dev.mysql.com/doc/refman/8.0/en/host-cache.html)
- [MySQL 8.0 Reference Manual: Server System Variables (max_connect_errors)](https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- [MySQL 8.0 Reference Manual: FLUSH Statement](https://dev.mysql.com/doc/refman/8.0/en/flush.html)
- [MySQL 8.0.23 Release Notes](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-23.html)

## Issues Found

1. **Wrong column name `COUNT_CONNECT_ERRORS`**: The correct column in `performance_schema.host_cache` is `SUM_CONNECT_ERRORS`, not `COUNT_CONNECT_ERRORS`. Fixed in both SQL queries.

2. **Nonexistent `BLOCKED` column**: The `performance_schema.host_cache` table has no `BLOCKED` column. Replaced with a `WHERE SUM_CONNECT_ERRORS >= @@GLOBAL.max_connect_errors` condition and added `COUNT_HOST_BLOCKED_ERRORS` to the SELECT.

3. **Incorrect variable scope claim**: The comment said `max_connect_errors` can be set as "session or global". It is a GLOBAL-only variable. Fixed the comment to say "global variable".

4. **`FLUSH HOSTS` deprecated**: `FLUSH HOSTS` was deprecated in MySQL 8.0.23 and removed in MySQL 8.4. Replaced the primary recommendation with `TRUNCATE TABLE performance_schema.host_cache` and added a deprecation note.

5. **Wrong credentials listed as root cause**: Authentication failures (wrong passwords) do NOT increment `SUM_CONNECT_ERRORS` and do not trigger `max_connect_errors` host blocking. Only protocol handshake errors count. Replaced "Application connecting with wrong credentials" and "DNS resolution failures" with accurate causes: "Clients disconnecting during the protocol handshake phase" and "Port scanners or monitoring tools making incomplete connections".

6. **Misleading flushing comparison**: The claim "Flushing the host cache has the same effect as resizing it to 0 and back" was inaccurate. Flushing clears the cache while keeping it enabled; setting `host_cache_size = 0` disables the cache entirely. Rewrote to clarify the distinction.

## Review Notes
- The Python code example using `mysql.connector` is correct and uses current API.
- The `mysqladmin flush-hosts` CLI command remains functional as it internally uses `TRUNCATE TABLE` in newer MySQL versions.
- The post does not specify a MySQL version; the fixes ensure accuracy for MySQL 8.0+ which is the current mainstream version.
