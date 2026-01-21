# How to Set Up ClickHouse Audit Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Audit Logging, Compliance, Security, Monitoring

Description: A comprehensive guide to setting up audit logging in ClickHouse for tracking queries, logins, and data access for compliance and security monitoring.

---

Audit logging in ClickHouse helps track user activities, query execution, and data access for security compliance and incident investigation.

## Query Logging

### Configure Query Log

```xml
<!-- config.d/query_log.xml -->
<clickhouse>
    <query_log>
        <database>system</database>
        <table>query_log</table>
        <partition_by>toYYYYMM(event_date)</partition_by>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </query_log>

    <query_thread_log>
        <database>system</database>
        <table>query_thread_log</table>
    </query_thread_log>
</clickhouse>
```

### Query Log Analysis

```sql
-- Recent queries by user
SELECT
    event_time,
    user,
    client_hostname,
    query_kind,
    query,
    query_duration_ms,
    read_rows,
    written_rows
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY event_time DESC;

-- Failed queries
SELECT
    event_time,
    user,
    query,
    exception,
    exception_code
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing'
  AND event_time >= now() - INTERVAL 24 HOUR
ORDER BY event_time DESC;

-- Data modifications
SELECT
    event_time,
    user,
    query_kind,
    query,
    written_rows,
    written_bytes
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_kind IN ('Insert', 'Delete', 'Alter')
ORDER BY event_time DESC;
```

## Session Logging

```sql
-- Track session activity
SELECT
    event_time,
    user,
    client_hostname,
    client_name,
    interface,
    initial_query_id
FROM system.session_log
ORDER BY event_time DESC
LIMIT 100;
```

## Custom Audit Table

```sql
-- Create dedicated audit table
CREATE TABLE audit_log (
    event_time DateTime DEFAULT now(),
    event_type Enum8('login'=1, 'logout'=2, 'query'=3, 'data_access'=4),
    user String,
    source_ip String,
    query_id String,
    database String,
    table String,
    action String,
    row_count UInt64,
    details String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user)
TTL event_time + INTERVAL 1 YEAR;

-- Materialized view to capture queries
CREATE MATERIALIZED VIEW audit_query_mv TO audit_log AS
SELECT
    event_time,
    'query' AS event_type,
    user,
    client_hostname AS source_ip,
    query_id,
    databases[1] AS database,
    tables[1] AS table,
    query_kind AS action,
    read_rows + written_rows AS row_count,
    query AS details
FROM system.query_log
WHERE type = 'QueryFinish';
```

## Compliance Reporting

```sql
-- User activity summary
SELECT
    user,
    count() AS total_queries,
    countIf(query_kind = 'Select') AS select_count,
    countIf(query_kind IN ('Insert', 'Delete')) AS write_count,
    uniq(client_hostname) AS unique_hosts
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date >= today() - 30
GROUP BY user
ORDER BY total_queries DESC;

-- Sensitive table access
SELECT
    event_time,
    user,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND hasAny(tables, ['sensitive_data', 'pii_table', 'financial_data'])
ORDER BY event_time DESC;
```

## Conclusion

ClickHouse audit logging provides:

1. **Query tracking** through system.query_log
2. **Session monitoring** for login/logout events
3. **Custom audit tables** for specific requirements
4. **Compliance reports** for regulatory needs

Implement comprehensive logging for security and compliance visibility.
