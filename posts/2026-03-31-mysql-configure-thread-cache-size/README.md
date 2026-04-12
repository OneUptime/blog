# How to Configure thread_cache_size in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Thread, Connection, Performance

Description: Configure MySQL thread_cache_size to reduce the overhead of creating new threads for incoming connections and improve response time under high connection churn.

---

## What Is thread_cache_size

When a client disconnects from MySQL, the server can either destroy the thread or cache it for reuse by a future connection. `thread_cache_size` sets how many threads MySQL keeps in a cache after clients disconnect.

When a new client connects, MySQL checks the cache first. Reusing a cached thread is much faster than creating a new OS thread, which involves memory allocation and context switching overhead.

## Check the Current Value

```sql
SHOW VARIABLES LIKE 'thread_cache_size';
```

```text
+-------------------+-------+
| Variable_name     | Value |
+-------------------+-------+
| thread_cache_size | 9     |
+-------------------+-------+
```

In MySQL 8.0, the default is auto-sized based on `max_connections`:

```text
8 + (max_connections / 100)
```

## Check Thread Cache Effectiveness

```sql
SHOW GLOBAL STATUS LIKE 'Threads%';
```

```text
+-------------------+-------+
| Variable_name     | Value |
+-------------------+-------+
| Threads_cached    | 8     |
| Threads_connected | 42    |
| Threads_created   | 23456 |
| Threads_running   | 3     |
+-------------------+-------+
```

Calculate the thread cache hit rate:

```sql
SELECT
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Connections') AS total_connections,
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Threads_created') AS threads_created,
  ROUND(
    (1 - (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Threads_created') /
         (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Connections')
    ) * 100, 2
  ) AS cache_hit_pct;
```

A cache hit rate above 95% is ideal. If `Threads_created` is close to `Connections`, the cache is too small.

## Increase thread_cache_size

```sql
SET GLOBAL thread_cache_size = 50;
```

In `my.cnf`:

```ini
[mysqld]
thread_cache_size = 50
```

## Recommended Values

| Scenario | thread_cache_size |
|----------|------------------|
| Low connection churn (<100 conn/sec) | Default (auto) |
| Medium connection churn | 32 - 64 |
| High connection churn (PHP-FPM, serverless) | 100 - 200 |

## Thread Cache vs Connection Pool

`thread_cache_size` is a server-side optimization. For applications that open and close connections frequently (PHP without persistent connections, serverless functions), the best solution is to add a connection pooler like ProxySQL:

```bash
# ProxySQL is more effective than just increasing thread_cache_size
# for high-churn environments
```

## Monitor Thread Cache After Changing

Watch `Threads_created` over time after increasing the cache:

```bash
# Shell script to monitor thread cache
while true; do
  mysql -u root -p"$MYSQL_ROOT_PASSWORD" -sN -e \
    "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Threads_created';"
  sleep 5
done
```

The rate of increase in `Threads_created` should slow after increasing the cache.

## Check Thread Pool Plugin Alternative

MySQL Enterprise has a Thread Pool plugin that handles connection management differently from per-connection threading:

```sql
-- Check if thread pool is active
SHOW VARIABLES LIKE 'thread_handling';
```

```text
+------------------+-----------------+
| Variable_name    | Value           |
+------------------+-----------------+
| thread_handling  | one-thread-per-connection |
+------------------+-----------------+
```

The default `one-thread-per-connection` model is what `thread_cache_size` optimizes.

## Summary

`thread_cache_size` reduces the cost of handling new connections by reusing cached threads. Monitor the ratio of `Threads_created` to `Connections` - a high ratio means threads are not being cached effectively. Increase `thread_cache_size` for applications with high connection churn. For PHP or serverless workloads creating hundreds of connections per second, combine a larger thread cache with ProxySQL for maximum efficiency.
