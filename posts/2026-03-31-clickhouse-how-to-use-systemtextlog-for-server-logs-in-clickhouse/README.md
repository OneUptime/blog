# How to Use system.text_log for Server Logs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, System Table, Logging, Debugging, Monitoring

Description: Learn how to query and use the system.text_log table in ClickHouse to inspect server-side log messages, filter by severity, and troubleshoot issues.

---

## What Is system.text_log

ClickHouse stores its internal server log messages in the `system.text_log` table. This allows you to query logs using SQL, making it easier to filter, aggregate, and analyze server-side events without tailing log files directly.

This table captures the same entries that appear in `clickhouse-server.log` but with structured columns you can query.

## Enabling text_log

In `config.xml`, enable the text log table:

```xml
<text_log>
    <level>information</level>
    <database>system</database>
    <table>text_log</table>
    <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    <max_size_rows>1048576</max_size_rows>
    <reserved_size_rows>8192</reserved_size_rows>
    <buffer_size_rows_flush_threshold>524288</buffer_size_rows_flush_threshold>
    <flush_on_crash>false</flush_on_crash>
    <storage_policy>default</storage_policy>
    <partition_by>toYYYYMM(event_date)</partition_by>
    <ttl>event_date + INTERVAL 30 DAY</ttl>
</text_log>
```

## Schema of system.text_log

```sql
DESCRIBE system.text_log;
```

Key columns:

- `event_date` - date of the log entry
- `event_time` - timestamp of the log entry (second precision)
- `event_time_microseconds` - timestamp with microsecond precision
- `level` - log level: `Fatal`, `Critical`, `Error`, `Warning`, `Notice`, `Information`, `Debug`, `Trace`
- `query_id` - associated query ID if applicable
- `logger_name` - name of the component that emitted the log
- `message` - the log message text
- `thread_id` - OS thread ID

## Querying Recent Error Messages

```sql
SELECT
    event_time,
    level,
    logger_name,
    message
FROM system.text_log
WHERE level IN ('Error', 'Fatal', 'Critical')
  AND event_date >= today() - 1
ORDER BY event_time DESC
LIMIT 50;
```

## Filtering by Component

```sql
-- View MergeTree merge-related logs
SELECT
    event_time,
    logger_name,
    message
FROM system.text_log
WHERE logger_name LIKE '%MergeTree%'
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 100;
```

## Counting Log Levels Over Time

```sql
SELECT
    toStartOfHour(event_time) AS hour,
    level,
    count() AS cnt
FROM system.text_log
WHERE event_date >= today() - 7
GROUP BY hour, level
ORDER BY hour DESC, cnt DESC;
```

## Searching for Specific Error Patterns

```sql
-- Find all out-of-memory related messages
SELECT
    event_time,
    query_id,
    message
FROM system.text_log
WHERE message ILIKE '%memory%'
  AND level IN ('Error', 'Warning')
  AND event_date >= today()
ORDER BY event_time DESC;
```

## Correlating Logs with Queries

```sql
-- Find all log lines associated with a specific query
SELECT
    event_time,
    level,
    logger_name,
    message
FROM system.text_log
WHERE query_id = 'your-query-id-here'
ORDER BY event_time;
```

You can get query IDs from `system.query_log`:

```sql
SELECT query_id, query, event_time
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 10;
```

## Monitoring Warnings in Real Time

Use this query to watch for recent warnings:

```sql
SELECT
    event_time,
    level,
    logger_name,
    substring(message, 1, 200) AS short_message
FROM system.text_log
WHERE level IN ('Warning', 'Error')
  AND event_time >= now() - INTERVAL 5 MINUTE
ORDER BY event_time DESC;
```

## Setting TTL on text_log

Control retention directly in config:

```xml
<text_log>
    <ttl>event_date + INTERVAL 14 DAY</ttl>
</text_log>
```

Or alter the TTL manually:

```sql
ALTER TABLE system.text_log MODIFY TTL event_date + INTERVAL 14 DAY;
```

## Summary

The `system.text_log` table provides SQL-queryable access to ClickHouse server logs, making it far more convenient than grepping log files. Use it to filter by log level and component, correlate messages with query IDs, and monitor error trends over time. Enable it in `config.xml` and set an appropriate TTL to manage storage.
