# How to Use ClickHouse with Looker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Looker, Business Intelligence, Analytics, Visualization

Description: Learn how to connect Looker to ClickHouse, configure a LookML model, write optimized PDTs, and build dashboards on top of ClickHouse analytical tables.

---

> Looker connects to ClickHouse via JDBC and lets you build governed semantic models on top of your analytical data warehouse.

Looker is a self-service BI platform that uses LookML, a modeling language that abstracts SQL into reusable dimensions, measures, and explores. Connecting Looker to ClickHouse gives business users access to fast, scalable analytics through a governed data model. This guide covers connection setup, LookML modeling, persistent derived tables, and performance tuning.

---

## Prerequisites

Verify access to both Looker and ClickHouse.

```bash
# Test ClickHouse connectivity
clickhouse-client \
  --host clickhouse.example.com \
  --port 9000 \
  --user looker_user \
  --password looker_password \
  --query "SELECT 1"

# Verify HTTP interface (used by Looker JDBC)
curl -s "http://clickhouse.example.com:8123/?query=SELECT+1" \
  --user looker_user:looker_password
```

## Creating a Dedicated Looker User in ClickHouse

Create a user with appropriate permissions for Looker.

```sql
-- Create a read-only user for Looker
CREATE USER looker_user
IDENTIFIED WITH plaintext_password BY 'strong_looker_password'
HOST ANY;

-- Grant SELECT on the analytics database
GRANT SELECT ON analytics.* TO looker_user;

-- Create the scratch database for Persistent Derived Tables (PDTs)
-- Looker materializes PDTs as real tables in this database
CREATE DATABASE IF NOT EXISTS analytics_looker_scratch;

-- Grant permissions for PDT lifecycle (create, populate, query, drop)
GRANT CREATE TABLE ON analytics_looker_scratch.* TO looker_user;
GRANT INSERT ON analytics_looker_scratch.* TO looker_user;
GRANT SELECT ON analytics_looker_scratch.* TO looker_user;
GRANT DROP TABLE ON analytics_looker_scratch.* TO looker_user;
GRANT ALTER ON analytics_looker_scratch.* TO looker_user;

-- Grant access to system tables for introspection
GRANT SELECT ON system.columns     TO looker_user;
GRANT SELECT ON system.tables      TO looker_user;
GRANT SELECT ON system.databases   TO looker_user;
```

## Configuring the Looker Connection

Set up the ClickHouse database connection in Looker Admin.

```text
Looker Admin -> Connections -> New Connection

Dialect:     ClickHouse
Host:        clickhouse.example.com
Port:        8443  (HTTPS) or 8123 (HTTP)
Database:    analytics
Username:    looker_user
Password:    strong_looker_password
Schema:      analytics
SSL:         Enabled (recommended for production)

Additional JDBC parameters:
ssl=true&sslmode=STRICT

PDT (Persistent Derived Tables):
  PDT Connection Override: looker_user
  PDT Database:            analytics_looker_scratch
```

## Creating the Analytics Tables

Build well-structured ClickHouse tables for Looker to model.

```sql
-- Create the database and tables in ClickHouse
CREATE DATABASE IF NOT EXISTS analytics;

CREATE TABLE analytics.orders
(
    order_id      UUID,
    user_id       UInt64,
    status        LowCardinality(String),
    total_amount  Float64,
    discount      Float64,
    created_at    DateTime,
    shipped_at    Nullable(DateTime),
    country       LowCardinality(String),
    channel       LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id, created_at);

CREATE TABLE analytics.users
(
    user_id     UInt64,
    email       String,
    plan_tier   LowCardinality(String),
    country     LowCardinality(String),
    created_at  DateTime,
    is_active   UInt8
)
ENGINE = ReplacingMergeTree(created_at)
ORDER BY user_id;
```

## Writing LookML Views

Create LookML view files that map to the ClickHouse tables.

