# How to Troubleshoot MySQL High Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Latency, Performance, Query, Troubleshooting

Description: Learn how to diagnose and reduce MySQL high latency by identifying slow queries, lock waits, I/O bottlenecks, and network overhead.

---

## Defining the Problem

High latency in MySQL means queries are taking longer than expected. Before investigating, define a baseline: what is the expected p50/p99 query time? Use application monitoring or the slow query log to identify the scope.

## Step 1: Identify the Slowest Queries

Enable the slow query log with a low threshold:

```sql
SET GLOBAL slow_query_log   = ON;
SET GLOBAL long_query_time  = 0.1;  -- Log queries > 100ms
SET GLOBAL log_queries_not_using_indexes = ON;
```

Analyze results with `pt-query-digest` (Percona Toolkit):

```bash
pt-query-digest /var/log/mysql/slow.log --limit 20
```

Or use the `sys` schema for real-time analysis:

```sql
SELECT query, exec_count, avg_latency, rows_examined_avg
FROM sys.statement_analysis
ORDER BY avg_latency DESC
LIMIT 10;
```

## Step 2: Check for Lock Waits

Lock contention causes queries to wait instead of executing:

```sql
SELECT r.trx_id                       AS waiting_trx_id,
       r.trx_mysql_thread_id          AS waiting_thread,
       b.trx_id                       AS blocking_trx_id,
       b.trx_mysql_thread_id          AS blocking_thread,
       r.trx_query                    AS waiting_query,
       b.trx_query                    AS blocking_query
FROM performance_schema.data_lock_waits w
JOIN information_schema.INNODB_TRX r ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID
JOIN information_schema.INNODB_TRX b ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID;
```

Kill the blocking transaction if it is stuck:

```sql
KILL CONNECTION <blocking_thread_id>;
```

## Step 3: Check I/O Wait

High disk I/O latency slows all queries that need to read uncached data:

```bash
iostat -xz 1 5
# Look for await > 20 (ms) on the MySQL data disk
```

Check whether the InnoDB buffer pool is large enough:

```sql
SELECT variable_name, variable_value
FROM performance_schema.global_status
WHERE variable_name IN (
  'Innodb_buffer_pool_reads',
  'Innodb_buffer_pool_read_requests'
);
-- reads/read_requests should be < 5% (cache miss rate)
```

## Step 4: Check Connection Overhead

High connection counts and connection setup time add latency:

```sql
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Connection_errors_max_connections';
SHOW STATUS LIKE 'Aborted_connects';
```

Use a connection pool in the application. For Node.js:

```javascript
const pool = mysql.createPool({
  connectionLimit: 20,
  host: process.env.DB_HOST,
  // ...
});
```

## Step 5: Examine Query Execution Plans

Use `EXPLAIN ANALYZE` (MySQL 8.0.18+) to see actual execution times:

```sql
EXPLAIN ANALYZE
SELECT o.id, o.total, u.email
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC
LIMIT 50\G
```

Look for high `actual time` values on specific nodes (e.g., full table scans or large hash joins).

## Step 6: Check Network Latency

For remote MySQL connections, network round-trip time adds to query latency:

```bash
ping -c 10 mysql-server-ip
# Also check TCP latency
tcptraceroute mysql-server-ip 3306
```

Use UNIX sockets instead of TCP/IP for connections on the same host:

```bash
mysql -u root -p --socket=/var/run/mysqld/mysqld.sock
```

## Step 7: Review System Load

```bash
top -bn1 | head -20
vmstat 1 5
```

CPU saturation (load average above core count) causes query queuing and added latency. Profile the highest-CPU queries first.

## Summary

MySQL high latency is diagnosed by correlating slow query log data with lock wait analysis, I/O metrics, and `EXPLAIN ANALYZE` output. The most common causes are missing indexes causing full scans, lock contention from long transactions, buffer pool misses causing disk reads, and too many connections causing overhead. Address each layer systematically: index first, then lock management, then buffer pool sizing, then connection pooling.
