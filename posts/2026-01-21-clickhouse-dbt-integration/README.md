# How to Connect ClickHouse to dbt for Analytics Engineering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, dbt, Analytics Engineering, Data Modeling, ELT, Data Transformation

Description: A comprehensive guide to connecting ClickHouse to dbt for analytics engineering, covering adapter setup, model patterns, incremental materialization, and testing best practices.

---

dbt (data build tool) enables analytics engineering with version-controlled, tested data transformations. This guide covers integrating dbt with ClickHouse for scalable data modeling.

## Setting Up dbt-clickhouse

### Installation

```bash
pip install dbt-clickhouse

# Initialize project
dbt init my_analytics_project
# Select clickhouse when prompted
```

### Configuration

```yaml
# profiles.yml
my_analytics:
  target: dev
  outputs:
    dev:
      type: clickhouse
      host: localhost
      port: 8123
      user: default
      password: ''
      database: analytics
      schema: dbt_dev
      secure: false

    prod:
      type: clickhouse
      host: clickhouse.example.com
      port: 8443
      user: dbt_user
      password: "{{ env_var('DBT_PASSWORD') }}"
      database: analytics
      schema: dbt_prod
      secure: true
```

## dbt Models for ClickHouse

### Basic Model

```sql
-- models/staging/stg_events.sql
{{ config(
    materialized='table',
    engine='MergeTree()',
    order_by='(user_id, event_time)'
) }}

SELECT
    event_id,
    toDateTime(event_timestamp) AS event_time,
    user_id,
    event_type,
    JSONExtractString(properties, 'page') AS page
FROM {{ source('raw', 'events') }}
WHERE event_timestamp >= '2024-01-01'
```

### Incremental Model

```sql
-- models/marts/fct_daily_events.sql
{{ config(
    materialized='incremental',
    engine='SummingMergeTree()',
    order_by='(event_date, user_id)',
    partition_by='toYYYYMM(event_date)',
    unique_key='(event_date, user_id)'
) }}

SELECT
    toDate(event_time) AS event_date,
    user_id,
    count() AS event_count,
    countIf(event_type = 'purchase') AS purchase_count,
    sumIf(revenue, event_type = 'purchase') AS total_revenue
FROM {{ ref('stg_events') }}
{% if is_incremental() %}
WHERE event_time > (SELECT max(event_date) FROM {{ this }})
{% endif %}
GROUP BY event_date, user_id
```

### Materialized View Model

```sql
-- models/marts/mv_hourly_stats.sql
{{ config(
    materialized='materialized_view',
    engine='SummingMergeTree()',
    order_by='(hour, event_type)'
) }}

SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    count() AS event_count,
    uniq(user_id) AS unique_users
FROM {{ ref('stg_events') }}
GROUP BY hour, event_type
```

## Testing

```yaml
# models/schema.yml
version: 2

models:
  - name: stg_events
    columns:
      - name: event_id
        tests:
          - not_null
          - unique
      - name: event_time
        tests:
          - not_null
      - name: user_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_users')
              field: user_id
```

## Running dbt

```bash
# Run all models
dbt run

# Run specific model
dbt run --select fct_daily_events

# Test models
dbt test

# Generate documentation
dbt docs generate
dbt docs serve
```

## Conclusion

dbt with ClickHouse provides:

1. **Version-controlled transformations** in SQL
2. **Incremental processing** for large datasets
3. **Testing framework** for data quality
4. **Documentation** generation
5. **Modular data modeling** with refs

Use dbt to build maintainable, tested analytics pipelines in ClickHouse.
