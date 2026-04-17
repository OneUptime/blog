# How to Use ClickHouse with Apache Superset

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Superset, Business Intelligence, Analytics, Visualization

Description: Learn how to connect Apache Superset to ClickHouse, create datasets, build charts, and publish dashboards using the clickhouse-connect SQLAlchemy driver.

---

> Apache Superset connects to ClickHouse through the clickhouse-connect driver and provides a no-code chart builder on top of your analytical tables.

Apache Superset is an open-source BI platform that supports dozens of databases. With the `clickhouse-connect` SQLAlchemy dialect, Superset can query ClickHouse tables directly and render interactive dashboards. This guide covers installation, connection setup, dataset creation, and building production dashboards.

---

## Installing Superset with ClickHouse Support

Install Superset and the ClickHouse driver.

```bash
# Install Superset
pip install apache-superset

# Install the ClickHouse SQLAlchemy driver
pip install clickhouse-connect

# Initialize Superset
export FLASK_APP=superset
superset db upgrade
superset fab create-admin \
  --username admin \
  --firstname Admin \
  --lastname User \
  --email admin@example.com \
  --password admin

superset init

# Start Superset
superset run -p 8088 --with-threads --reload --debugger
```

## Using Docker Compose

The quickest way to run Superset with ClickHouse locally.

```yaml
# docker-compose.yml
version: "3.8"

services:
  superset:
    image: apache/superset:latest
    ports:
      - "8088:8088"
    environment:
      SUPERSET_SECRET_KEY: "changeme-in-production"
      SUPERSET_LOAD_EXAMPLES: "false"
    volumes:
      - superset_home:/app/superset_home
    command: >
      bash -c "
        pip install clickhouse-connect &&
        superset db upgrade &&
        superset fab create-admin --username admin --firstname Admin --lastname User --email admin@example.com --password admin &&
        superset init &&
        superset run -p 8088 --with-threads
      "

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - ch_data:/var/lib/clickhouse

volumes:
  superset_home:
  ch_data:
```

```bash
docker-compose up -d
```

## Connecting Superset to ClickHouse

Add the ClickHouse database in Superset's UI or via the API.

```text
Superset UI:
  Settings -> Database Connections -> + Database

  Supported Databases: ClickHouse Connect (clickhouse-connect)

  SQLAlchemy URI:
  clickhousedb://default:password@localhost:8123/default

  Advanced -> Engine Parameters:
  {
    "connect_args": {
      "secure": false,
      "verify": false
    }
  }
```

```python
# Or configure via Superset's API
import requests

session = requests.Session()

# Login
login_resp = session.post(
    "http://localhost:8088/api/v1/security/login",
    json={
        "username": "admin",
        "password": "admin",
        "provider": "db"
    }
)
token = login_resp.json()["access_token"]
session.headers.update({"Authorization": f"Bearer {token}"})

# Add ClickHouse database
db_resp = session.post(
    "http://localhost:8088/api/v1/database/",
    json={
        "database_name": "ClickHouse Production",
        "sqlalchemy_uri": "clickhousedb://default:password@localhost:8123/default",
        "expose_in_sqllab": True,
        "allow_run_async": True,
        "allow_dml": False
    }
)
print("Database created:", db_resp.json())
```

## Creating Analytical Tables in ClickHouse

Build tables optimized for Superset dashboards.

```sql
CREATE TABLE analytics.sales_daily
(
    date        Date,
    country     LowCardinality(String),
    channel     LowCardinality(String),
    product_id  UInt32,
    revenue     Float64,
    orders      UInt32,
    customers   UInt32
)
ENGINE = SummingMergeTree((revenue, orders, customers))
PARTITION BY toYYYYMM(date)
ORDER BY (date, country, channel, product_id);

-- Populate with sample data
INSERT INTO analytics.sales_daily
SELECT
    today() - (number % 365)                              AS date,
    ['US','GB','DE','FR','JP'][1 + number % 5]            AS country,
    ['organic','paid','email','referral'][1 + number % 4] AS channel,
    (number % 50) + 1                                     AS product_id,
    round(randCanonical() * 10000, 2)                     AS revenue,
    rand() % 200 + 1                                      AS orders,
    rand() % 150 + 1                                      AS customers
FROM numbers(100000);
```

