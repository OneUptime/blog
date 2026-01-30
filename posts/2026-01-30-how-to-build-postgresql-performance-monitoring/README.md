# How to Build PostgreSQL Performance Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PostgreSQL, Performance, Monitoring, Database

Description: Learn how to monitor PostgreSQL performance using pg_stat views, query analysis, and integration with observability tools.

---

PostgreSQL is a powerful open-source relational database, but maintaining optimal performance requires comprehensive monitoring. In this guide, we will explore how to build a robust PostgreSQL performance monitoring system using built-in statistics views, slow query logging, and integration with observability tools like Prometheus.

## Enabling pg_stat_statements

The `pg_stat_statements` extension is essential for tracking query performance. It collects statistics about all SQL statements executed by a server.

First, enable the extension in your `postgresql.conf`:

```ini
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
pg_stat_statements.max = 10000
```

Then create the extension in your database:

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

Query the most time-consuming statements:

```sql
SELECT
    query,
    calls,
    total_exec_time / 1000 AS total_seconds,
    mean_exec_time / 1000 AS avg_seconds,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

## Monitoring Table Statistics with pg_stat_user_tables

The `pg_stat_user_tables` view provides insights into table access patterns, helping identify missing indexes and dead tuple accumulation.

```sql
SELECT
    schemaname,
    relname AS table_name,
    seq_scan,
    idx_scan,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_dead_tup AS dead_tuples,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

A high `seq_scan` to `idx_scan` ratio often indicates missing indexes on frequently queried columns.

## Configuring Slow Query Logging

Enable slow query logging to capture queries exceeding a threshold:

```ini
log_min_duration_statement = 1000  # Log queries taking longer than 1 second
log_statement = 'none'             # Avoid logging all statements
log_duration = off
```

For more detailed analysis, enable query plans for slow queries:

```ini
auto_explain.log_min_duration = 1000
auto_explain.log_analyze = true
shared_preload_libraries = 'pg_stat_statements,auto_explain'
```

## Connection Monitoring

Monitor active connections to prevent connection exhaustion:

```sql
SELECT
    state,
    COUNT(*) AS connection_count,
    MAX(EXTRACT(EPOCH FROM (now() - state_change))) AS max_age_seconds
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
GROUP BY state;
```

Track connection usage against limits:

```sql
SELECT
    max_conn,
    used,
    max_conn - used AS available,
    ROUND((used::float / max_conn) * 100, 2) AS usage_percent
FROM (
    SELECT
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_conn,
        (SELECT COUNT(*) FROM pg_stat_activity) AS used
) AS conn_stats;
```

## Lock Monitoring

Identify blocking locks that cause query delays:

```sql
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_query
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked_activity ON blocked_locks.pid = blocked_activity.pid
JOIN pg_locks blocking_locks ON blocked_locks.locktype = blocking_locks.locktype
    AND blocked_locks.relation = blocking_locks.relation
    AND blocked_locks.pid <> blocking_locks.pid
JOIN pg_stat_activity blocking_activity ON blocking_locks.pid = blocking_activity.pid
WHERE NOT blocked_locks.granted;
```

## Vacuum Statistics

Monitor autovacuum performance to prevent table bloat:

```sql
SELECT
    schemaname,
    relname,
    n_dead_tup,
    n_live_tup,
    ROUND((n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2) AS dead_tuple_percent,
    last_autovacuum,
    autovacuum_count
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

## Integration with Prometheus postgres_exporter

For production monitoring, use `postgres_exporter` to expose PostgreSQL metrics to Prometheus.

Install and configure the exporter:

```yaml
# docker-compose.yml
services:
  postgres_exporter:
    image: prometheuscommunity/postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://user:password@postgres:5432/dbname?sslmode=disable"
    ports:
      - "9187:9187"
```

Create a monitoring user with limited permissions:

```sql
CREATE USER postgres_exporter WITH PASSWORD 'secure_password';
GRANT pg_monitor TO postgres_exporter;
GRANT SELECT ON pg_stat_statements TO postgres_exporter;
```

Configure Prometheus to scrape the exporter:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres_exporter:9187']
```

Key metrics to monitor include `pg_stat_activity_count`, `pg_stat_user_tables_n_dead_tup`, `pg_stat_statements_calls_total`, and `pg_locks_count`.

## Building Alerting Rules

Create Prometheus alerting rules for critical conditions:

```yaml
groups:
  - name: postgresql
    rules:
      - alert: PostgreSQLHighConnections
        expr: pg_stat_activity_count > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High PostgreSQL connection count"
      - alert: PostgreSQLDeadTuples
        expr: pg_stat_user_tables_n_dead_tup > 100000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High dead tuple count - vacuum needed"
```

## Conclusion

Building effective PostgreSQL performance monitoring requires combining built-in statistics views, proper logging configuration, and integration with external observability tools. Start with `pg_stat_statements` for query analysis, monitor table health through `pg_stat_user_tables`, and use `postgres_exporter` for metrics collection. With these components in place, you can proactively identify performance issues before they impact your users.
