# How to Use ClickHouse as a Backend for Grafana Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Grafana, Dashboards, Visualization, Database, Analytics, Monitoring, Time-Series

Description: A practical guide to using ClickHouse as a data source for Grafana dashboards, covering plugin setup, query optimization, variables, and best practices for building fast analytics dashboards.

---

ClickHouse's fast query performance makes it an excellent backend for Grafana dashboards. This guide covers how to connect ClickHouse to Grafana, write efficient queries for visualizations, and build dashboards that handle millions of data points without lag.

## Setting Up the ClickHouse Data Source

### Install the ClickHouse Plugin

```bash
# Using Grafana CLI
grafana-cli plugins install grafana-clickhouse-datasource

# Restart Grafana
sudo systemctl restart grafana-server
```

### Docker Compose Setup

```yaml
version: '3.8'
services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_INSTALL_PLUGINS=grafana-clickhouse-datasource
    volumes:
      - grafana-storage:/var/lib/grafana

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - clickhouse-data:/var/lib/clickhouse

volumes:
  grafana-storage:
  clickhouse-data:
```

### Configure Data Source

```yaml
# Grafana data source configuration
# /etc/grafana/provisioning/datasources/clickhouse.yaml
apiVersion: 1

datasources:
  - name: ClickHouse
    type: grafana-clickhouse-datasource
    url: http://clickhouse:8123
    jsonData:
      defaultDatabase: default
      protocol: http
      port: 8123
      server: clickhouse
      username: default
    secureJsonData:
      password: ""
```

## Basic Query Patterns

### Time-Series Queries

```sql
-- Basic time-series for graph panel
SELECT
    $__timeInterval(event_time) AS time,
    count() AS requests
FROM events
WHERE $__timeFilter(event_time)
GROUP BY time
ORDER BY time

-- Multiple series
SELECT
    $__timeInterval(event_time) AS time,
    event_type,
    count() AS count
FROM events
WHERE $__timeFilter(event_time)
GROUP BY time, event_type
ORDER BY time
```

### Grafana Macros

```sql
-- $__timeFilter: Filters by Grafana's time range
WHERE $__timeFilter(event_time)
-- Expands to: event_time BETWEEN '2024-01-01 00:00:00' AND '2024-01-01 23:59:59'

-- $__timeInterval: Groups by dashboard interval
$__timeInterval(event_time)
-- Expands to: toStartOfInterval(event_time, INTERVAL 1 minute)

-- $__fromTime and $__toTime: Raw timestamps
WHERE event_time >= $__fromTime AND event_time <= $__toTime

-- $__interval: Current interval as string
-- $__interval_ms: Current interval in milliseconds
```

### Table Queries

```sql
-- Table panel query
SELECT
    user_id,
    count() AS total_events,
    uniqExact(session_id) AS sessions,
    max(event_time) AS last_seen
FROM events
WHERE $__timeFilter(event_time)
GROUP BY user_id
ORDER BY total_events DESC
LIMIT 100
```

## Dashboard Variables

### Query Variable

```sql
-- Variable query for dropdown
SELECT DISTINCT event_type FROM events
WHERE event_time >= now() - INTERVAL 7 DAY
ORDER BY event_type

-- Use in dashboard queries
SELECT
    $__timeInterval(event_time) AS time,
    count() AS count
FROM events
WHERE $__timeFilter(event_time)
    AND event_type IN ($event_type)
GROUP BY time
ORDER BY time
```

### Multi-Value Variables

```sql
-- For multi-select variables
AND event_type IN (${event_type:singlequote})

-- Or with custom formatting
AND event_type IN (${event_type:sqlstring})
```

### Chained Variables