## Creating Datasets in Superset

Register the ClickHouse table as a Superset dataset.

```text
Superset UI:
  Data -> Datasets -> + Dataset

  Database:  ClickHouse Production
  Schema:    analytics
  Table:     sales_daily

  Then configure:
  - Set "date" as the main datetime column
  - Mark "revenue", "orders", "customers" as metrics
  - Mark "country", "channel", "product_id" as dimensions
```

## Writing Custom SQL Datasets

Create virtual datasets with pre-computed aggregations.

```sql
-- Custom SQL dataset for the "Revenue Overview" dashboard
SELECT
    toStartOfMonth(date)            AS month,
    country,
    channel,
    sum(revenue)                    AS total_revenue,
    sum(orders)                     AS total_orders,
    sum(customers)                  AS unique_customers,
    round(sum(revenue) / sum(orders), 2) AS avg_order_value
FROM analytics.sales_daily
WHERE date >= dateAdd('month', -12, today())
GROUP BY month, country, channel
ORDER BY month DESC, total_revenue DESC
```

## Configuring Superset for ClickHouse Performance

Tune Superset and ClickHouse for responsive dashboards.

```python
# superset_config.py
SQLALCHEMY_DATABASE_URI = "sqlite:////app/superset_home/superset.db"

# ClickHouse-specific query settings
CUSTOM_SECURITY_MANAGER = None

# Cache configuration (Redis recommended for production)
CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_URL": "redis://localhost:6379/0"
}

# Enable async queries for long-running ClickHouse queries
FEATURE_FLAGS = {
    "GLOBAL_ASYNC_QUERIES": True,
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True
}

# Row limit for ad-hoc queries (ClickHouse is fast, but set reasonable limits)
ROW_LIMIT = 5000
SQL_MAX_ROW = 100000
```

## Adding ClickHouse-Specific Jinja Templating

Use Superset's Jinja templating to pass dashboard filters into ClickHouse queries.

```sql
-- Dataset with Jinja template for dynamic filtering
SELECT
    toStartOfDay(date)  AS day,
    country,
    sum(revenue)        AS revenue,
    sum(orders)         AS orders
FROM analytics.sales_daily
WHERE date BETWEEN '{{ from_dttm }}' AND '{{ to_dttm }}'
  {% if filter_values('country') %}
  AND country IN ({{ "'" + "','".join(filter_values('country')) + "'" }})
  {% endif %}
GROUP BY day, country
ORDER BY day
```

## Exporting and Scheduling Reports

Schedule dashboard exports to be emailed.

```bash
# Install email/reporting dependencies
pip install celery[redis] apache-superset[playwright]

# Schedule a dashboard email (via Celery beat)
# In superset_config.py:
# CELERY_CONFIG = {
#     'broker_url': 'redis://localhost:6379/0',
#     'imports': ['superset.tasks'],
#     'beat_schedule': { ... }
# }
```

```text
Superset UI:
  Dashboards -> [Your Dashboard] -> ... -> Set up Email Schedule

  Schedule: Every day at 8:00 AM
  Recipients: team@example.com
  Format: PDF
```

## Summary

Apache Superset connects to ClickHouse using the `clickhouse-connect` SQLAlchemy driver. Register ClickHouse as a database in Superset, create datasets from tables or custom SQL, and build charts using Superset's drag-and-drop interface. Use custom SQL datasets with Jinja templating for dynamic filtering. Enable Redis caching and async queries for dashboards with complex ClickHouse aggregations. The `SummingMergeTree` engine works well for pre-aggregated tables that power summary dashboards.
