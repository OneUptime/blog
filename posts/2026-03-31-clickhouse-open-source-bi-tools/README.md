# How to Use ClickHouse with Open Source BI Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Business Intelligence, Grafana, Superset, Metabase

Description: Connect ClickHouse to open source BI tools like Apache Superset, Metabase, and Grafana to build dashboards without expensive commercial licensing.

---

## Open Source BI Options for ClickHouse

Several mature open source BI tools support ClickHouse natively or via drivers:

- **Apache Superset** - feature-rich, SQL Lab, charts, native ClickHouse connector
- **Metabase** - user-friendly, no-code interface, ClickHouse via official driver
- **Grafana** - strong for time-series, ClickHouse plugin available
- **Redash** - lightweight, SQL-first, ClickHouse supported

## Connecting Apache Superset to ClickHouse

Install the ClickHouse SQLAlchemy driver:

```bash
pip install clickhouse-connect
```

Add a database connection in Superset with the URI:

```text
clickhousedb://user:password@ch.internal:8123/analytics
```

Alternatively, you can use the native TCP protocol by installing separate packages:

```bash
pip install clickhouse-sqlalchemy clickhouse-driver
```

Then use the native protocol URI:

```text
clickhouse+native://user:password@ch.internal:9000/analytics
```

Once connected, create datasets from your tables or SQL queries and build charts.

## Connecting Metabase

Starting with Metabase 54, the ClickHouse driver is bundled as a built-in core driver. Simply add ClickHouse as a new database from the admin panel — no extra installation required.

For older Metabase versions (prior to 54), download the driver JAR from the ClickHouse GitHub releases and place it in the `/plugins` directory:

```bash
mkdir -p /metabase/plugins
curl -L -o /metabase/plugins/clickhouse.metabase-driver.jar \
  https://github.com/ClickHouse/metabase-clickhouse-driver/releases/latest/download/clickhouse.metabase-driver.jar
```

Restart Metabase and add ClickHouse as a new database from the admin panel.

## Connecting Grafana

Install the ClickHouse data source plugin:

```bash
grafana-cli plugins install grafana-clickhouse-datasource
```

Configure the data source:

```text
Server address: ch.internal
Server port: 9000
Protocol: Native
Username: grafana_reader
Password: <secret>
Default database: analytics
```

## Building a Revenue Dashboard in Superset

Create a chart using this SQL dataset:

```sql
SELECT
    toDate(created_at) AS date,
    country,
    sum(total_cents) / 100.0 AS revenue_usd,
    count(DISTINCT user_id) AS customers
FROM orders
WHERE created_at >= '{{ filter_values('date_range')[0] }}'
  AND status = 'completed'
GROUP BY date, country
ORDER BY date, revenue_usd DESC
```

## Building a Time-Series Panel in Grafana

```sql
SELECT
    toStartOfMinute(event_time) AS time,
    count() AS requests,
    countIf(status_code >= 500) AS errors
FROM http_access_log
WHERE event_time BETWEEN $__fromTime AND $__toTime
  AND service = '$service'
GROUP BY time
ORDER BY time
```

## Row-Level Security with Views

Create restricted views per team to enforce access control:

```sql
CREATE VIEW analytics.marketing_orders AS
SELECT order_id, order_date, campaign_id, revenue
FROM analytics.orders
WHERE channel = 'marketing';

GRANT SELECT ON analytics.marketing_orders TO marketing_analyst;
```

Marketing analysts only see marketing-attributed orders in their BI tool.

## Summary

Open source BI tools like Superset, Metabase, and Grafana all have first-class ClickHouse support, enabling you to build production-grade dashboards without commercial BI licensing costs while keeping your data in your own infrastructure.
