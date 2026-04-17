# How to Build Your First ClickHouse Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dashboard, Grafana, Visualization, Analytics

Description: Build your first ClickHouse dashboard using Grafana with a sample events dataset, covering data source setup, panel creation, and time series queries.

---

Dashboards turn raw ClickHouse data into actionable insights. Grafana is the most popular choice for visualizing ClickHouse data because of its native plugin and rich panel types. This guide walks through setting up a working dashboard from scratch.

## Setting Up Sample Data

First, create a simple events table:

```sql
CREATE TABLE events (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32,
    value Float32
) ENGINE = MergeTree()
ORDER BY (event_type, event_time);
```

Insert some sample data:

```sql
INSERT INTO events
SELECT
    now() - randUniform(0, 86400 * 7),
    arrayElement(['click', 'view', 'purchase'], rand() % 3 + 1),
    rand() % 10000,
    randUniform(1, 100)
FROM numbers(100000);
```

## Installing Grafana and the ClickHouse Plugin

```bash
docker run -d --name grafana -p 3000:3000 grafana/grafana
docker exec -it grafana grafana-cli plugins install grafana-clickhouse-datasource
docker restart grafana
```

## Configuring the Data Source

1. Open Grafana at `http://localhost:3000` (default credentials: admin/admin).
2. Go to Connections - Data Sources - Add data source.
3. Select ClickHouse.
4. Set the server URL to `http://localhost:8123`, database to `default`.
5. Click Save and Test.

## Creating a Time Series Panel

Add a new panel and enter this query:

```sql
SELECT
    toStartOfMinute(event_time) AS time,
    count() AS events
FROM events
WHERE event_time BETWEEN $__fromTime AND $__toTime
GROUP BY time
ORDER BY time
```

Set the panel type to "Time series" and the visualization will populate automatically using Grafana's built-in time range variables.

## Creating a Bar Chart by Event Type

```sql
SELECT
    event_type,
    count() AS total
FROM events
WHERE event_time BETWEEN $__fromTime AND $__toTime
GROUP BY event_type
ORDER BY total DESC
```

Use a "Bar chart" panel to display the breakdown.

## Adding a Stat Panel for Total Events

```sql
SELECT count() AS total_events
FROM events
WHERE event_time BETWEEN $__fromTime AND $__toTime
```

Use a "Stat" panel with a big number display for quick summary metrics.

## Dashboard Best Practices

- Use `$__fromTime` and `$__toTime` variables in every query so panels respond to the time picker.
- Apply `toStartOfMinute`, `toStartOfHour`, or `toStartOfDay` to aggregate time series at the right granularity.
- Use `LowCardinality(String)` columns for dimension fields used in GROUP BY.
- Set refresh intervals to match how frequently your data updates.

## Summary

Building a ClickHouse dashboard in Grafana takes only a few steps: create the data source, write SQL queries using Grafana time variables, and select the right panel type. Starting with time series, bar charts, and stat panels covers most monitoring and analytics use cases.
