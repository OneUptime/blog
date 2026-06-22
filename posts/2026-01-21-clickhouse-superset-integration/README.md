# How to Integrate ClickHouse with Apache Superset

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Superset, BI, Visualization, Analytics, Dashboard, Self-Service, SQL

Description: A step-by-step guide to integrating Apache Superset with ClickHouse for self-service analytics, covering database connection, query optimization, dashboard creation, and performance tuning.

---

Apache Superset is an open-source BI tool that pairs well with ClickHouse for self-service analytics. This guide covers how to connect Superset to ClickHouse, optimize queries for visualization, and build interactive dashboards.

## Installation and Setup

### Docker Compose Deployment

```yaml
version: '3.8'
services:
  superset:
    image: apache/superset:latest
    ports:
      - "8088:8088"
    environment:
      - SUPERSET_SECRET_KEY=your-secret-key
    volumes:
      - superset-home:/app/superset_home
    depends_on:
      - clickhouse
      - redis
      - postgres

  superset-init:
    image: apache/superset:latest
    command: >
      bash -c "
        pip install clickhouse-connect &&
        superset db upgrade &&
        superset init &&
        superset fab create-admin --username admin --firstname Admin --lastname User --email admin@example.com --password admin
      "
    depends_on:
      - superset

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - clickhouse-data:/var/lib/clickhouse

  redis:
    image: redis:7
    volumes:
      - redis-data:/data

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=superset
      - POSTGRES_PASSWORD=superset
      - POSTGRES_DB=superset
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  superset-home:
  clickhouse-data:
  redis-data:
  postgres-data:
```

### Install ClickHouse Driver

```bash
# Inside Superset container

pip install clickhouse-connect

# Or add to requirements-local.txt
echo "clickhouse-connect" >> requirements-local.txt
```

### Superset Configuration

```python
# superset_config.py
import os
from flask_caching.backends.rediscache import RedisCache

# Basic configuration
SECRET_KEY = os.environ.get('SUPERSET_SECRET_KEY', 'your-secret-key')
SQLALCHEMY_DATABASE_URI = 'postgresql://superset:superset@postgres:5432/superset'

# Cache configuration
CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 300,
    'CACHE_KEY_PREFIX': 'superset_',
    'CACHE_REDIS_URL': 'redis://redis:6379/0',
}

# Results backend for async queries
RESULTS_BACKEND = RedisCache(
    host='redis',
    port=6379,
    key_prefix='superset_results'
)

# ClickHouse specific settings
SQLA_TABLE_MUTATOR = lambda table: table

# Enable async query execution
FEATURE_FLAGS = {
    'ENABLE_TEMPLATE_PROCESSING': True,
    'DASHBOARD_NATIVE_FILTERS': True,
    'DASHBOARD_CROSS_FILTERS': True,
}

# Query timeout (5 minutes)
SQLLAB_TIMEOUT = 300
SUPERSET_WEBSERVER_TIMEOUT = 300
```

## Database Connection

### Add ClickHouse Database

1. Navigate to Data -> Databases -> + Database
2. Select ClickHouse from the list
3. Configure the connection:

```text
# Connection String Format
clickhousedb://user:password@host:port/database

# Example
clickhousedb://default:@clickhouse:8123/default

# Equivalent explicit ClickHouse Connect dialect
clickhousedb+connect://default:@clickhouse:8123/default
```

### Advanced Connection Settings

```json
{
    "connect_args": {
        "connect_timeout": 30,
        "send_receive_timeout": 300,
        "compression": "zstd",
        "query_limit": 100000
    }
}
```

### Test Connection SQL

```sql
SELECT 1 AS test, version() AS clickhouse_version
```

## Dataset Configuration

### Creating Datasets

```sql
-- Create a view for the dataset
CREATE VIEW sales_analytics AS
SELECT
    toDate(order_time) AS order_date,
    product_category,
    region,
    count() AS orders,
    sum(amount) AS revenue,
    avg(amount) AS avg_order_value
FROM orders
GROUP BY order_date, product_category, region;
```

### Virtual Dataset (SQL Lab Query)

```sql
-- Define virtual dataset with time grain support
{% set time_filter = get_time_filter("order_time", remove_filter=True) %}
SELECT
    toStartOfInterval(order_time, INTERVAL 1 HOUR) AS time,
    product_category,
    count() AS orders,
    sum(amount) AS revenue
FROM orders
WHERE order_time >= {{ time_filter.from_expr }}
  AND order_time < {{ time_filter.to_expr }}
GROUP BY time, product_category
ORDER BY time
```

### Metrics Definition