```sql
-- First variable: Get regions
SELECT DISTINCT region FROM servers

-- Second variable: Get servers in selected region
SELECT DISTINCT server_name
FROM servers
WHERE region IN ($region)

-- Dashboard query using both
SELECT
    $__timeInterval(timestamp) AS time,
    avg(cpu_usage) AS cpu
FROM metrics
WHERE $__timeFilter(timestamp)
    AND region IN ($region)
    AND server_name IN ($server_name)
GROUP BY time
ORDER BY time
```

## Optimizing Queries for Dashboards

### Use Appropriate Time Granularity

```sql
-- Bad: Too fine granularity for wide time ranges
SELECT
    toStartOfSecond(event_time) AS time,
    count() AS events
FROM events
WHERE event_time >= now() - INTERVAL 30 DAY
GROUP BY time

-- Good: Auto-adjust based on time range
SELECT
    $__timeInterval(event_time) AS time,
    count() AS events
FROM events
WHERE $__timeFilter(event_time)
GROUP BY time
ORDER BY time
```

### Pre-Aggregate for Fast Dashboards

```sql
-- Create materialized view for dashboard metrics
CREATE MATERIALIZED VIEW dashboard_metrics_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, event_type, region)
AS SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    region,
    count() AS events,
    uniqState(user_id) AS users_state,
    sumState(revenue) AS revenue_state
FROM events
GROUP BY hour, event_type, region;

-- Query the materialized view in Grafana
SELECT
    toStartOfHour(hour) AS time,
    sum(events) AS events,
    uniqMerge(users_state) AS users
FROM dashboard_metrics_mv
WHERE $__timeFilter(hour)
GROUP BY time
ORDER BY time
```

### Limit Data Transfer

```sql
-- Only select needed columns
SELECT
    $__timeInterval(event_time) AS time,
    count() AS value
FROM events
WHERE $__timeFilter(event_time)
GROUP BY time
ORDER BY time

-- Use LIMIT for top-N queries
SELECT
    user_id,
    count() AS events
FROM events
WHERE $__timeFilter(event_time)
GROUP BY user_id
ORDER BY events DESC
LIMIT 10
```

## Panel-Specific Queries

### Stat Panel (Single Value)

```sql
-- Current value
SELECT count() AS value
FROM events
WHERE $__timeFilter(event_time)

-- With trend (requires time range)
SELECT
    count() AS value,
    countIf(event_time >= now() - INTERVAL 1 HOUR) AS recent
FROM events
WHERE $__timeFilter(event_time)
```

### Gauge Panel

```sql
-- Percentage query
SELECT
    countIf(status = 'success') * 100.0 / count() AS success_rate
FROM requests
WHERE $__timeFilter(timestamp)
```

### Bar Gauge Panel

```sql
-- Top categories
SELECT
    category,
    count() AS value
FROM products
WHERE $__timeFilter(created_at)
GROUP BY category
ORDER BY value DESC
LIMIT 10
```

### Pie Chart

```sql
-- Distribution query
SELECT
    status,
    count() AS value
FROM orders
WHERE $__timeFilter(order_time)
GROUP BY status
```

### Heatmap

```sql
-- Heatmap data
SELECT
    $__timeInterval(timestamp) AS time,
    response_time_bucket,
    count() AS value
FROM (
    SELECT
        timestamp,
        multiIf(
            response_time < 100, '0-100ms',
            response_time < 500, '100-500ms',
            response_time < 1000, '500ms-1s',
            '>1s'
        ) AS response_time_bucket
    FROM requests
    WHERE $__timeFilter(timestamp)
)
GROUP BY time, response_time_bucket
ORDER BY time
```

### Logs Panel

```sql
-- Log query format
SELECT
    timestamp AS time,
    level,
    message,
    service
FROM logs
WHERE $__timeFilter(timestamp)
ORDER BY timestamp DESC
LIMIT 1000
```

## Advanced Dashboard Techniques

### Annotations from ClickHouse

```sql
-- Annotation query for deployments
SELECT
    deploy_time AS time,
    concat('Deployed: ', version) AS text,
    'deployment' AS tags
FROM deployments
WHERE $__timeFilter(deploy_time)
```

