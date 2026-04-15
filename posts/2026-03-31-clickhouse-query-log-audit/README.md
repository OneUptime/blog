# How to Use system.query_log for Query Auditing in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Audit, Query Log, Security, Monitoring, Compliance

Description: Use system.query_log in ClickHouse to audit all queries, track user activity, detect slow queries, and build compliance reports with real SQL examples.

---

## Introduction

`system.query_log` is ClickHouse's built-in audit log for all SQL queries. Every query -- whether SELECT, INSERT, DDL, or system command -- is recorded with the user, client address, execution time, rows read, memory used, and any error. It is the foundation for security auditing, performance monitoring, and compliance reporting.

## Query Log Schema

Key columns in `system.query_log`:

| Column | Type | Description |
|---|---|---|
| `type` | Enum | `QueryStart`, `QueryFinish`, `ExceptionBeforeStart`, `ExceptionWhileProcessing` |
| `event_time` | DateTime | When the event occurred |
| `query_start_time` | DateTime | When the query started |
| `query_duration_ms` | UInt64 | Duration in milliseconds |
| `query` | String | Full query text |
| `query_id` | String | Unique query identifier |
| `user` | String | ClickHouse username |
| `client_hostname` | String | Client host that sent the query |
| `address` | IPv6 | IP address used to make the query |
| `databases` | Array(String) | Databases accessed |
| `tables` | Array(String) | Tables accessed |
| `read_rows` | UInt64 | Rows read from storage |
| `read_bytes` | UInt64 | Bytes read from storage |
| `written_rows` | UInt64 | Rows written (for INSERT) |
| `memory_usage` | UInt64 | Memory consumed by the query |
| `exception_code` | Int32 | Error code (0 if success) |
| `exception` | String | Error message |

## Configuring Query Log Retention

In `config.xml`:

```xml
<clickhouse>
  <query_log>
    <database>system</database>
    <table>query_log</table>
    <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    <max_size_rows>1048576</max_size_rows>
    <reserved_size_rows>8192</reserved_size_rows>
    <buffer_size_rows_flush_threshold>524288</buffer_size_rows_flush_threshold>
    <flush_on_crash>false</flush_on_crash>
    <!-- Keep 30 days of query log -->
    <ttl>event_date + INTERVAL 30 DAY DELETE</ttl>
  </query_log>
</clickhouse>
```

## Basic Audit Queries

### Who ran queries in the last hour?

```sql
SELECT
    user,
    address,
    count()            AS query_count,
    sum(read_bytes)    AS bytes_read,
    max(query_duration_ms) AS max_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY user, address
ORDER BY query_count DESC;
```

### Find all queries by a specific user

```sql
SELECT
    event_time,
    query_duration_ms,
    read_rows,
    query
FROM system.query_log
WHERE user = 'analyst'
  AND type = 'QueryFinish'
  AND event_time >= today() - INTERVAL 7 DAY
ORDER BY event_time DESC
LIMIT 50;
```

### Find slow queries

```sql
SELECT
    user,
    query_duration_ms,
    read_rows,
    read_bytes,
    memory_usage,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_duration_ms > 5000
  AND event_time >= now() - INTERVAL 24 HOUR
ORDER BY query_duration_ms DESC
LIMIT 20;
```

### Find failed queries

```sql
SELECT
    event_time,
    user,
    exception_code,
    exception,
    query
FROM system.query_log
WHERE type IN ('ExceptionWhileProcessing', 'ExceptionBeforeStart')
  AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY event_time DESC;
```

### Which tables are most accessed?

```sql
SELECT
    arrayJoin(tables) AS table_name,
    count()           AS access_count,
    sum(read_rows)    AS total_rows_read,
    countDistinct(user) AS unique_users
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= today() - INTERVAL 7 DAY
GROUP BY table_name
ORDER BY access_count DESC
LIMIT 20;
```

### DDL Audit: Who changed schema?

```sql
SELECT
    event_time,
    user,
    address,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND (
      query ILIKE 'CREATE%'
      OR query ILIKE 'ALTER%'
      OR query ILIKE 'DROP%'
      OR query ILIKE 'RENAME%'
      OR query ILIKE 'TRUNCATE%'
  )
  AND event_time >= today() - INTERVAL 30 DAY
ORDER BY event_time DESC;
```

### INSERT audit: Who inserted data?

```sql
SELECT
    event_time,
    user,
    address,
    arrayJoin(tables) AS target_table,
    written_rows,
    written_bytes
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query ILIKE 'INSERT%'
  AND event_time >= today() - INTERVAL 7 DAY
ORDER BY event_time DESC
LIMIT 50;
```

## Query Log Across a Cluster

On distributed setups, query each node's `system.query_log` or use `clusterAllReplicas`:

```sql
SELECT
    hostName()    AS node,
    user,
    count()       AS queries
FROM clusterAllReplicas('my_cluster', system.query_log)
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY node, user
ORDER BY queries DESC;
```

## Exporting Query Logs to a Monitoring Table

Archive query logs to a persistent MergeTree table for long-term retention:

```sql
CREATE TABLE audit_log
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user, event_time)
TTL event_date + INTERVAL 365 DAY DELETE
AS SELECT * FROM system.query_log WHERE 0 = 1;

-- Insert periodically via a scheduled job or Materialized View
INSERT INTO audit_log
SELECT * FROM system.query_log
WHERE event_time >= now() - INTERVAL 1 HOUR;
```

## Summary

`system.query_log` records every query in ClickHouse with user, client IP, duration, rows read, memory, and errors. Use it to audit DDL changes, track user activity, find slow queries, and build compliance reports. Configure TTL to control retention, and use `clusterAllReplicas()` to query logs across all nodes in a distributed setup.
