# How to Monitor PostgreSQL Replication Lag, Connection Pool Stats,

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, PostgreSQL, Replication Lag, Connection Pool

Description: Monitor PostgreSQL replication lag, connection pool statistics, and lock contention using the OpenTelemetry Collector PostgreSQL receiver for database health.

PostgreSQL replication lag, connection pool utilization, and lock contention are the three most common sources of database performance issues. Monitoring them with the OpenTelemetry Collector gives you early warning of problems before they affect application performance.

## Collector Configuration

```yaml
receivers:
  postgresql:
    endpoint: "postgres:5432"
    transport: tcp
    username: monitoring
    password: "${env:POSTGRES_PASSWORD}"
    databases:
      - myapp
    collection_interval: 15s
    tls:
      insecure: true
    metrics:
      postgresql.commits:
        enabled: true
      postgresql.rollbacks:
        enabled: true
      postgresql.rows:
        enabled: true
      postgresql.operations:
        enabled: true
      postgresql.db_size:
        enabled: true
      postgresql.backends:
        enabled: true
      postgresql.replication.data_delay:
        enabled: true
      postgresql.deadlocks:
        enabled: true
      postgresql.temp_files:
        enabled: true
      postgresql.blks_read:
        enabled: true
      postgresql.blks_hit:
        enabled: true

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: postgresql
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [postgresql]
      processors: [resource, batch]
      exporters: [otlp]
```

## Monitoring Replication Lag

### How Replication Lag Works

PostgreSQL streaming replication sends WAL (Write-Ahead Log) records from the primary to replicas. Replication lag is the delay between a write on the primary and when that write is visible on the replica.

```text
postgresql.replication.data_delay - Replication lag in bytes
```

You can also query replication lag directly:

```sql
-- On the primary
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes,
    extract(epoch FROM replay_lag) AS replay_lag_seconds
FROM pg_stat_replication;
```

### Causes of Replication Lag

- Heavy write workload overwhelming the replica
- Network latency between primary and replica
- Slow disk I/O on the replica
- Long-running queries on the replica blocking WAL apply

## Monitoring Connection Pool Stats

### Active Connections

```text
postgresql.backends - Number of current backend connections
```

Compare the total number of backends to `postgresql.connection.max` or `max_connections`:

```sql
SHOW max_connections;
-- Default: 100
```

### Connection State Breakdown

For more detail, query `pg_stat_activity`:

```sql
SELECT
    state,
    count(*) AS count
FROM pg_stat_activity
GROUP BY state;
```

States: `active`, `idle`, `idle in transaction`, `idle in transaction (aborted)`.

Connections stuck in `idle in transaction` are holding locks and preventing vacuum. These are particularly problematic.

### Connection Pool Metrics (PgBouncer)

If you use PgBouncer, collect metrics from a PgBouncer Prometheus exporter too:

```yaml
receivers:
  prometheus/pgbouncer:
    config:
      scrape_configs:
        - job_name: "pgbouncer"
          scrape_interval: 15s
          static_configs:
            - targets: ["pgbouncer:9127"]
```

Key PgBouncer metrics:
```text
pgbouncer_pools_server_active_connections   - Active server connections
pgbouncer_pools_server_idle_connections     - Idle server connections
pgbouncer_pools_client_active_connections   - Active client connections
pgbouncer_pools_client_waiting_connections  - Clients waiting for a connection
```

## Monitoring Lock Contention

### Deadlocks

```text
postgresql.deadlocks - Total deadlocks detected (cumulative)
deadlock_rate = rate(postgresql.deadlocks[5m])
```

Any deadlocks indicate a problem in your application's transaction logic.

### Lock Waits

Query for active lock waits:

```sql
SELECT
    blocked.pid AS blocked_pid,
    blocked.usename AS blocked_user,
    blocking.pid AS blocking_pid,
    blocking.usename AS blocking_user,
    blocked.query AS blocked_query,
    blocking.query AS blocking_query
FROM pg_catalog.pg_stat_activity blocked
JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS blockers(blocking_pid)
    ON true
JOIN pg_catalog.pg_stat_activity blocking
    ON blocking.pid = blockers.blocking_pid;
```

## Creating a Monitoring User

```sql
-- Create a monitoring user with minimal permissions
CREATE USER monitoring WITH PASSWORD 'monitor_password';
GRANT pg_monitor TO monitoring;
GRANT CONNECT ON DATABASE myapp TO monitoring;
```

The `pg_monitor` role gives read access to system statistics views.

## Alert Conditions

```yaml
# Replication lag too high

- alert: PostgreSQLReplicationLag
  condition: postgresql.replication.data_delay > 10485760
  for: 5m
  severity: warning
  message: "Replication lag is {{ value }} bytes ({{ value_mb }}MB)"

# Connection pool near capacity
- alert: PostgreSQLConnectionsHigh
  condition: sum(postgresql.backends) / postgresql.connection.max > 0.8
  for: 5m
  severity: warning
  message: "PostgreSQL connections are above 80% of max_connections"

# Deadlocks occurring
- alert: PostgreSQLDeadlocks
  condition: rate(postgresql.deadlocks[5m]) > 0
  severity: critical
  message: "Deadlocks detected on database {{ database }}"

# Cache hit ratio low
- alert: PostgreSQLLowCacheHitRatio
  condition: postgresql.blks_hit / (postgresql.blks_hit + postgresql.blks_read) < 0.95
  for: 15m
  severity: warning
  message: "Cache hit ratio is {{ value }}. Consider increasing shared_buffers."

# Too many temporary files
- alert: PostgreSQLTempFiles
  condition: rate(postgresql.temp_files[5m]) > 10
  severity: warning
  message: "{{ value }} temp files/sec. Queries are spilling to disk."
```

## Docker Compose Example

```yaml
services:
  postgres-primary:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: changeme
      POSTGRES_USER: admin
    ports:
      - "5432:5432"
    volumes:
      - pg-data:/var/lib/postgresql/data

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    environment:
      POSTGRES_PASSWORD: changeme
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml

volumes:
  pg-data:
```

## Summary

PostgreSQL health monitoring with OpenTelemetry focuses on replication lag (for read replica freshness), connection pool utilization (to prevent exhaustion), and lock contention (to detect deadlocks and blocking queries). The Collector's PostgreSQL receiver handles the core metrics, while custom SQL queries provide deeper insight into lock waits and connection states. Alert on replication lag thresholds, connection pool capacity, deadlocks, and cache hit ratios to catch database issues early.