### Alert Queries

```sql
-- Error rate alert
SELECT
    $__timeInterval(timestamp) AS time,
    countIf(status >= 500) * 100.0 / count() AS error_rate
FROM requests
WHERE $__timeFilter(timestamp)
GROUP BY time
HAVING error_rate > 5
ORDER BY time
```

### Dashboard Links with Variables

```sql
-- Query that generates links
SELECT
    user_id,
    count() AS events,
    concat('/d/user-dashboard?var-user_id=', toString(user_id)) AS link
FROM events
WHERE $__timeFilter(event_time)
GROUP BY user_id
ORDER BY events DESC
LIMIT 100
```

## Performance Best Practices

### Query Optimization

```sql
-- Use PREWHERE for better performance
SELECT
    $__timeInterval(event_time) AS time,
    count() AS value
FROM events
PREWHERE event_time >= $__fromTime AND event_time <= $__toTime
WHERE event_type = 'click'
GROUP BY time
ORDER BY time
```

### Sampling for Large Datasets

```sql
-- Sample query for overview dashboards
SELECT
    $__timeInterval(event_time) AS time,
    count() * 10 AS estimated_count
FROM events SAMPLE 0.1
WHERE $__timeFilter(event_time)
GROUP BY time
ORDER BY time
```

### Caching Configuration

```xml
<!-- ClickHouse query cache for dashboard queries -->
<clickhouse>
    <query_cache>
        <max_size_in_bytes>1073741824</max_size_in_bytes>
        <max_entries>1024</max_entries>
        <max_entry_size_in_bytes>1048576</max_entry_size_in_bytes>
    </query_cache>
</clickhouse>
```

```sql
-- Use query cache for repeated dashboard queries
SELECT
    $__timeInterval(event_time) AS time,
    count() AS value
FROM events
WHERE $__timeFilter(event_time)
GROUP BY time
ORDER BY time
SETTINGS use_query_cache = 1
```

## Example Dashboard JSON

```json
{
  "panels": [
    {
      "title": "Request Rate",
      "type": "timeseries",
      "datasource": "ClickHouse",
      "targets": [
        {
          "rawSql": "SELECT $__timeInterval(timestamp) AS time, count() AS requests FROM events WHERE $__timeFilter(timestamp) GROUP BY time ORDER BY time",
          "format": "time_series"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "reqps"
        }
      }
    },
    {
      "title": "Error Rate",
      "type": "stat",
      "datasource": "ClickHouse",
      "targets": [
        {
          "rawSql": "SELECT countIf(status >= 400) * 100.0 / count() AS error_rate FROM requests WHERE $__timeFilter(timestamp)",
          "format": "table"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "percent",
          "thresholds": {
            "steps": [
              {"color": "green", "value": null},
              {"color": "yellow", "value": 1},
              {"color": "red", "value": 5}
            ]
          }
        }
      }
    }
  ]
}
```

## Troubleshooting

### Common Issues

```sql
-- Check query performance
SELECT
    query,
    query_duration_ms,
    read_rows,
    read_bytes
FROM system.query_log
WHERE query LIKE '%grafana%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 20;

-- Monitor concurrent queries from Grafana
SELECT
    user,
    count() AS queries,
    avg(query_duration_ms) AS avg_duration
FROM system.query_log
WHERE event_date = today()
  AND user = 'grafana'
GROUP BY user;
```

### Connection Pooling

```yaml
# Grafana connection settings
jsonData:
  maxOpenConnections: 10
  maxIdleConnections: 5
  connMaxLifetimeSeconds: 14400
```

---

ClickHouse and Grafana make a powerful combination for analytics dashboards. Use Grafana macros for time filtering, pre-aggregate data with materialized views for faster queries, and leverage variables for interactive dashboards. Monitor query performance and use caching to keep dashboards responsive even with large datasets.
