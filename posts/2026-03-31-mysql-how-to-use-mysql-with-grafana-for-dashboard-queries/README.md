# How to Use MySQL with Grafana for Dashboard Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Grafana, Dashboard, Data Visualization, Monitoring

Description: Learn how to connect Grafana to MySQL, write effective dashboard queries, use Grafana variables, and visualize time-series and aggregated data.

---

## Why Use MySQL as a Grafana Data Source?

Many applications store metrics, events, or business data in MySQL. Grafana can query MySQL directly and visualize the data as time-series charts, tables, stat panels, and more - without needing to migrate data to a dedicated TSDB like Prometheus or InfluxDB.

## Adding MySQL as a Grafana Data Source

1. In Grafana, go to **Configuration > Data Sources**.
2. Click **Add data source** and select **MySQL**.
3. Configure the connection:

```text
Host: 127.0.0.1:3306
Database: myapp_db
User: grafana_reader
Password: readonlypassword
```

4. Set **Min time interval** to match the resolution of your data (e.g., `1m` for per-minute records).
5. Click **Save & Test**.

Create a read-only user for Grafana:

```sql
CREATE USER 'grafana_reader'@'%' IDENTIFIED BY 'readonlypassword';
GRANT SELECT ON myapp_db.* TO 'grafana_reader'@'%';
FLUSH PRIVILEGES;
```

## Writing Time-Series Queries

Grafana's MySQL plugin expects time-series queries to return at minimum a `time` column and a value column.

```sql
-- Basic time-series query: request count per minute
SELECT
  UNIX_TIMESTAMP(created_at) AS "time",
  COUNT(*) AS request_count
FROM api_requests
WHERE $__timeFilter(created_at)
GROUP BY UNIX_TIMESTAMP(created_at) DIV 60
ORDER BY time ASC;
```

`$__timeFilter(created_at)` is a Grafana macro that expands to a WHERE clause matching the dashboard time range:

```sql
-- Expands to something like:
-- created_at BETWEEN FROM_UNIXTIME(1710000000) AND FROM_UNIXTIME(1710086400)
```

## Using Grafana Time Macros

| Macro | Description |
|-------|-------------|
| `$__timeFilter(col)` | Filters rows to the dashboard time range |
| `$__timeGroup(col, interval)` | Groups time column by the selected interval |
| `$__timeFrom()` | Start of the time range as a timestamp |
| `$__timeTo()` | End of the time range as a timestamp |
| `$__interval` | Auto-calculated interval based on panel width |

```sql
-- Use $__timeGroup for automatic bucketing
SELECT
  $__timeGroup(created_at, $__interval) AS "time",
  AVG(response_time_ms) AS avg_response_time,
  MAX(response_time_ms) AS max_response_time
FROM api_requests
WHERE $__timeFilter(created_at)
GROUP BY 1
ORDER BY 1 ASC;
```

## Multi-Series Queries

To display multiple series on one panel, use a `metric` column:

```sql
-- Multiple series: one per HTTP status code
SELECT
  $__timeGroup(created_at, $__interval) AS "time",
  CONCAT('HTTP ', status_code) AS metric,
  COUNT(*) AS request_count
FROM api_requests
WHERE $__timeFilter(created_at)
GROUP BY 1, 2
ORDER BY 1 ASC;
```

Grafana automatically splits on the `metric` column to create separate series.

## Using Grafana Variables in Queries

Variables let dashboard users filter data dynamically. Create a variable in Dashboard Settings > Variables:

```text
Type: Query
Data source: MySQL
Query: SELECT DISTINCT service_name FROM services ORDER BY service_name ASC
```

Then use `$service_name` in panel queries:

```sql
SELECT
  $__timeGroup(created_at, $__interval) AS "time",
  COUNT(*) AS errors
FROM error_logs
WHERE $__timeFilter(created_at)
  AND service_name IN ($service_name)
GROUP BY 1
ORDER BY 1;
```

For multi-value variables, Grafana expands `$service_name` to a comma-separated list for the `IN` clause.

## Table Panel Queries

Not all panels need time-series format. For table panels showing aggregated summaries:

```sql
-- Top 10 slowest endpoints in the selected time range
SELECT
  endpoint,
  COUNT(*) AS request_count,
  ROUND(AVG(response_time_ms), 2) AS avg_ms,
  MAX(response_time_ms) AS max_ms,
  SUM(CASE WHEN response_time_ms > 1000 THEN 1 ELSE 0 END) AS slow_count
FROM api_requests
WHERE $__timeFilter(created_at)
GROUP BY endpoint
ORDER BY avg_ms DESC
LIMIT 10;
```

## Stat Panel Queries

For single-value stat panels:

```sql
-- Total error count in selected time range
SELECT COUNT(*) AS error_count
FROM error_logs
WHERE severity = 'ERROR'
  AND $__timeFilter(created_at);
```

## Performance Tips for Grafana Queries

- Always index the time column used in `$__timeFilter`.
- Use `DATE_FORMAT` or integer division bucketing instead of per-row time math.
- Add a composite index on `(service_name, created_at)` for frequently filtered columns.

```sql
-- Add a composite index for Grafana queries
ALTER TABLE api_requests
  ADD INDEX idx_service_time (service_name, created_at);
```

## Summary

Grafana can visualize MySQL data effectively using the built-in MySQL data source and Grafana macros like `$__timeFilter` and `$__timeGroup`. Create a read-only database user for Grafana, use dashboard variables to add interactivity, and ensure your time columns are indexed to keep dashboard queries fast. For multi-series visualizations, include a `metric` column in your query and Grafana will automatically split the result into separate series.
