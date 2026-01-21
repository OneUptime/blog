# How to Monitor PostgreSQL with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Prometheus, Grafana, Monitoring, Observability, Metrics

Description: A comprehensive guide to monitoring PostgreSQL with Prometheus and Grafana, covering postgres_exporter setup, key metrics, dashboard creation, and alerting rules.

---

Effective monitoring is crucial for PostgreSQL operations. Prometheus and Grafana provide a powerful, open-source monitoring stack that gives you visibility into database performance, resource usage, and potential issues. This guide covers complete setup and best practices.

## Prerequisites

- PostgreSQL running
- Prometheus server
- Grafana instance
- Basic understanding of metrics and alerting

## Architecture Overview

```
PostgreSQL --> postgres_exporter --> Prometheus --> Grafana
                    |
                    v
              Alert Manager --> Notifications
```

## Install postgres_exporter

### Download and Install

```bash
# Download latest release
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.15.0/postgres_exporter-0.15.0.linux-amd64.tar.gz

# Extract
tar xzf postgres_exporter-0.15.0.linux-amd64.tar.gz
sudo mv postgres_exporter-0.15.0.linux-amd64/postgres_exporter /usr/local/bin/

# Verify
postgres_exporter --version
```

### Create PostgreSQL User

```sql
CREATE USER postgres_exporter WITH PASSWORD 'secure_password';
GRANT pg_monitor TO postgres_exporter;
GRANT SELECT ON pg_stat_database TO postgres_exporter;
GRANT SELECT ON pg_stat_user_tables TO postgres_exporter;
GRANT SELECT ON pg_stat_statements TO postgres_exporter;
```

### Configure Connection

```bash
# Environment variable
export DATA_SOURCE_NAME="postgresql://postgres_exporter:password@localhost:5432/postgres?sslmode=disable"

# Or connection string file
echo "postgresql://postgres_exporter:password@localhost:5432/postgres?sslmode=disable" > /etc/postgres_exporter/datasource

# Run exporter
postgres_exporter --web.listen-address=":9187"
```

### Systemd Service

```ini
# /etc/systemd/system/postgres_exporter.service
[Unit]
Description=PostgreSQL Exporter
After=network.target

[Service]
Type=simple
User=postgres_exporter
Group=postgres_exporter
Environment=DATA_SOURCE_NAME=postgresql://postgres_exporter:password@localhost:5432/postgres?sslmode=disable
ExecStart=/usr/local/bin/postgres_exporter --web.listen-address=:9187
Restart=always

[Install]
WantedBy=multi-user.target
```

Start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable postgres_exporter
sudo systemctl start postgres_exporter
```

### Verify Metrics

```bash
curl http://localhost:9187/metrics | grep pg_
```

## Configure Prometheus

### prometheus.yml

```yaml
scrape_configs:
  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']
        labels:
          instance: 'production-db'

    # Optional: metric relabeling
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'go_.*'
        action: drop
```

### Service Discovery (Kubernetes)

```yaml
scrape_configs:
  - job_name: 'postgresql'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: postgres-exporter
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
```

## Key Metrics

### Database Metrics

```promql
# Database size
pg_database_size_bytes{datname="myapp"}

# Active connections
pg_stat_activity_count{state="active"}

# Total connections
sum(pg_stat_activity_count)

# Connection utilization
pg_stat_activity_count / pg_settings_max_connections * 100

# Transactions per second
rate(pg_stat_database_xact_commit[5m]) + rate(pg_stat_database_xact_rollback[5m])
```

### Performance Metrics

```promql
# Cache hit ratio
pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read)

# Tuple operations
rate(pg_stat_database_tup_inserted[5m])
rate(pg_stat_database_tup_updated[5m])
rate(pg_stat_database_tup_deleted[5m])

# Deadlocks
rate(pg_stat_database_deadlocks[5m])

# Temp files
rate(pg_stat_database_temp_bytes[5m])
```

### Replication Metrics

```promql
# Replication lag (bytes)
pg_replication_lag_bytes

# Replication lag (seconds)
pg_replication_lag_seconds

# WAL position difference
pg_wal_position_diff
```

### Table Metrics

```promql
# Dead tuples
pg_stat_user_tables_n_dead_tup

# Sequential scans
rate(pg_stat_user_tables_seq_scan[5m])

# Index scans
rate(pg_stat_user_tables_idx_scan[5m])