```yaml
# In dataset configuration
metrics:
  - metric_name: total_revenue
    expression: SUM(amount)
    verbose_name: Total Revenue

  - metric_name: unique_customers
    expression: uniqExact(customer_id)
    verbose_name: Unique Customers

  - metric_name: conversion_rate
    expression: countIf(status = 'completed') / count() * 100
    verbose_name: Conversion Rate (%)
```

## Query Optimization for Superset

### Time Grain Expressions

```python
# In superset_config.py - Custom time grain for ClickHouse
from superset.db_engine_specs.clickhouse import ClickHouseBaseEngineSpec

ClickHouseBaseEngineSpec._time_grain_expressions = {
    None: '{col}',
    'PT1M': 'toStartOfMinute(toDateTime({col}))',
    'PT5M': 'toDateTime(intDiv(toUInt32(toDateTime({col})), 300)*300)',
    'PT10M': 'toDateTime(intDiv(toUInt32(toDateTime({col})), 600)*600)',
    'PT15M': 'toDateTime(intDiv(toUInt32(toDateTime({col})), 900)*900)',
    'PT30M': 'toDateTime(intDiv(toUInt32(toDateTime({col})), 1800)*1800)',
    'PT1H': 'toStartOfHour(toDateTime({col}))',
    'P1D': 'toStartOfDay(toDateTime({col}))',
    'P1W': 'toMonday(toDateTime({col}))',
    'P1M': 'toStartOfMonth(toDateTime({col}))',
    'P3M': 'toStartOfQuarter(toDateTime({col}))',
    'P1Y': 'toStartOfYear(toDateTime({col}))',
}
```

### Optimize Dataset Queries

```sql
-- Pre-aggregated dataset for faster dashboard loading
CREATE MATERIALIZED VIEW dashboard_metrics_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (day, product_category, region)
AS SELECT
    toDate(order_time) AS day,
    product_category,
    region,
    countState() AS order_count,
    sumState(amount) AS total_amount,
    uniqState(customer_id) AS customers_state
FROM orders
GROUP BY day, product_category, region;

-- Query view for Superset
CREATE VIEW dashboard_metrics AS
SELECT
    day,
    product_category,
    region,
    countMerge(order_count) AS orders,
    sumMerge(total_amount) AS revenue,
    uniqMerge(customers_state) AS customers
FROM dashboard_metrics_mv
GROUP BY day, product_category, region;
```

## Dashboard Creation

### Time-Series Chart

```sql
-- Query for line chart
SELECT
    toStartOfDay(event_time) AS day,
    count() AS events,
    uniqExact(user_id) AS users
FROM events
WHERE event_time >= toDate('{{ from_dttm }}')
  AND event_time < toDate('{{ to_dttm }}')
GROUP BY day
ORDER BY day
```

### Bar Chart with Filters

```sql
-- Top products by revenue
SELECT
    product_name,
    sum(amount) AS revenue
FROM orders
WHERE order_time >= '{{ from_dttm }}'
  AND order_time < '{{ to_dttm }}'
  {% if filter_values('region') %}
  AND region IN {{ filter_values('region') | where_in }}
  {% endif %}
GROUP BY product_name
ORDER BY revenue DESC
LIMIT 20
```

### Funnel Chart

```sql
-- Conversion funnel
WITH funnel_data AS (
    SELECT
        user_id,
        windowFunnel(86400)(
            event_time,
            event_type = 'view',
            event_type = 'cart',
            event_type = 'checkout',
            event_type = 'purchase'
        ) AS step
    FROM events
    WHERE event_time >= '{{ from_dttm }}'
      AND event_time < '{{ to_dttm }}'
    GROUP BY user_id
)
SELECT
    step_name,
    users
FROM (
    SELECT 1 AS step_order, 'View' AS step_name, countIf(step >= 1) AS users FROM funnel_data
    UNION ALL
    SELECT 2, 'Cart', countIf(step >= 2) FROM funnel_data
    UNION ALL
    SELECT 3, 'Checkout', countIf(step >= 3) FROM funnel_data
    UNION ALL
    SELECT 4, 'Purchase', countIf(step >= 4) FROM funnel_data
)
ORDER BY step_order
```

## Native Filters

### Date Range Filter

```sql
-- Dataset column for filtering
SELECT DISTINCT toDate(order_time) AS order_date
FROM orders
WHERE order_time >= now() - INTERVAL 365 DAY
ORDER BY order_date DESC
```

### Category Filter

```sql
-- Dynamic category filter
SELECT DISTINCT product_category
FROM products
WHERE active = 1
ORDER BY product_category
```

