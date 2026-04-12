# How to Fix ERROR 1040 Too Many Connections in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error, Connection, Troubleshooting

Description: Learn how to diagnose and fix MySQL ERROR 1040 Too Many Connections by tuning max_connections, implementing connection pooling, and killing idle connections.

---

`ERROR 1040 (08004): Too many connections` means MySQL has reached its `max_connections` limit. No new connections can be established until existing ones close.

## Immediate Check: Current Connections

```sql
-- Total connections currently open
SHOW STATUS LIKE 'Threads_connected';

-- Max connections ever reached (high-water mark)
SHOW STATUS LIKE 'Max_used_connections';

-- Current limit
SHOW VARIABLES LIKE 'max_connections';
```

## Emergency Relief: Kill Idle Connections

```sql
-- See all connections
SHOW PROCESSLIST;

-- Find long-sleeping connections
SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, INFO
FROM   information_schema.PROCESSLIST
WHERE  COMMAND = 'Sleep'
AND    TIME    > 30
ORDER BY TIME DESC;

-- Kill a specific connection
KILL CONNECTION 12345;
```

Kill multiple sleeping connections with a generated script:

```sql
SELECT CONCAT('KILL CONNECTION ', ID, ';')
FROM   information_schema.PROCESSLIST
WHERE  COMMAND = 'Sleep'
AND    TIME    > 60;
```

## Increase max_connections Temporarily

```sql
-- Runtime change (no restart needed)
SET GLOBAL max_connections = 500;
```

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf - persist across restarts
[mysqld]
max_connections = 500
```

Calculate a safe value based on available memory:

```text
max_connections = (available_RAM_MB - innodb_buffer_pool_size_MB - global_buffers_MB) / per_thread_MB
```

Each thread uses roughly 1-2 MB. A common formula: `max_connections = RAM_MB / 2`.

## Implement Connection Pooling

Most connection-pool exhaustion comes from applications opening too many long-lived connections. Use ProxySQL or application-level pooling:

```sql
# ProxySQL admin - add a backend server with connection limits
INSERT INTO mysql_servers (hostgroup_id, hostname, port, max_connections)
VALUES (0, '127.0.0.1', 3306, 100);
LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
```

Or configure HikariCP in a Java application:

```text
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
```

## Configure wait_timeout and interactive_timeout

Reduce how long idle connections stay open:

```sql
SET GLOBAL wait_timeout = 120;        -- close idle non-interactive connections after 2 min
SET GLOBAL interactive_timeout = 300; -- close idle interactive connections after 5 min
```

```ini
[mysqld]
wait_timeout = 120
interactive_timeout = 300
```

## Monitor Connection Usage

```sql
SELECT
    VARIABLE_NAME,
    VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
    'Threads_connected',
    'Threads_running',
    'Max_used_connections',
    'Connection_errors_max_connections'
);
```

## Summary

Fix ERROR 1040 immediately by killing idle connections and temporarily raising `max_connections`. Permanently solve it by lowering `wait_timeout`/`interactive_timeout` to reclaim idle connections faster, implementing connection pooling (ProxySQL, HikariCP), and sizing `max_connections` based on available memory. Monitor `Max_used_connections` and `Connection_errors_max_connections` to detect recurring spikes before they cause errors.
