# How to Monitor MySQL Through ProxySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ProxySQL, Monitoring, Performance, Replication

Description: Learn how to use ProxySQL's built-in stats tables to monitor MySQL connection pools, query performance, and backend health in real time.

---

## ProxySQL's Admin Stats Interface

ProxySQL exposes a dedicated stats schema on its admin interface (default port 6032). Every table in this schema is read-only and refreshed automatically. Connect to the admin interface to query them:

```bash
mysql -h 127.0.0.1 -P 6032 -u admin -padmin --prompt "ProxySQL Admin> "
```

## Monitoring Backend Server Health

`stats_mysql_connection_pool` shows the current state of each connection pool, including free and used connections and the hostgroup each server belongs to.

```sql
SELECT hostgroup, srv_host, srv_port, status,
       ConnUsed, ConnFree, ConnOK, ConnERR,
       Queries, Bytes_data_sent, Bytes_data_recv
FROM stats_mysql_connection_pool
ORDER BY hostgroup, srv_host;
```

A `status` of `SHUNNED` means ProxySQL has temporarily removed the server from rotation due to errors. `OFFLINE_HARD` means it has been immediately removed from the pool, either by an admin or automatically by the monitor module.

## Checking Global Query Statistics

`stats_mysql_global` provides aggregate counters covering all activity since the last restart.

```sql
SELECT Variable_Name, Variable_Value
FROM stats_mysql_global
WHERE Variable_Name IN (
  'Client_Connections_connected',
  'Client_Connections_created',
  'Server_Connections_connected',
  'Questions',
  'Slow_queries',
  'Query_Cache_count_GET_OK'
);
```

## Identifying Slow Queries

ProxySQL logs query digests in `stats_mysql_query_digest`. Filter by average execution time to find bottlenecks:

```sql
SELECT digest_text,
       count_star AS executions,
       ROUND(sum_time / count_star / 1000) AS avg_ms,
       sum_time / 1000 AS total_ms,
       hostgroup
FROM stats_mysql_query_digest
ORDER BY avg_ms DESC
LIMIT 10;
```

Reset the digest table after reviewing it to start fresh:

```sql
SELECT * FROM stats_mysql_query_digest_reset LIMIT 1;
```

## Monitoring Replication Lag via Monitor Module

ProxySQL's monitor module polls replicas and tracks replication lag. Query its log table to see recent readings:

```sql
SELECT hostname, port, time_start_us, repl_lag, error
FROM mysql_server_replication_lag_log
ORDER BY time_start_us DESC
LIMIT 20;
```

Configure how often ProxySQL polls replicas and what lag threshold causes a server to be shunned:

```sql
SET mysql-monitor_replication_lag_interval = 1000;  -- ms
SET mysql-monitor_slave_lag_when_null = 60;          -- treat NULL lag as 60s
LOAD MYSQL VARIABLES TO RUNTIME;
SAVE MYSQL VARIABLES TO DISK;
```

## Watching Live Connection Counts

```sql
SELECT *
FROM stats_mysql_processlist
ORDER BY time_ms DESC
LIMIT 20;
```

This is equivalent to `SHOW PROCESSLIST` but reflects sessions seen by ProxySQL, not the backend.

## Exporting Metrics to Prometheus

ProxySQL exposes a `/metrics` HTTP endpoint when the stats web server is enabled:

```bash
mysql -h 127.0.0.1 -P 6032 -u admin -padmin \
  -e "SET admin-restapi_enabled=1; SET admin-stats_credentials='stats:stats'; LOAD ADMIN VARIABLES TO RUNTIME;"
```

Then scrape `http://<proxysql-host>:6070/metrics` with Prometheus. Key metrics include `proxysql_connection_pool_conn_used` and `proxysql_mysql_status_queries`.

## Summary

ProxySQL provides rich visibility into MySQL traffic through its stats schema, query digest tables, and monitor module logs. By regularly querying `stats_mysql_connection_pool`, `stats_mysql_query_digest`, and the replication lag log, you can detect backend failures, slow queries, and replication delays without adding extra monitoring agents to every MySQL node.
