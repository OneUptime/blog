# How to Set Up Grafana Dashboards for Database IPv4 Connection Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Dashboard, PostgreSQL, MySQL, IPv4, Metric, Monitoring, Visualization

Description: Learn how to build Grafana dashboards to visualize database connection metrics by IPv4 client address using Prometheus data sources.

---

Monitoring database connections helps identify connection leaks, unauthorized access, and capacity issues. This guide shows how to build Grafana dashboards for PostgreSQL connection-state metrics and MySQL connection metrics, including IPv4 client host breakdowns where the exporter exposes them.

## Prerequisites

- PostgreSQL Exporter deployed and scraped by Prometheus for PostgreSQL metrics.
- MySQL Exporter deployed and scraped by Prometheus for MySQL metrics. Enable `collect.info_schema.processlist` if you want per-client-host metrics.
- Grafana configured with Prometheus as a data source.

## PostgreSQL Connection Metrics Dashboard

### Key Metrics (PostgreSQL Exporter)

```promql
# Total active connections to PostgreSQL

sum(pg_stat_activity_count{state="active"})

# Connections grouped by application name
sum by (application_name) (pg_stat_activity_count{state="active"})

# Idle connections (potential connection leaks)
sum(pg_stat_activity_count{state="idle"})

# Connections waiting on a specific event type
sum by (wait_event_type) (pg_stat_activity_count{wait_event_type!=""})
```

The built-in `pg_stat_activity_count` metric is labeled by fields such as `application_name`, `usename`, and `wait_event_type`, not `client_addr`, so per-client IP dashboards require custom SQL-based collection.

### Sample Grafana Panel Configuration

```json
{
  "type": "timeseries",
  "title": "Active DB Connections by Application",
  "targets": [
    {
      "expr": "sum by (application_name) (pg_stat_activity_count{state='active'})",
      "legendFormat": "{{application_name}}"
    }
  ],
  "options": {
    "tooltip": { "mode": "multi" }
  }
}
```

## MySQL Connection Metrics Dashboard

### Key Metrics (MySQL Exporter)

```promql
# Total MySQL connections
mysql_global_status_threads_connected

# Max connections ever reached (compare to max_connections limit)
mysql_global_status_max_used_connections

# Connections grouped by IPv4 client host (requires collect.info_schema.processlist)
sum by (client_host) (mysql_info_schema_processlist_processes_by_host{client_host=~"^([0-9]{1,3}[.]){3}[0-9]{1,3}$"})

# Connections that were aborted (authentication failures, network issues)
mysql_global_status_aborted_connects
rate(mysql_global_status_aborted_connects[5m])
```

## Example Grafana Dashboard YAML (Provisioning)

```yaml
# /etc/grafana/provisioning/dashboards/database-connections.yaml
apiVersion: 1
providers:
  - name: database-connections
    folder: Databases
    type: file
    options:
      path: /var/lib/grafana/dashboards
```

```json
{
  "dashboard": {
    "id": null,
    "uid": "database-connection-monitor",
    "title": "Database Connection Monitor",
    "timezone": "browser",
    "schemaVersion": 17,
    "version": 0,
    "panels": [
      {
        "id": 1,
        "title": "PostgreSQL Active Connections",
        "type": "gauge",
        "gridPos": { "h": 8, "w": 8, "x": 0, "y": 0 },
        "targets": [{ "expr": "sum(pg_stat_activity_count{state='active'})" }],
        "options": { "reduceOptions": { "calcs": ["lastNotNull"] } }
      },
      {
        "id": 2,
        "title": "MySQL Connections by Client IPv4",
        "type": "table",
        "gridPos": { "h": 8, "w": 8, "x": 8, "y": 0 },
        "targets": [
          {
            "expr": "sum by (client_host) (mysql_info_schema_processlist_processes_by_host{client_host=~'^([0-9]{1,3}[.]){3}[0-9]{1,3}$'})",
            "instant": true,
            "legendFormat": "{{client_host}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Connection Rate Over Time",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 8, "x": 16, "y": 0 },
        "targets": [
          { "expr": "rate(mysql_global_status_connections[5m])", "legendFormat": "Connections/sec" },
          { "expr": "rate(mysql_global_status_aborted_connects[5m])", "legendFormat": "Aborted/sec" }
        ]
      }
    ]
  },
  "overwrite": true
}
```

## Alerting on Too Many Connections

```yaml
# Prometheus alerting rule (load via Prometheus or a compatible ruler)
# Alert when a single IPv4 client host has >50 MySQL connections
groups:
  - name: database-alerts
    rules:
      - alert: TooManyConnectionsFromIP
        expr: 'sum by (client_host) (mysql_info_schema_processlist_processes_by_host{client_host=~"^([0-9]{1,3}[.]){3}[0-9]{1,3}$"}) > 50'
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High connection count from {{ $labels.client_host }}"
          description: "Client {{ $labels.client_host }} has {{ $value }} MySQL connections"
```

## Key Takeaways

- `pg_stat_activity_count` is useful for PostgreSQL connection-state dashboards, but the built-in postgres_exporter metric is not labeled by `client_addr`.
- Use `mysql_info_schema_processlist_processes_by_host` with a Grafana table panel for snapshot views of MySQL connections per IPv4 client address.
- Set up alerts on Prometheus queries such as `sum(pg_stat_activity_count{state="active"})` or `mysql_global_status_threads_connected` to catch connection spikes.
- Dashboard provisioning via YAML files makes dashboards version-controllable and reproducible.
