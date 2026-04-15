# How to Use ClickHouse with Tableau

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Tableau, Business Intelligence, Analytics, Visualization

Description: Learn how to connect Tableau Desktop and Tableau Server to ClickHouse using the JDBC connector, create extracts, build visualizations, and publish to Tableau Server.

---

> Tableau connects to ClickHouse via the JDBC connector and enables drag-and-drop analytics on billions of rows with live or extracted connections.

Tableau is the industry-leading BI platform for visual analytics. Using the ClickHouse JDBC driver, Tableau Desktop and Tableau Server can connect to ClickHouse for both live queries and extract-based analytics. This guide covers driver setup, connection configuration, live vs. extract trade-offs, and building effective Tableau workbooks on ClickHouse data.

---

## Installing the JDBC Driver

Download and install the ClickHouse JDBC driver for Tableau.

```bash
# Download the ClickHouse JDBC driver (all-in-one JAR)
curl -L \
  https://github.com/ClickHouse/clickhouse-java/releases/download/v0.6.3/clickhouse-jdbc-0.6.3-all.jar \
  -o clickhouse-jdbc-0.6.3-all.jar

# macOS: Copy to Tableau's JDBC drivers directory
mkdir -p ~/Library/Tableau/Drivers
cp clickhouse-jdbc-0.6.3-all.jar ~/Library/Tableau/Drivers/

# Windows: Copy to the Tableau JDBC drivers directory
# Copy to: C:\Program Files\Tableau\Drivers\

# Linux (Tableau Server):
# Copy to: /opt/tableau/tableau_driver/jdbc/
```

## Configuring the Tableau Connector

Connect Tableau Desktop to ClickHouse.

```text
Tableau Desktop:
  Connect -> More... -> Other Databases (JDBC)

  URL:     jdbc:ch://localhost:8123/default
  Dialect: MySQL (select as closest compatible dialect)
  Username: tableau_user
  Password: tableau_password

  Advanced:
    Additional URL parameters: ?compress=true&socket_timeout=300000

  Test Connection -> Connect
```

## Creating a Tableau User in ClickHouse

Set up a dedicated user with appropriate permissions.

```sql
-- Create the Tableau user
CREATE USER tableau_user
IDENTIFIED WITH plaintext_password BY 'tableau_password'
HOST ANY;

-- Grant SELECT on analytical tables
GRANT SELECT ON analytics.* TO tableau_user;

-- Apply performance guardrails
CREATE SETTINGS PROFILE tableau_profile
    SETTINGS
        max_execution_time        = 120,
        max_rows_to_read          = 500000000,
        use_query_cache           = 1,
        query_cache_ttl           = 300,
        max_memory_usage          = 8000000000;

ALTER USER tableau_user SETTINGS PROFILE tableau_profile;
```

## Creating Tableau-Friendly Tables

Design tables that work well with Tableau's query patterns.

```sql
CREATE TABLE analytics.sales
(
    order_id      UUID,
    order_date    Date,
    ship_date     Nullable(Date),
    customer_id   UInt64,
    customer_name String,
    segment       LowCardinality(String),
    country       LowCardinality(String),
    region        LowCardinality(String),
    city          String,
    category      LowCardinality(String),
    sub_category  LowCardinality(String),
    product_name  String,
    sales         Float64,
    quantity      UInt32,
    discount      Float32,
    profit        Float64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(order_date)
ORDER BY (segment, country, order_date, customer_id);

-- Populate with sample data
INSERT INTO analytics.sales
SELECT
    generateUUIDv4()                                              AS order_id,
    today() - (number % 1460)                                     AS order_date,
    today() - (number % 1460) + (rand() % 14)                    AS ship_date,
    number % 5000                                                 AS customer_id,
    concat('Customer-', toString(number % 5000))                  AS customer_name,
    ['Consumer','Corporate','Home Office'][1 + number % 3]        AS segment,
    ['US','UK','Germany','France','Canada'][1 + number % 5]       AS country,
    ['East','West','Central','North'][1 + number % 4]             AS region,
    concat('City-', toString(number % 200))                       AS city,
    ['Technology','Furniture','Office Supplies'][1 + number % 3]  AS category,
    ['Phones','Chairs','Paper','Binders'][1 + number % 4]         AS sub_category,
    concat('Product-', toString(number % 500))                    AS product_name,
    round(randCanonical() * 2000, 2)                              AS sales,
    (rand() % 10) + 1                                             AS quantity,
    round(randCanonical() * 0.5, 2)                               AS discount,
    round((randCanonical() * 2000 - 200), 2)                      AS profit
FROM numbers(500000);
```

## Live vs. Extract Connection

Understand the trade-offs for ClickHouse-backed Tableau workbooks.

```text
Live Connection:
  - Queries run directly against ClickHouse
  - Always shows current data
  - Suitable when ClickHouse query latency is < 3 seconds
  - Use aggregated ClickHouse tables (SummingMergeTree) for speed

Extract (.hyper file):
  - Data copied from ClickHouse into a Tableau hyper file
  - Fastest for complex vizzes and offline use
  - Schedule daily extracts for reporting workbooks
  - Full refresh or incremental based on a date field

Recommendation:
  - Use Live for operational dashboards querying aggregated ClickHouse tables
  - Use Extract for ad-hoc analysis and complex workbooks
```

## Custom SQL for Tableau Data Sources

Use Tableau's Custom SQL to push down ClickHouse-specific functions.

```sql
-- Custom SQL for a pre-aggregated data source
SELECT
    toStartOfMonth(order_date)  AS order_month,
    country,
    region,
    segment,
    category,
    sum(sales)                  AS total_sales,
    sum(profit)                 AS total_profit,
    sum(quantity)               AS total_units,
    count(DISTINCT customer_id) AS unique_customers,
    count()                     AS order_count
FROM analytics.sales
WHERE order_date >= toDate('2023-01-01')
GROUP BY
    order_month, country, region, segment, category
ORDER BY order_month
```

## Initial SQL for Session Settings

Set ClickHouse session settings through Tableau's Initial SQL.

```sql
-- Tableau Desktop -> Data Source -> Initial SQL
SET max_execution_time = 60;
SET use_query_cache    = 1;
SET query_cache_ttl    = 300;
```

## Optimizing Extracts

Configure incremental refresh for large ClickHouse tables.

```text
Tableau Desktop -> Data Source -> Extract

Filters:
  Add -> order_date -> Relative Date -> Last 2 Years

Aggregation:
  Aggregate data using visible dimensions (enabled)
  Roll up dates to: Month

Incremental Refresh:
  Identify new rows using: order_date
  Last Updated: [automatic]

Schedule on Tableau Server:
  Daily at 2:00 AM
```

## Publishing to Tableau Server

Publish the workbook and keep the connection live.

```bash
# Publish via Tableau Server REST API
tabcmd login \
  --server https://tableau-server.example.com \
  --username admin \
  --password admin_pass

# Publish workbook with embedded credentials
tabcmd publish \
  "ClickHouse Analytics.twbx" \
  --project "Analytics" \
  --db-username tableau_user \
  --db-password tableau_password \
  --save-db-password
```

## Summary

Tableau connects to ClickHouse via the JDBC driver placed in Tableau's drivers directory. Use a live connection for pre-aggregated ClickHouse tables where query latency is low. Use Tableau Extracts for complex workbooks that require fast local rendering. Custom SQL lets you push ClickHouse-specific aggregations and functions before Tableau processes the result. Set ClickHouse resource limits through a settings profile and configure session settings via Tableau's Initial SQL to prevent runaway queries on shared clusters.
