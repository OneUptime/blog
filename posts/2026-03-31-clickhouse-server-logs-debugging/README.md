# How to Use ClickHouse Server Logs for Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Logging, Debugging, Troubleshooting, Operation

Description: Learn how to use ClickHouse server logs to diagnose errors, slow queries, replication issues, and startup failures with practical examples.

---

## Log File Locations

By default, ClickHouse writes logs to:

```text
/var/log/clickhouse-server/clickhouse-server.log      # Main log
/var/log/clickhouse-server/clickhouse-server.err.log  # Error log
```

Configure log paths in `config.xml`:

```xml
<logger>
  <log>/var/log/clickhouse-server/clickhouse-server.log</log>
  <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
  <level>information</level>
  <size>1000M</size>
  <count>10</count>
</logger>
```

## Log Levels

```text
none, fatal, critical, error, warning, notice, information, debug, trace
```

Increase to `debug` for detailed troubleshooting (generates large log files):

```xml
<level>debug</level>
```

## Reading the Main Log

Each line has the format:

```text
[timestamp] [thread_id] {query_id} <level> <component>: message
```

Example:

```text
2026.03.31 10:00:01.234567 [ 12345 ] {abc-123} <Information> executeQuery: SELECT count() FROM events
```

## Following Logs in Real Time

```bash
# Watch all log activity
sudo tail -f /var/log/clickhouse-server/clickhouse-server.log

# Watch errors only
sudo tail -f /var/log/clickhouse-server/clickhouse-server.err.log

# Filter for a specific query ID
grep "abc-123" /var/log/clickhouse-server/clickhouse-server.log
```

## Finding Slow Queries in Logs

```bash
# Find queries that exceeded time limits
grep "Timeout exceeded" /var/log/clickhouse-server/clickhouse-server.err.log

# Find memory limit errors
grep "MEMORY_LIMIT_EXCEEDED" /var/log/clickhouse-server/clickhouse-server.err.log
```

Or use `system.query_log` for structured access:

```sql
SELECT
    query_start_time,
    query_duration_ms,
    read_rows,
    memory_usage,
    query
FROM system.query_log
WHERE query_duration_ms > 10000
  AND event_date = today()
ORDER BY query_duration_ms DESC
LIMIT 10;
```

## Debugging Replication from Logs

```bash
grep -i "replication\|replica\|fetch\|merge" \
  /var/log/clickhouse-server/clickhouse-server.log | tail -50
```

Common replication log messages:

```text
ReplicatedMergeTree: Fetching part ... from ...   <- Normal replication
ReplicatedMergeTree: All parts are in sync        <- Healthy state
ReplicatedMergeTree: Lost connection to ZooKeeper <- ZooKeeper issue
```

## Enabling Per-Query Logging

To log every query, set the log level in the user profile:

```xml
<profiles>
  <default>
    <log_queries>1</log_queries>
    <log_query_threads>1</log_query_threads>
  </default>
</profiles>
```

## Searching by Query ID

When a client reports an error, find all log lines for that query:

```bash
grep "{query-id-here}" /var/log/clickhouse-server/clickhouse-server.log
```

The query ID is returned in the HTTP `X-ClickHouse-Query-Id` response header.

## Summary

ClickHouse server logs are the primary tool for debugging errors, slow queries, and replication problems. Use `tail -f` for real-time monitoring and `grep` to filter by error type or query ID. Complement log files with `system.query_log` and `system.errors` for structured access to historical data. Only increase log level to `debug` temporarily as it generates significantly more output.
