# How to Use ClickHouse with Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Grafana, Observability, Analytics, Visualization

Description: Learn how to connect Grafana to ClickHouse using the official ClickHouse data source plugin, write time-series queries, build dashboards, and set up alerting.

---

> The official ClickHouse Grafana plugin provides a query builder and raw SQL editor optimized for time-series observability data stored in ClickHouse.

ClickHouse is an excellent backend for Grafana dashboards because of its fast aggregation performance on time-series data. Grafana's official ClickHouse data source plugin supports both a visual query builder and raw SQL, making it suitable for metrics, logs, traces, and custom analytics. This guide covers plugin setup, query patterns, and production dashboard configuration.

---

## Installing the ClickHouse Plugin

Install the Grafana ClickHouse data source plugin.

```bash
# Install via Grafana CLI
grafana-cli plugins install grafana-clickhouse-datasource

# Restart Grafana
sudo systemctl restart grafana-server

# Or install in a Docker container
docker run -d \
  --name grafana \
  -p 3000:3000 \
  -e GF_INSTALL_PLUGINS=grafana-clickhouse-datasource \
  -v grafana_data:/var/lib/grafana \
  grafana/grafana-oss:latest
```

## Configuring the Data Source

Add the ClickHouse data source in Grafana.

```text
Grafana -> Configuration -> Data Sources -> Add data source

Type:     ClickHouse
Name:     ClickHouse Production

Server address: clickhouse.example.com
Server port:    9000 (native) or 8443 (HTTPS)
Protocol:       Native  (recommended) or HTTP

Username: grafana_user
Password: grafana_password

Default database: metrics

TLS/SSL settings:
  TLS Client Auth: Enabled (for production)
```

## Creating a Grafana User in ClickHouse

Set up a restricted user for Grafana queries.

```sql
-- Create user
CREATE USER grafana_user
IDENTIFIED WITH plaintext_password BY 'grafana_password'
HOST ANY;

-- Grant SELECT
GRANT SELECT ON metrics.* TO grafana_user;
GRANT SELECT ON logs.*    TO grafana_user;

-- Apply a resource profile to prevent runaway queries
CREATE SETTINGS PROFILE grafana_profile
    SETTINGS max_execution_time = 30,
             max_memory_usage   = 4000000000,
             use_query_cache    = 1,
             query_cache_ttl    = 60;

ALTER USER grafana_user SETTINGS PROFILE grafana_profile;
```

## Creating Time-Series Tables

Build tables optimized for Grafana time-series panels.

```sql
CREATE DATABASE IF NOT EXISTS metrics;

CREATE TABLE metrics.http_requests
(
    ts          DateTime,
    host        LowCardinality(String),
    endpoint    LowCardinality(String),
    method      LowCardinality(String),
    status_code UInt16,
    duration_ms Float32,
    request_size UInt32,
    response_size UInt32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (host, endpoint, ts)
TTL ts + INTERVAL 30 DAY;

-- Create a logs table
CREATE TABLE logs.app_logs
(
    ts        DateTime64(3),
    level     LowCardinality(String),
    service   LowCardinality(String),
    message   String,
    trace_id  String,
    span_id   String,
    attrs     Map(String, String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (service, level, ts)
TTL ts + INTERVAL 7 DAY;
```

## Writing Time-Series Queries

Use Grafana's `$__timeFilter` and `$__interval` macros.