### Dependent Filters

```sql
-- Subcategory depends on category selection
SELECT DISTINCT subcategory
FROM products
WHERE 1 = 1
  {% if filter_values("category") %}
  AND category = '{{ filter_values("category")[0] }}'
  {% endif %}
ORDER BY subcategory
```

## SQL Lab Best Practices

### Query Templates

```sql
-- Parameterized query with Jinja
SELECT
    toStartOfDay(event_time) AS day,
    {{ metrics | default('count()') }} AS value
FROM events
WHERE event_time >= '{{ from_dttm }}'
  AND event_time < '{{ to_dttm }}'
  {% if filter_values('event_type') %}
  AND event_type IN {{ filter_values('event_type') | where_in }}
  {% endif %}
GROUP BY day
ORDER BY day
```

### Query Optimization

```sql
-- Use PREWHERE for time filters
SELECT
    toStartOfHour(event_time) AS hour,
    count() AS events
FROM events
PREWHERE event_time >= '{{ from_dttm }}'
  AND event_time < '{{ to_dttm }}'
GROUP BY hour
ORDER BY hour
SETTINGS max_threads = 4
```

### Limit Results

```sql
-- Always limit for exploration
SELECT *
FROM large_table
WHERE timestamp >= '{{ from_dttm | default("2024-01-01", true) }}'
  AND timestamp < '{{ to_dttm | default("2024-12-31", true) }}'
LIMIT {{ row_limit | default(1000) }}
```

## Performance Tuning

### Query Caching

```python
# superset_config.py
CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 86400,  # 24 hours
    'CACHE_KEY_PREFIX': 'superset_',
    'CACHE_REDIS_URL': 'redis://redis:6379/0',
}

# Data cache for chart queries
DATA_CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 3600,  # 1 hour
    'CACHE_KEY_PREFIX': 'superset_data_',
    'CACHE_REDIS_URL': 'redis://redis:6379/1',
}
```

### Async Queries

```python
# Enable async query execution
FEATURE_FLAGS = {
    'GLOBAL_ASYNC_QUERIES': True,
}

# Celery configuration
class CeleryConfig:
    broker_url = 'redis://redis:6379/0'
    imports = (
        'superset.sql_lab',
        'superset.tasks.scheduler',
    )
    result_backend = 'redis://redis:6379/0'
    task_annotations = {
        'sql_lab.get_sql_results': {
            'rate_limit': '100/s',
        },
    }

CELERY_CONFIG = CeleryConfig
```

### ClickHouse Settings for Superset

```sql
-- Create user for Superset with optimized settings
CREATE USER superset IDENTIFIED BY 'password'
SETTINGS
    max_execution_time = 300,
    max_memory_usage = 10000000000,
    max_threads = 8,
    use_query_cache = 1,
    query_cache_ttl = 3600;

GRANT SELECT ON analytics.* TO superset;
```

## Security Configuration

### Row-Level Security

```python
# In superset_config.py
GUEST_TOKEN_JWT_ALGO = 'HS256'

# Apply row-level security rules to SQL Lab queries
FEATURE_FLAGS = {
    'RLS_IN_SQLLAB': True,
}
```

### Dataset Permissions

```sql
-- Create views per team
CREATE VIEW sales_team_data AS
SELECT *
FROM orders
WHERE region IN ('US', 'EU');

CREATE VIEW apac_team_data AS
SELECT *
FROM orders
WHERE region = 'APAC';
```

## Monitoring

### Query Performance

```sql
-- Monitor Superset queries in ClickHouse
SELECT
    query_start_time,
    query_duration_ms,
    read_rows,
    memory_usage,
    query
FROM system.query_log
WHERE user = 'superset'
  AND type = 'QueryFinish'
  AND event_date = today()
ORDER BY query_duration_ms DESC
LIMIT 20;
```

### Dashboard Load Times

```sql
-- Track slow dashboard queries
SELECT
    toStartOfHour(query_start_time) AS hour,
    count() AS queries,
    avg(query_duration_ms) AS avg_duration,
    quantile(0.95)(query_duration_ms) AS p95_duration
FROM system.query_log
WHERE user = 'superset'
  AND type = 'QueryFinish'
  AND event_date >= today() - 7
GROUP BY hour
ORDER BY hour;
```

---

Apache Superset and ClickHouse make a powerful combination for self-service analytics. Use materialized views to pre-aggregate data for dashboards, enable query caching for faster load times, and leverage Jinja templates for dynamic filtering. Configure appropriate timeouts and memory limits to handle complex queries without impacting other workloads.
