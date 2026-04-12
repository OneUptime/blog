# How to Create Grafana Dashboards for MySQL Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Grafana, Prometheus, Monitoring, Dashboard

Description: Learn how to build Grafana dashboards for MySQL monitoring using Prometheus metrics, covering connections, query rate, InnoDB buffer pool, and replication lag.

---

Grafana dashboards give you visual insight into MySQL performance. Combined with Prometheus and the `mysqld_exporter`, you can build panels that track queries per second, connection usage, InnoDB efficiency, and replication health.

## Prerequisites

You need:
- MySQL with `mysqld_exporter` running and scraping into Prometheus
- Grafana connected to Prometheus as a data source

## Importing the Official MySQL Dashboard

The fastest way to get started is to import community dashboard ID 7362, which provides a comprehensive MySQL overview:

1. In Grafana, go to Dashboards > Import
2. Enter dashboard ID `7362`
3. Select your Prometheus data source
4. Click Import

This dashboard includes panels for connections, queries per second, buffer pool usage, and table I/O. You can use it as a starting point and customize panels as needed.

## Creating a Custom Dashboard

To build your own, click "New Dashboard" and add panels manually.

### Panel 1: Queries Per Second

Use this PromQL expression:

```text
rate(mysql_global_status_questions[5m])
```

Set visualization to "Time series", title to "Queries Per Second". This shows overall query throughput over the last 5 minutes.

### Panel 2: Active Connections vs Max

```text
mysql_global_status_threads_connected
```

Add a second query for the limit:

```text
mysql_global_variables_max_connections
```

Display both as lines with different colors to visualize how close you are to the connection ceiling.

### Panel 3: InnoDB Buffer Pool Hit Rate

The buffer pool hit rate indicates how often data is served from memory rather than disk:

```text
rate(mysql_global_status_innodb_buffer_pool_read_requests[5m]) /
(rate(mysql_global_status_innodb_buffer_pool_read_requests[5m]) +
 rate(mysql_global_status_innodb_buffer_pool_reads[5m]))
```

Display as a gauge or stat panel with a threshold: green above 0.99, yellow between 0.95 and 0.99, red below 0.95.

### Panel 4: Slow Queries Per Minute

```text
rate(mysql_global_status_slow_queries[1m]) * 60
```

This shows the rate of slow queries. A spike here indicates query performance degradation.

### Panel 5: Replication Lag (if monitoring replicas)

```text
mysql_slave_status_seconds_behind_master
```

Set thresholds: green under 5 seconds, yellow under 30, red above 30.

## Setting Up Alerts in Grafana

Add alert rules directly on panels. For the connection panel:

```text
mysql_global_status_threads_connected / mysql_global_variables_max_connections > 0.85
```

This fires when connections exceed 85% of `max_connections`. Set the evaluation interval to 1m and add a notification channel (Slack, email, PagerDuty).

## Organizing the Dashboard with Rows

Group related panels into rows for clarity:

- Row 1: Overview (QPS, connections, uptime)
- Row 2: InnoDB Performance (buffer pool, disk reads, writes)
- Row 3: Replication (lag, relay log pos)
- Row 4: Errors and Slow Queries

## Exporting the Dashboard as Code

Save your dashboard definition as JSON for version control:

```bash
# Export via Grafana API
curl -s http://admin:admin@localhost:3000/api/dashboards/uid/mysql-overview \
  | jq '.dashboard' > mysql-dashboard.json
```

To re-import it, wrap the dashboard JSON in the required request body and use the `/api/dashboards/db` endpoint:

```bash
jq '{dashboard: ., folderId: 0, overwrite: true}' mysql-dashboard.json | \
  curl -X POST http://admin:admin@localhost:3000/api/dashboards/db \
    -H 'Content-Type: application/json' \
    -d @-
```

## Summary

Build MySQL Grafana dashboards by importing community dashboard 7362 or creating custom panels with PromQL. Key panels include queries per second using `rate(mysql_global_status_questions[5m])`, connection utilization compared to `max_connections`, InnoDB buffer pool hit rate, and replication lag. Add alert rules on connection and slow query panels to get notified before problems escalate.