```sql
-- Request rate per interval (use in Time series panel)
SELECT
    toStartOfInterval(ts, INTERVAL $__interval_s SECOND) AS time,
    count()                                               AS requests
FROM metrics.http_requests
WHERE $__timeFilter(ts)
  AND host = '$host'
GROUP BY time
ORDER BY time;

-- P50, P90, P99 latency over time
SELECT
    toStartOfInterval(ts, INTERVAL $__interval_s SECOND) AS time,
    quantile(0.50)(duration_ms) AS p50,
    quantile(0.90)(duration_ms) AS p90,
    quantile(0.99)(duration_ms) AS p99
FROM metrics.http_requests
WHERE $__timeFilter(ts)
  AND host = '$host'
GROUP BY time
ORDER BY time;

-- Error rate per endpoint
SELECT
    toStartOfInterval(ts, INTERVAL $__interval_s SECOND) AS time,
    endpoint,
    countIf(status_code >= 500) / count() * 100 AS error_rate_pct
FROM metrics.http_requests
WHERE $__timeFilter(ts)
  AND host = '$host'
GROUP BY time, endpoint
ORDER BY time;
```

## Building a Log Panel

Query the logs table for Grafana's Logs visualization.

```sql
-- Logs panel query (use "Logs" visualization type)
SELECT
    ts              AS time,
    level,
    service,
    message,
    trace_id
FROM logs.app_logs
WHERE $__timeFilter(ts)
  AND level IN ($log_level)
  AND service = '$service'
ORDER BY ts DESC
LIMIT 1000;
```

## Dashboard Variables

Define Grafana template variables to make dashboards interactive.

```text
Variable: host
Type: Query
Data source: ClickHouse Production
Query:
  SELECT DISTINCT host FROM metrics.http_requests
  WHERE $__timeFilter(ts)
  ORDER BY host
Multi-value: true
Include All: true

Variable: endpoint
Type: Query
Data source: ClickHouse Production
Query:
  SELECT DISTINCT endpoint FROM metrics.http_requests
  WHERE $__timeFilter(ts)
    AND host IN (${host:singlequote})
  ORDER BY endpoint
Multi-value: true
Depends on: host
```

## Provisioning Dashboards as Code

Define the dashboard in YAML for version control.

```yaml
# /etc/grafana/provisioning/dashboards/clickhouse.yaml
apiVersion: 1

providers:
  - name: ClickHouse Dashboards
    type: file
    updateIntervalSeconds: 60
    options:
      path: /var/lib/grafana/dashboards/clickhouse
      foldersFromFilesStructure: true
```

```json
{
  "title": "ClickHouse HTTP Metrics",
  "uid": "clickhouse-http",
  "tags": ["clickhouse", "http"],
  "refresh": "30s",
  "panels": [
    {
      "title": "Request Rate",
      "type": "timeseries",
      "datasource": "ClickHouse Production",
      "targets": [
        {
          "rawSql": "SELECT toStartOfInterval(ts, INTERVAL $__interval_s SECOND) AS time, count() AS requests FROM metrics.http_requests WHERE $__timeFilter(ts) GROUP BY time ORDER BY time",
          "format": "time_series"
        }
      ]
    }
  ]
}
```

## Setting Up Alerts

Configure Grafana alerts that trigger on ClickHouse query thresholds.

```sql
-- Alert query: error rate above 5%
SELECT
    toStartOfInterval(ts, INTERVAL 1 MINUTE) AS time,
    countIf(status_code >= 500) / count() * 100 AS error_rate
FROM metrics.http_requests
WHERE ts >= now() - INTERVAL 5 MINUTE
GROUP BY time
ORDER BY time
```

```text
Grafana Alerting -> New alert rule

Query A (above SQL):
  Condition: error_rate > 5
  For:       5 minutes

Notification policy:
  Contact point: PagerDuty / Slack / Email
  Group by: host, endpoint
  Repeat interval: 1 hour
```

## Summary

The official ClickHouse Grafana plugin provides a query builder and SQL editor with Grafana macros like `$__timeFilter` and `$__interval_s` that automatically adapt queries to the selected dashboard time range. Use MergeTree tables with short TTLs for metrics and logs, write aggregation queries with `toStartOfInterval` for time-series panels, and define template variables for interactive filtering. Provision dashboards as JSON files for version control, and configure Grafana alerts with ClickHouse queries as the evaluation source.
