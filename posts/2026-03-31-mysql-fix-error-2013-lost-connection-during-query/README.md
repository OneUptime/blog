# How to Fix ERROR 2013 Lost Connection to MySQL Server During Query

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection, Error, Timeout, Configuration

Description: Fix MySQL ERROR 2013 by tuning net_read_timeout, max_allowed_packet, and wait_timeout to prevent dropped connections during long-running queries.

---

MySQL ERROR 2013 occurs when a connection to the server is dropped mid-query. The message reads: `ERROR 2013 (HY000): Lost connection to MySQL server during query`. This is different from ERROR 2006 (server has gone away) which typically happens between queries. ERROR 2013 happens while a query is actively running.

## Common Causes

- The query sends or receives a packet larger than `max_allowed_packet`
- The server-side `net_read_timeout` or `net_write_timeout` expires
- The server crashed or was restarted during query execution
- Network instability between client and server

## Check Current Timeout Values

```sql
SHOW VARIABLES LIKE 'net_read_timeout';
SHOW VARIABLES LIKE 'net_write_timeout';
SHOW VARIABLES LIKE 'max_allowed_packet';
SHOW VARIABLES LIKE 'wait_timeout';
SHOW VARIABLES LIKE 'interactive_timeout';
```

## Fix: Increase Network Timeouts

For queries that transfer large result sets, increase the network timeouts:

```sql
-- Increase for the current session
SET SESSION net_read_timeout = 600;
SET SESSION net_write_timeout = 600;
```

Or permanently in `my.cnf`:

```text
[mysqld]
net_read_timeout = 600
net_write_timeout = 600
```

## Fix: Increase max_allowed_packet

If you are loading large blobs or long strings, increase the packet size:

```text
[mysqld]
max_allowed_packet = 256M

[client]
max_allowed_packet = 256M
```

After updating, restart MySQL:

```bash
sudo systemctl restart mysql
```

## Fix: Optimize Long-Running Queries

A query that takes too long may trigger timeouts. Use `EXPLAIN` to identify inefficiencies:

```sql
EXPLAIN SELECT * FROM orders
WHERE YEAR(created_at) = 2024
ORDER BY total DESC;
```

Add indexes on frequently filtered columns:

```sql
ALTER TABLE orders ADD INDEX idx_created_at (created_at);
```

Consider breaking large queries into smaller batches:

```sql
-- Instead of one massive update
UPDATE orders SET status = 'archived'
WHERE created_at < '2022-01-01'
LIMIT 1000;
-- Repeat until all rows are updated
```

## Fix: Check for Server Crashes

If the server is crashing mid-query, the error log will show the crash:

```bash
sudo tail -200 /var/log/mysql/error.log | grep -i "crash\|abort\|signal"
```

Check for InnoDB recovery messages on the next startup and review system memory:

```bash
free -h
dmesg | grep -i "oom\|killed"
```

## Check Active Connections

Inspect slow or blocked queries that might be the cause:

```sql
SHOW FULL PROCESSLIST;
```

Kill any query that is blocking or has been running too long:

```sql
KILL QUERY 12345;
```

## Summary

ERROR 2013 is caused by a connection being dropped while a query runs. The most common fixes are increasing `net_read_timeout`, `net_write_timeout`, and `max_allowed_packet` in `my.cnf`. Always check the MySQL error log after this error to determine if the server crashed or if a timeout was the cause. Optimizing long queries reduces the chance of hitting timeout thresholds.
