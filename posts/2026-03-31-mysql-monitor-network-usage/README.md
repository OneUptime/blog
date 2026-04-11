# How to Monitor MySQL Network Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Monitoring, Network, Performance, Status

Description: Learn how to monitor MySQL network usage by tracking bytes sent and received, connection counts, and identifying high-bandwidth queries using Performance Schema.

---

## Why MySQL Network Monitoring Matters

MySQL communicates with clients over TCP. Heavy SELECT queries returning large result sets, bulk imports, and replication traffic can saturate network bandwidth, causing latency for other connections. Monitoring network usage helps identify bandwidth-intensive queries and plan network capacity.

## Bytes Sent and Received

MySQL tracks cumulative network I/O in the global status:

```sql
SHOW GLOBAL STATUS LIKE 'Bytes_sent';
SHOW GLOBAL STATUS LIKE 'Bytes_received';
```

Calculate the current throughput by sampling twice with a 60-second interval:

```sql
-- Sample 1
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN ('Bytes_sent', 'Bytes_received');

-- Wait 60 seconds, then sample 2
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN ('Bytes_sent', 'Bytes_received');
```

Divide the difference by 60 to get bytes per second. `Bytes_sent` represents data sent to clients (SELECT results); `Bytes_received` is data from clients (INSERT/UPDATE data).

## Per-Connection Network Usage

For current active connections, query the process list with network statistics:

```sql
SELECT
  id AS connection_id,
  user,
  host,
  db,
  command,
  time,
  state,
  info AS current_query
FROM information_schema.PROCESSLIST
WHERE command != 'Sleep'
ORDER BY time DESC
LIMIT 20;
```

For deeper per-connection statistics, use Performance Schema:

```sql
SELECT
  p.PROCESSLIST_ID,
  p.PROCESSLIST_USER,
  p.PROCESSLIST_HOST,
  s.VARIABLE_NAME,
  s.VARIABLE_VALUE
FROM performance_schema.status_by_thread s
JOIN performance_schema.threads p ON p.THREAD_ID = s.THREAD_ID
WHERE s.VARIABLE_NAME IN ('Bytes_sent', 'Bytes_received')
ORDER BY p.PROCESSLIST_ID;
```

## Identifying High-Bandwidth Queries

Queries returning large result sets are the primary driver of outbound bandwidth. Find them using the statement digest:

```sql
SELECT
  DIGEST_TEXT,
  COUNT_STAR AS executions,
  ROUND(SUM_ROWS_SENT / COUNT_STAR) AS avg_rows_sent,
  ROUND(SUM_TIMER_WAIT / 1e12 / COUNT_STAR, 3) AS avg_sec
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_ROWS_SENT > 0
ORDER BY SUM_ROWS_SENT DESC
LIMIT 10;
```

Queries with very high `avg_rows_sent` are likely returning more data than necessary. Add LIMIT clauses, use pagination, or add WHERE conditions to reduce result set size.

## Monitoring Replication Network Traffic

Replication traffic flows from primary to replicas. Check replication thread network statistics:

```sql
SELECT THREAD_ID, NAME, TYPE
FROM performance_schema.threads
WHERE NAME LIKE '%binlog%' OR NAME LIKE '%slave%' OR NAME LIKE '%replication%';
```

On the replica, check the replication I/O throughput:

```bash
# On the replica server, watch network traffic to/from primary
nethogs -d 2 eth0
```

Or use `ss` to see MySQL connection bandwidth:

```bash
ss -i state established '( dport = :3306 or sport = :3306 )'
```

## OS-Level Network Monitoring

For overall MySQL server network utilization, use OS tools:

```bash
# Real-time network bandwidth per interface
sar -n DEV 5 12

# Or with nload for a visual view
nload eth0
```

Correlate spikes in network usage with MySQL status metrics to identify the source.

## Reducing Network Overhead

Practical steps to reduce MySQL network bandwidth:
- Add `LIMIT` to all SELECT queries
- Use column projections (`SELECT id, name` instead of `SELECT *`)
- Enable `--compress` on MySQL connections for large result sets
- Use `pt-query-digest` to find and optimize high-bandwidth query patterns

```bash
# Enable compression when connecting to MySQL
mysql --compress -u user -p -h hostname

# MySQL 8.0.18+ supports additional compression algorithms
mysql --compression-algorithms=zstd,zlib -u user -p -h hostname
```

## Summary

Monitor MySQL network usage with `Bytes_sent` and `Bytes_received` global status variables, sampled at intervals to derive throughput. Use Performance Schema `events_statements_summary_by_digest` to find high-bandwidth queries returning excessive rows. Monitor replication traffic separately and use OS tools like `sar` for interface-level bandwidth trending. Optimize network-heavy queries by reducing result set sizes with LIMIT and column projections.
