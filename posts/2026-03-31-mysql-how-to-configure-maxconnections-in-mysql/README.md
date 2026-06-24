# How to Configure max_connections in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, max_connections, Performance Tuning

Description: Learn how to configure MySQL's max_connections setting, calculate an appropriate value, and monitor connection usage to avoid 'Too many connections' errors.

---

## What Is max_connections

`max_connections` defines the maximum number of simultaneous client connections MySQL will accept. When this limit is reached, new connections are refused with the error:

```text
ERROR 1040 (HY000): Too many connections
```

There is always one reserved connection for users with the `SUPER` privilege or `CONNECTION_ADMIN` to allow emergency access.

## Viewing the Current Setting

```sql
SHOW VARIABLES LIKE 'max_connections';
```

```text
+-----------------+-------+
| Variable_name   | Value |
+-----------------+-------+
| max_connections | 151   |
+-----------------+-------+
```

The default is 151 in most MySQL versions.

## Viewing Current Connection Usage

```sql
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';
```

- `Threads_connected` - currently open connections
- `Max_used_connections` - peak connection count since last restart

## Setting max_connections Dynamically

Change the value without restarting MySQL:

```sql
SET GLOBAL max_connections = 500;
```

This takes effect immediately but is lost on restart.

## Making the Change Persistent

Edit `my.cnf`:

```ini
[mysqld]
max_connections = 500
```

Then restart MySQL:

```bash
sudo systemctl restart mysql
```

## Calculating an Appropriate Value

Each connection consumes memory. A rough formula:

```text
max_connections * (sort_buffer_size + read_buffer_size + binlog_cache_size + thread_stack + join_buffer_size)
```

For a quick estimate:

```sql
SELECT
  @@max_connections,
  @@sort_buffer_size / 1024 / 1024 AS sort_buf_mb,
  @@read_buffer_size / 1024 / 1024 AS read_buf_mb,
  @@thread_stack / 1024 AS thread_stack_kb;
```

Typical per-connection overhead is 1-4 MB. On a server with 8 GB RAM dedicated to MySQL:

```text
Available memory: 8192 MB
InnoDB buffer pool: 6144 MB
Remaining for connections: 2048 MB
Per-connection overhead: 4 MB

max_connections = 2048 / 4 = 512
```

## Reducing Connection Overhead with Connection Pooling

Instead of increasing `max_connections` indefinitely, use a connection pooler like ProxySQL:

```text
# ProxySQL config (simplified)
mysql_servers =
(
    {
        hostgroup_id = 0
        hostname = "db.internal"
        port = 3306
        max_connections = 100
    }
)
```

ProxySQL allows 10,000 frontend connections while using only 100 backend connections to MySQL.

## Monitoring with Performance Schema

```sql
SELECT
  user,
  total_connections,
  current_connections
FROM performance_schema.accounts
ORDER BY current_connections DESC;
```

## max_user_connections Limit

You can cap connections per user:

```sql
ALTER USER 'appuser'@'%' WITH MAX_USER_CONNECTIONS 50;
```

Or at user creation:

```sql
CREATE USER 'appuser'@'%' IDENTIFIED BY 'pass' WITH MAX_USER_CONNECTIONS 50;
```

## Summary

`max_connections` controls the connection limit in MySQL. Set it based on available RAM divided by per-connection memory usage - a value between 200 and 1000 is typical for production servers. Monitor `Threads_connected` and `Max_used_connections` to tune appropriately, and consider a connection pooler like ProxySQL to handle high connection counts efficiently.
