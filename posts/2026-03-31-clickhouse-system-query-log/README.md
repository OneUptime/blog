# How to Use system.query_log for Query Analysis in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Log, Performance, Observability, System Table

Description: Learn how to query system.query_log to find slow queries, measure resource consumption, track error rates, and audit query history in ClickHouse.

---

`system.query_log` is ClickHouse's built-in query audit log. Every query that runs on the server - whether successful, cancelled, or failed - is recorded here with execution time, rows read, bytes scanned, memory used, and dozens of other metrics. It is the first place to look when investigating performance regressions, auditing user activity, or understanding which queries are most expensive.

## Enabling query_log

The log is enabled by default. Verify it in `config.xml`:

```xml
<query_log>
    <database>system</database>
    <table>query_log</table>
    <flush_interval_milliseconds>7500</flush_interval_milliseconds>
</query_log>
```

Note that `query_log` is flushed periodically, not instantly. Queries run in the last few seconds may not yet appear.

## Key Columns

```sql
DESCRIBE system.query_log;
```

| Column | Type | Meaning |
|---|---|---|
| `type` | Enum | `QueryStart`, `QueryFinish`, `ExceptionBeforeStart`, `ExceptionWhileProcessing` |
| `event_time` | DateTime | When the event was recorded |
| `query_duration_ms` | UInt64 | Wall-clock duration in milliseconds |
| `query` | String | The SQL text |
| `user` | String | User who ran the query |
| `query_id` | String | Unique identifier for the query |
| `read_rows` | UInt64 | Rows read from storage |
| `read_bytes` | UInt64 | Bytes read from storage |
| `written_rows` | UInt64 | Rows written (for INSERT) |
| `result_rows` | UInt64 | Rows in the result set |
| `memory_usage` | UInt64 | Peak memory used |
| `exception` | String | Error message if the query failed |
| `databases` | Array(String) | Databases referenced |
| `tables` | Array(String) | Tables referenced |
| `is_initial_query` | UInt8 | 1 = sent by client, 0 = internal sub-query |
| `ProfileEvents` | Map(String, UInt64) | Detailed profiling counters |

## Filter to Finished Queries Only

Always filter `type = 'QueryFinish'` unless you need errors or in-progress snapshots:

```sql
SELECT count()
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR;
```

## Top Slowest Queries in the Last 24 Hours

```sql
SELECT
    query_duration_ms,
    read_rows,
    formatReadableSize(read_bytes)    AS read_size,
    formatReadableSize(memory_usage)  AS memory,
    user,
    left(query, 120)                  AS query_preview
FROM system.query_log
WHERE type       = 'QueryFinish'
  AND is_initial_query = 1
  AND event_time >= now() - INTERVAL 24 HOUR
ORDER BY query_duration_ms DESC
LIMIT 20;
```

## Most Resource-Intensive Query Patterns

Normalize queries with `normalizeQuery()` to group similar queries together:

```sql
SELECT
    normalizeQuery(query)            AS normalized,
    count()                          AS executions,
    round(avg(query_duration_ms), 1) AS avg_ms,
    max(query_duration_ms)           AS max_ms,
    formatReadableSize(avg(memory_usage))  AS avg_memory,
    formatReadableSize(sum(read_bytes))    AS total_bytes_read
FROM system.query_log
WHERE type = 'QueryFinish'
  AND is_initial_query = 1
  AND event_time >= now() - INTERVAL 7 DAY
GROUP BY normalized
ORDER BY sum(read_bytes) DESC
LIMIT 10;
```

## Error Rate by User

```sql
SELECT
    user,
    countIf(type = 'QueryFinish')               AS ok,
    countIf(type LIKE 'Exception%')             AS errors,
    round(
        countIf(type LIKE 'Exception%') * 100.0
        / count(), 2
    )                                           AS error_pct
FROM system.query_log
WHERE event_time >= now() - INTERVAL 1 DAY
  AND is_initial_query = 1
GROUP BY user
ORDER BY errors DESC;
```

## Query Volume Over Time (Hourly Buckets)

