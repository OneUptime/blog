# Validation Summary: How to Scale MySQL with Connection Pooling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (connection handling, max_connections, status variables)
- Node.js mysql2 library (promise-based connection pooling)
- Python SQLAlchemy (engine-level connection pooling with mysql-connector-python)
- ProxySQL (proxy-level connection pooling, query routing)

## Sources Consulted
- mysql2 npm package documentation: https://github.com/sidorares/node-mysql2#using-connection-pools
- SQLAlchemy Engine Configuration documentation: https://docs.sqlalchemy.org/en/20/core/engines.html
- SQLAlchemy Connection Pool documentation: https://docs.sqlalchemy.org/en/20/core/pooling.html
- ProxySQL documentation: https://proxysql.com/documentation/
- ProxySQL mysql_servers table: https://proxysql.com/documentation/main-runtime/#mysql_servers
- ProxySQL mysql_users table: https://proxysql.com/documentation/main-runtime/#mysql_users
- ProxySQL stats_mysql_connection_pool: https://proxysql.com/documentation/stats-statistics/
- MySQL Server System Variables (max_connections): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_connections
- MySQL Server Status Variables: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html

## Issues Found
No technical issues found.

## Review Notes
- The `pool_pre_ping=True` explanation states it "runs a lightweight SELECT 1." When using the mysql-connector-python driver (as shown in the connection string), SQLAlchemy actually uses the driver's native `ping()` method which sends a MySQL COM_PING packet, which is even more lightweight than SELECT 1. The explanation is a common simplification and not incorrect in spirit, but could be made more precise in a future revision.
- The "4-8 MB per connection" memory estimate is a reasonable ballpark that accounts for thread stack (~256KB-1MB depending on platform) plus per-connection buffers (read_buffer_size, sort_buffer_size, join_buffer_size, etc.). Actual values depend heavily on MySQL configuration and workload.
- The post covers both application-level and proxy-level pooling well, giving readers a clear progression path as their deployments grow in complexity.
