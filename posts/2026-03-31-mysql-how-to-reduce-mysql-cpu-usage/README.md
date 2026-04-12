# How to Reduce MySQL CPU Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CPU, Performance Tuning, Query Optimization, Database

Description: Learn how to diagnose and reduce high MySQL CPU usage through query optimization, indexing, configuration changes, and connection management.

---

## Common Causes of High MySQL CPU Usage

MySQL CPU spikes typically come from:

1. Full table scans caused by missing or unused indexes
2. High query volume - too many queries per second
3. Sorting and grouping without indexes
4. Query plan changes (optimizer choosing inefficient plans)
5. Binary log writes with synchronous flushing
6. Too many active connections with per-thread processing overhead

## Identify the CPU-Burning Queries

Start with the Performance Schema to find the top CPU consumers:

```sql
SELECT
  digest_text,
  count_star AS executions,
  ROUND(sum_cpu_time / 1e12, 2) AS total_cpu_seconds,
  ROUND(sum_cpu_time / count_star / 1e9, 2) AS avg_cpu_ms
FROM performance_schema.events_statements_summary_by_digest
ORDER BY sum_cpu_time DESC
LIMIT 10;
```

Or use the `sys` schema for a more readable view:

```sql
SELECT
  query,
  exec_count,
  total_latency,
  rows_examined_avg,
  full_scan
FROM sys.statement_analysis
ORDER BY total_latency DESC
LIMIT 10;
```

## Add Missing Indexes

Full table scans are the #1 CPU consumer. Find queries doing full scans:

```sql
SELECT
  query,
  exec_count,
  rows_examined_avg,
  full_scan
FROM sys.statement_analysis
WHERE full_scan = '*'
ORDER BY exec_count DESC;
```

Use EXPLAIN to verify:

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 12345;
```

If `type` is `ALL`, add an index:

```sql
ALTER TABLE orders ADD INDEX idx_customer_id (customer_id);
```

## Use the Slow Query Log

```text
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
log_queries_not_using_indexes = 1
```

Then analyze with mysqldumpslow:

```bash
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log
```

## Reduce Sorting and Temporary Table Usage

Check if queries are sorting in-memory or on-disk:

```sql
SHOW STATUS LIKE 'Sort_merge_passes';  -- > 0 means on-disk sorts
SHOW STATUS LIKE 'Created_tmp_disk_tables';  -- > 0 means on-disk temp tables
```

For on-disk sorts, add a covering index that satisfies the ORDER BY:

```sql
-- Query: SELECT id, name FROM users WHERE status = 'active' ORDER BY created_at DESC
ALTER TABLE users ADD INDEX idx_status_created (status, created_at);
```

## Tune Binary Log Flushing

If binary logging is enabled, synchronous fsync on every commit can spike CPU and I/O:

```text
[mysqld]
innodb_flush_log_at_trx_commit = 2   # Flush every second instead of per-commit
sync_binlog = 100                      # Sync binlog every 100 commits
```

For non-critical workloads this reduces CPU overhead significantly.

## Limit max_connections and Use Connection Pooling

Many idle connections still consume CPU for periodic housekeeping. Reduce connections via a pool:

```text
[mysqld]
max_connections = 200
wait_timeout = 60       # Close idle connections after 60 seconds
interactive_timeout = 60
```

## Disable Unused Features

If the binary log is not needed (no replication, no PITR):

```text
[mysqld]
skip-log-bin
```

If the general query log is on (logs every query - very CPU intensive):

```sql
SET GLOBAL general_log = OFF;
```

## Use Read Replicas for Read-Heavy Workloads

Distribute SELECT queries to read replicas:

```text
Application --> ProxySQL -->
    Write queries --> Primary MySQL
    Read queries  --> Replica MySQL
```

ProxySQL query rules example:

```sql
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup, apply)
VALUES (1, 1, '^SELECT', 2, 1);
```

## Monitor CPU Utilization

```bash
# Real-time CPU by thread
top -p $(pgrep mysqld)

# Show queries running for more than 1 second
mysql -e "SHOW PROCESSLIST;" | awk '$6 > 1 {print}'
```

## Summary

Reducing MySQL CPU usage starts with identifying and fixing full table scan queries using EXPLAIN and Performance Schema. Adding the right indexes eliminates most CPU spikes. For write-heavy systems, tuning `sync_binlog` and `innodb_flush_log_at_trx_commit` reduces fsync overhead. Connection pooling prevents wasted CPU from too many simultaneous threads.