```sql
SELECT
    toStartOfHour(event_time) AS hour,
    countIf(type = 'QueryFinish')     AS finished,
    countIf(type LIKE 'Exception%')   AS failed,
    round(avg(query_duration_ms), 1)  AS avg_ms,
    formatReadableSize(sum(read_bytes)) AS bytes_read
FROM system.query_log
WHERE is_initial_query = 1
  AND event_time >= now() - INTERVAL 3 DAY
GROUP BY hour
ORDER BY hour;
```

## Find All Queries on a Specific Table

```sql
SELECT
    event_time,
    user,
    query_duration_ms,
    type,
    left(query, 200) AS query_text
FROM system.query_log
WHERE has(tables, 'default.events')
  AND is_initial_query = 1
  AND event_time >= now() - INTERVAL 1 DAY
ORDER BY event_time DESC
LIMIT 50;
```

## Look Up a Query by query_id

```sql
SELECT
    query_id,
    user,
    event_time,
    query_duration_ms,
    type,
    read_rows,
    formatReadableSize(memory_usage) AS memory,
    exception
FROM system.query_log
WHERE query_id = '5f52c7a4-b3d1-4f2e-9a6c-1234567890ab'
ORDER BY event_time;
```

Note that a single `query_id` will appear twice for successful queries: once for `QueryStart` and once for `QueryFinish`.

## Extract ProfileEvents Counters

```sql
SELECT
    query_id,
    query_duration_ms,
    ProfileEvents['RealTimeMicroseconds']         AS real_us,
    ProfileEvents['UserTimeMicroseconds']         AS user_us,
    ProfileEvents['SystemTimeMicroseconds']       AS sys_us,
    ProfileEvents['DiskReadElapsedMicroseconds']  AS disk_read_us,
    ProfileEvents['SelectedRows']                 AS selected_rows,
    ProfileEvents['SelectedBytes']                AS selected_bytes
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_id = '5f52c7a4-b3d1-4f2e-9a6c-1234567890ab';
```

## High Memory Queries

```sql
SELECT
    event_time,
    user,
    formatReadableSize(memory_usage) AS peak_memory,
    query_duration_ms,
    left(query, 150) AS query_preview
FROM system.query_log
WHERE type = 'QueryFinish'
  AND is_initial_query = 1
  AND memory_usage > 1073741824   -- 1 GB
  AND event_time >= now() - INTERVAL 7 DAY
ORDER BY memory_usage DESC
LIMIT 20;
```

## Shell Script: Daily Slow Query Report

```bash
#!/usr/bin/env bash
# Print the 10 slowest queries from the past day

clickhouse-client --query "
    SELECT
        formatDateTime(event_time, '%H:%M:%S') AS time,
        user,
        query_duration_ms AS ms,
        formatReadableSize(read_bytes)   AS read,
        formatReadableSize(memory_usage) AS mem,
        left(query, 100) AS sql
    FROM system.query_log
    WHERE type           = 'QueryFinish'
      AND is_initial_query = 1
      AND event_time     >= now() - INTERVAL 1 DAY
    ORDER BY query_duration_ms DESC
    LIMIT 10
    FORMAT PrettyCompactNoEscapes
"
```

## Control Retention

Configure retention in `config.xml`:

```xml
<query_log>
    <database>system</database>
    <table>query_log</table>
    <ttl>event_date + INTERVAL 30 DAY DELETE</ttl>
</query_log>
```

## Common Pitfalls

- `query_log` is flushed on a timer (default 7.5 seconds). Queries from the last few seconds may not be visible yet. Use `SYSTEM FLUSH LOGS` to force a flush.
- Sub-queries spawned by distributed queries appear as rows with `is_initial_query = 0`. Always add `is_initial_query = 1` when you want only user-initiated queries.
- The `query` column stores the full SQL text. Avoid `SELECT *` on `query_log` on busy servers as you will scan large amounts of string data.

## Summary

`system.query_log` is ClickHouse's most powerful built-in observability tool. Use it to find slow queries, understand resource consumption patterns, audit user activity, and build dashboards that track query volume and error rates over time. Pair it with `normalizeQuery()` and `ProfileEvents` to identify and fix the queries that matter most.