# Table bloat indicator
pg_stat_user_tables_n_dead_tup / pg_stat_user_tables_n_live_tup
```

## Grafana Dashboards

### Import Existing Dashboard

1. Go to Grafana > Dashboards > Import
2. Enter dashboard ID: `9628` (PostgreSQL Database)
3. Select Prometheus data source
4. Click Import

### Custom Dashboard Panels

#### Database Overview

```json
{
  "title": "Database Size",
  "type": "stat",
  "targets": [
    {
      "expr": "pg_database_size_bytes{datname=\"myapp\"}",
      "legendFormat": "{{datname}}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "bytes"
    }
  }
}
```

#### Connection Count

```json
{
  "title": "Active Connections",
  "type": "timeseries",
  "targets": [
    {
      "expr": "pg_stat_activity_count{datname=\"myapp\", state=\"active\"}",
      "legendFormat": "Active"
    },
    {
      "expr": "pg_stat_activity_count{datname=\"myapp\", state=\"idle\"}",
      "legendFormat": "Idle"
    },
    {
      "expr": "pg_stat_activity_count{datname=\"myapp\", state=\"idle in transaction\"}",
      "legendFormat": "Idle in Transaction"
    }
  ]
}
```

#### Cache Hit Ratio

```json
{
  "title": "Cache Hit Ratio",
  "type": "gauge",
  "targets": [
    {
      "expr": "100 * pg_stat_database_blks_hit{datname=\"myapp\"} / (pg_stat_database_blks_hit{datname=\"myapp\"} + pg_stat_database_blks_read{datname=\"myapp\"})"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "thresholds": {
        "steps": [
          {"value": 0, "color": "red"},
          {"value": 90, "color": "yellow"},
          {"value": 99, "color": "green"}
        ]
      }
    }
  }
}
```

## Alerting Rules

### Prometheus Alert Rules

```yaml
# /etc/prometheus/rules/postgresql.yml
groups:
  - name: postgresql
    rules:
      # High connections
      - alert: PostgreSQLHighConnections
        expr: pg_stat_activity_count > (pg_settings_max_connections * 0.8)
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High connection count on {{ $labels.instance }}"
          description: "Connection count is {{ $value }} (80%+ of max)"

      # Connection exhaustion
      - alert: PostgreSQLConnectionExhaustion
        expr: pg_stat_activity_count > (pg_settings_max_connections * 0.95)
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Connection exhaustion imminent"

      # Low cache hit ratio
      - alert: PostgreSQLLowCacheHitRatio
        expr: |
          pg_stat_database_blks_hit{datname!~"template.*"} /
          (pg_stat_database_blks_hit{datname!~"template.*"} +
           pg_stat_database_blks_read{datname!~"template.*"}) < 0.95
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit ratio on {{ $labels.datname }}"

      # High replication lag
      - alert: PostgreSQLReplicationLag
        expr: pg_replication_lag_seconds > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High replication lag"
          description: "Replication lag is {{ $value }}s"

      # Replication lag critical
      - alert: PostgreSQLReplicationLagCritical
        expr: pg_replication_lag_seconds > 300
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical replication lag"

      # Dead tuples
      - alert: PostgreSQLHighDeadTuples
        expr: pg_stat_user_tables_n_dead_tup > 100000
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "High dead tuple count"
          description: "Table {{ $labels.relname }} has {{ $value }} dead tuples"

      # Database down
      - alert: PostgreSQLDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL instance is down"

      # Too many deadlocks
      - alert: PostgreSQLDeadlocks
        expr: rate(pg_stat_database_deadlocks[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Deadlocks occurring"

      # Transaction ID wraparound warning
      - alert: PostgreSQLXIDWraparound
        expr: pg_database_age > 1500000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "XID wraparound approaching"
```

### Grafana Alerts

Create alerts in Grafana UI:

1. Edit panel > Alert tab
2. Create alert rule with condition
3. Configure notification channel

## Custom Queries with postgres_exporter

### Extended Queries

```yaml
# /etc/postgres_exporter/queries.yaml
pg_stat_statements:
  query: |
    SELECT
      queryid,
      calls,
      total_exec_time / 1000 as total_exec_time_seconds,
      mean_exec_time / 1000 as mean_exec_time_seconds,
      rows
    FROM pg_stat_statements
    ORDER BY total_exec_time DESC
    LIMIT 20
  metrics:
    - queryid:
        usage: "LABEL"
        description: "Query ID"
    - calls:
        usage: "COUNTER"
        description: "Number of calls"
    - total_exec_time_seconds:
        usage: "COUNTER"
        description: "Total execution time"
    - mean_exec_time_seconds:
        usage: "GAUGE"
        description: "Mean execution time"
    - rows:
        usage: "COUNTER"
        description: "Rows returned"

pg_locks:
  query: |
    SELECT
      database,
      mode,
      count(*) as count
    FROM pg_locks
    GROUP BY database, mode
  metrics:
    - database:
        usage: "LABEL"
    - mode:
        usage: "LABEL"
    - count:
        usage: "GAUGE"
        description: "Lock count"
```

Run with custom queries:
```bash
postgres_exporter --extend.query-path=/etc/postgres_exporter/queries.yaml
```

## Best Practices

### Metric Collection

1. **Scrape interval**: 15-30 seconds for most metrics
2. **Retention**: 15-30 days for high-resolution data
3. **Aggregation**: Use recording rules for expensive queries

### Recording Rules

```yaml
groups:
  - name: postgresql_recording
    rules:
      - record: postgresql:transactions_per_second
        expr: sum(rate(pg_stat_database_xact_commit[5m])) + sum(rate(pg_stat_database_xact_rollback[5m]))

      - record: postgresql:cache_hit_ratio
        expr: |
          sum(pg_stat_database_blks_hit) /
          (sum(pg_stat_database_blks_hit) + sum(pg_stat_database_blks_read))
```

### Security

1. Use dedicated monitoring user with minimal permissions
2. Enable SSL for exporter connections
3. Restrict network access to exporter ports

## Conclusion

Comprehensive PostgreSQL monitoring with Prometheus and Grafana provides:

1. **Real-time visibility** into database performance
2. **Proactive alerting** for potential issues
3. **Historical analysis** for capacity planning
4. **Custom metrics** for application-specific needs
5. **Integration** with existing observability stack

Set up monitoring early and continuously refine alerts based on your operational experience.
