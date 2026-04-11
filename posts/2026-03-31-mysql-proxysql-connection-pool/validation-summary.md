# Validation Summary: How to Use MySQL Connection Pooling with ProxySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- ProxySQL (v2.5.5)
- Connection pooling / multiplexing
- Linux (Ubuntu/Debian) system administration

## Sources Consulted
- ProxySQL GitHub Wiki - STATS (statistics): https://github.com/sysown/proxysql/wiki/STATS-(statistics)
- ProxySQL Global Variables documentation: https://github.com/sysown/proxysql/blob/master/doc/global_variables.md
- ProxySQL Admin Tables documentation: https://github.com/sysown/proxysql/blob/master/doc/admin_tables.md
- ProxySQL MySQL Variables: https://proxysql.com/documentation/global-variables/mysql-variables/
- ProxySQL Backend Monitoring: https://www.proxysql.com/documentation/backend-monitoring/
- ProxySQL Stats MySQL Tables: https://www.proxysql.com/documentation/the-admin-schemas/stats/stats-mysql

## Issues Found

1. **Incorrect comment for `mysql-max_connections`**: The comment described it as "Maximum backend connections ProxySQL will open per server (global default)" but this variable actually controls the maximum number of client (frontend) TCP connections ProxySQL will accept. Backend connections per server are controlled by `max_connections` in the `mysql_servers` table. Fixed the comment to read "Maximum client (frontend) connections ProxySQL will accept."

2. **Misleading comment for `mysql-wait_timeout`**: The comment said "How long a client connection can wait for a free backend connection" but this variable actually controls the idle client session timeout - ProxySQL kills sessions that have been idle longer than this threshold. Fixed the comment accordingly.

3. **Non-existent column `connconn` in `stats_mysql_connection_pool`**: The query referenced a `connconn` column which does not exist in the `stats_mysql_connection_pool` table. The valid columns are: `hostgroup`, `srv_host`, `srv_port`, `status`, `ConnUsed`, `ConnFree`, `ConnOK`, `ConnERR`, `MaxConnUsed`, `Queries`, `Queries_GTID_sync`, `Bytes_data_sent`, `Bytes_data_recv`, `Latency_us`. Replaced `connconn` with `ConnERR` (total failed connections) which is a useful diagnostic column.

4. **Wrong column names in `stats_mysql_processlist` query**: Multiple column names were incorrect:
   - `client_host` changed to `cli_host` (correct ProxySQL column name)
   - `backend_host` changed to `srv_host` (correct ProxySQL column name)
   - `connected_at` removed (this column does not exist in the table)
   - `current_query` changed to `info` (aliased as `current_query` for readability)
   - WHERE clause updated from `current_query != ''` to `info != ''`

5. **Wrong column name `ping_success` in `monitor.mysql_server_ping_log`**: The correct column name is `ping_success_time_us` (returns the ping latency in microseconds). Fixed.

6. **Wrong column name `connect_success` in `monitor.mysql_server_connect_log`**: The correct column name is `connect_success_time_us` (returns the connection latency in microseconds). Fixed.

## Review Notes
- The `mysql-throttle_connections_per_sec_to_hostgroup` variable is valid (introduced in ProxySQL v1.4.4) and can also be overridden per-hostgroup via the `throttle_connections_per_sec` column in `mysql_hostgroup_attributes` (ProxySQL v2.5+).
- The installation section references ProxySQL v2.5.5 specifically. The download URL format is correct for GitHub releases, but readers should check for newer versions.
- The `mysql-connect_timeout_server_max` description ("Timeout waiting for a backend connection from the pool") is slightly imprecise - it is actually the maximum timeout for establishing a backend connection (with exponential backoff from `mysql-connect_timeout_server`), not specifically for waiting for a pooled connection. This is minor and left as-is since the practical effect is similar.
- All ProxySQL admin commands (`LOAD ... TO RUNTIME`, `SAVE ... TO DISK`) are correct.
- The overall architecture explanation of connection multiplexing is accurate.