```text
# views/orders.view.lkml

view: orders {
  sql_table_name: analytics.orders ;;

  dimension: order_id {
    type: string
    primary_key: yes
    sql: ${TABLE}.order_id ;;
  }

  dimension: user_id {
    type: number
    sql: ${TABLE}.user_id ;;
  }

  dimension: status {
    type: string
    sql: ${TABLE}.status ;;
  }

  dimension: country {
    type: string
    map_layer_name: countries
    sql: ${TABLE}.country ;;
  }

  dimension: total_amount {
    type: number
    sql: ${TABLE}.total_amount ;;
    value_format_name: usd
  }

  dimension: channel {
    type: string
    sql: ${TABLE}.channel ;;
  }

  dimension_group: created {
    type: time
    timeframes: [raw, date, week, month, quarter, year]
    sql: ${TABLE}.created_at ;;
    datatype: datetime
  }

  measure: count {
    type: count
    drill_fields: [order_id, status, total_amount]
  }

  measure: total_revenue {
    type: sum
    sql: ${TABLE}.total_amount ;;
    value_format_name: usd
  }

  measure: average_order_value {
    type: average
    sql: ${TABLE}.total_amount ;;
    value_format_name: usd
  }

  measure: unique_customers {
    type: count_distinct
    sql: ${TABLE}.user_id ;;
  }
}
```

```text
# views/users.view.lkml

view: users {
  sql_table_name: analytics.users FINAL ;;

  dimension: user_id {
    type: number
    primary_key: yes
    sql: ${TABLE}.user_id ;;
  }

  dimension: plan_tier {
    type: string
    sql: ${TABLE}.plan_tier ;;
  }

  dimension: country {
    type: string
    sql: ${TABLE}.country ;;
  }

  dimension: is_active {
    type: yesno
    sql: ${TABLE}.is_active = 1 ;;
  }

  dimension_group: created {
    type: time
    timeframes: [date, week, month, year]
    sql: ${TABLE}.created_at ;;
    datatype: datetime
  }

  measure: count {
    type: count
  }

  measure: active_users {
    type: count
    filters: [is_active: "Yes"]
  }
}
```

## Writing the LookML Model

Define the explores and joins in the model file.

```text
# models/analytics.model.lkml

connection: "clickhouse_production"

include: "/views/*.view.lkml"

explore: orders {
  label: "Orders"
  description: "Order data with user dimensions"

  join: users {
    type: left_outer
    sql_on: ${orders.user_id} = ${users.user_id} ;;
    relationship: many_to_one
  }
}
```

## Creating a Persistent Derived Table (PDT)

Use a PDT for pre-aggregated data that powers heavy dashboards.

```text
# views/daily_revenue_summary.view.lkml

view: daily_revenue_summary {
  derived_table: {
    sql:
      SELECT
        toDate(created_at)                  AS date,
        country,
        channel,
        sum(total_amount)                   AS revenue,
        count()                             AS order_count,
        count(DISTINCT user_id)             AS unique_customers,
        avg(total_amount)                   AS avg_order_value
      FROM analytics.orders
      WHERE created_at >= now() - INTERVAL 90 DAY
      GROUP BY date, country, channel
    ;;
    persist_for: "1 hour"
  }

  dimension: date {
    type: date
    sql: ${TABLE}.date ;;
  }

  dimension: country {
    type: string
    sql: ${TABLE}.country ;;
  }

  dimension: channel {
    type: string
    sql: ${TABLE}.channel ;;
  }

  measure: total_revenue {
    type: sum
    sql: ${TABLE}.revenue ;;
    value_format_name: usd
  }

  measure: total_orders {
    type: sum
    sql: ${TABLE}.order_count ;;
  }
}
```

## ClickHouse-Specific LookML Optimizations

Tune LookML to generate efficient ClickHouse SQL.

```text
# Use toStartOfMonth for date grouping (faster than DATE_TRUNC in ClickHouse)
dimension_group: created {
  type: time
  sql: ${TABLE}.created_at ;;
  timeframes: [
    raw,
    date,
    week,
    month,
    quarter,
    year
  ]
  datatype: datetime
  convert_tz: no  # Disable tz conversion for ClickHouse DateTime
}

# Use LowCardinality hint in filter descriptions
dimension: status {
  type: string
  sql: ${TABLE}.status ;;
  suggest_explore: orders
  suggest_dimension: orders.status
}
```

## Summary

Looker connects to ClickHouse via JDBC using the ClickHouse dialect. Create a dedicated read-only Looker user, set up the connection in Looker Admin, and write LookML views that map to ClickHouse tables. Use `FINAL` in `sql_table_name` for ReplacingMergeTree tables to ensure deduplicated results. Persistent derived tables let you pre-aggregate expensive queries that refresh on a schedule. Disable timezone conversion with `convert_tz: no` to avoid unexpected behavior with ClickHouse DateTime columns.
