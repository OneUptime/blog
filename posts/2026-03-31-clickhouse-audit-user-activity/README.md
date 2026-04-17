# How to Audit ClickHouse User Activity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, Audit, Database, Administration, Monitoring

Description: Learn how to audit ClickHouse user activity by querying query logs, session logs, and part logs to track who ran what queries and when.

---

Auditing user activity in ClickHouse means tracking who connected, what queries they ran, which tables they accessed, and what data modifications they made. ClickHouse exposes this information through system tables that are populated automatically. No external agents or plugins are required.

## System Tables Used for Auditing

| Table | Purpose |
|-------|---------|
| `system.query_log` | All executed queries with timing, user, and resource usage |
| `system.session_log` | Login and logout events with authentication method |
| `system.query_views_log` | Views accessed during query execution |
| `system.part_log` | Data modifications: inserts, merges, mutations |
| `system.text_log` | Server-level log messages |

## Enabling Query Logging

Query logging is enabled by default. Verify it in `config.xml`:

```xml
<clickhouse>
  <query_log>
    <database>system</database>
    <table>query_log</table>
    <!-- Flush to the table every 7.5 seconds -->
    <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    <!-- Keep logs for 30 days -->
    <ttl>event_date + INTERVAL 30 DAY DELETE</ttl>
  </query_log>
</clickhouse>
```

For per-user query logging control:

```xml
<users>
  <alice>
    <log_queries>1</log_queries>
    <log_query_settings>1</log_query_settings>
  </alice>
</users>
```

Or via SQL settings profile:

```sql
CREATE SETTINGS PROFILE audited_user
    SETTINGS log_queries = 1
    TO alice;
```

## Enabling Session Logging

Session logging tracks login and logout events:

```xml
<clickhouse>
  <session_log>
    <database>system</database>
    <table>session_log</table>
    <ttl>event_date + INTERVAL 30 DAY DELETE</ttl>
  </session_log>
</clickhouse>
```

## Auditing Recent Queries by User

```sql
SELECT
    event_time,
    user,
    client_hostname,
    query_kind,
    databases,
    tables,
    left(query, 200) AS query_preview,
    read_rows,
    read_bytes,
    result_rows,
    memory_usage
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 24 HOUR
ORDER BY event_time DESC
LIMIT 50;
```

## Auditing Failed Queries and Access Errors

```sql
SELECT
    event_time,
    user,
    client_hostname,
    exception_code,
    exception,
    left(query, 200) AS query_preview
FROM system.query_log
WHERE type IN ('ExceptionBeforeStart', 'ExceptionWhileProcessing')
  AND event_time >= now() - INTERVAL 24 HOUR
ORDER BY event_time DESC;
```

## Auditing Login Attempts

```sql
SELECT
    event_time,
    type,
    user,
    client_hostname,
    client_port,
    auth_type,
    interface
FROM system.session_log
WHERE event_time >= now() - INTERVAL 24 HOUR
ORDER BY event_time DESC
LIMIT 100;
```

Filter only failed logins:

```sql
SELECT
    event_time,
    user,
    client_hostname,
    auth_type
FROM system.session_log
WHERE type = 'LoginFailure'
  AND event_time >= now() - INTERVAL 7 DAY
ORDER BY event_time DESC;
```

## Tracking Table Access Per User

Find which tables each user is querying:

```sql
SELECT
    user,
    arrayJoin(tables) AS accessed_table,
    count()           AS query_count
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= today()
  AND notEmpty(tables)
GROUP BY user, accessed_table
ORDER BY user, query_count DESC;
```

## Auditing Data Modifications

Track inserts, merges, and mutations through `system.part_log`:

```sql
SELECT
    event_time,
    event_type,
    database,
    table,
    part_name,
    rows,
    size_in_bytes
FROM system.part_log
WHERE event_type IN ('NewPart', 'MutatePart', 'RemovePart')
  AND event_time >= now() - INTERVAL 24 HOUR
ORDER BY event_time DESC
LIMIT 100;
```

Track DDL changes (table creation, alterations, drops):

```sql
SELECT
    event_time,
    user,
    query_kind,
    left(query, 300) AS ddl_query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_kind IN ('Create', 'Alter', 'Drop', 'Rename', 'Truncate')
  AND event_time >= now() - INTERVAL 7 DAY
ORDER BY event_time DESC;
```

## Top Users by Resource Consumption

```sql
SELECT
    user,
    count()                                   AS queries,
    formatReadableSize(sum(read_bytes))       AS data_read,
    formatReadableSize(sum(memory_usage))     AS peak_memory,
    round(avg(query_duration_ms) / 1000, 2)  AS avg_duration_sec,
    max(query_duration_ms) / 1000            AS max_duration_sec
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= today() - 7
GROUP BY user
ORDER BY sum(read_bytes) DESC;
```

## Detecting Unusual Activity

Find users running queries at unusual hours:

```sql
SELECT
    user,
    toHour(event_time)   AS hour,
    count()              AS queries
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= today() - 30
GROUP BY user, hour
ORDER BY user, hour;
```

Find queries reading an unusually large amount of data:

```sql
SELECT
    event_time,
    user,
    client_hostname,
    formatReadableSize(read_bytes) AS data_read,
    left(query, 300)               AS query_preview
FROM system.query_log
WHERE type = 'QueryFinish'
  AND read_bytes > 10737418240  -- more than 10 GiB
  AND event_time >= today() - 7
ORDER BY read_bytes DESC;
```

## Exporting Audit Logs to a Dedicated Table

For long-term retention and compliance, copy audit data to a dedicated table:

```sql
CREATE TABLE audit.query_audit
(
    event_time      DateTime,
    user            String,
    client_hostname String,
    query_kind      String,
    databases       Array(String),
    tables          Array(String),
    query           String,
    read_bytes      UInt64,
    memory_usage    UInt64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user)
TTL event_time + INTERVAL 365 DAY DELETE;

-- Populate daily via a scheduled job or ClickHouse Materialized View
INSERT INTO audit.query_audit
SELECT
    event_time,
    user,
    client_hostname,
    query_kind,
    databases,
    tables,
    query,
    read_bytes,
    memory_usage
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = yesterday();
```

## Retaining Audit Logs

The default `system.query_log` retention is controlled by the TTL in your config. For compliance environments, extend the retention or export to a separate table or external system (Kafka, S3) using ClickHouse table engines.

## Summary

ClickHouse provides built-in auditing through `system.query_log`, `system.session_log`, and `system.part_log`. Enable detailed logging in the server configuration, query these tables to investigate user activity, failed logins, table access patterns, and data modifications. For compliance, export audit records to a dedicated table with extended TTL retention.
