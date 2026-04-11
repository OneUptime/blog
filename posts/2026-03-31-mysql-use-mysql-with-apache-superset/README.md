# How to Use MySQL with Apache Superset

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Apache Superset, Data Visualization

Description: Connect Apache Superset to MySQL using SQLAlchemy URI, configure a read-only database user, and build charts from MySQL datasets.

---

Apache Superset is an open-source data exploration platform. It connects to MySQL through a SQLAlchemy URI and provides a chart builder, SQL editor, and dashboard layer on top of your MySQL data.

## Prerequisites

Superset requires the `mysqlclient` or `pymysql` Python driver:

```bash
pip install mysqlclient
# or
pip install pymysql
```

## Creating a Read-Only User

```sql
CREATE USER 'superset_ro'@'%' IDENTIFIED BY 'readonlypassword';
GRANT SELECT ON analytics_db.* TO 'superset_ro'@'%';
FLUSH PRIVILEGES;
```

## SQLAlchemy URI Format

In Superset: Settings > Database Connections > + Database > MySQL.

SQLAlchemy URI:

```text
mysql+mysqldb://superset_ro:readonlypassword@127.0.0.1:3306/analytics_db
```

Or with pymysql:

```text
mysql+pymysql://superset_ro:readonlypassword@127.0.0.1:3306/analytics_db?charset=utf8mb4
```

## Configuring Extra Settings

In the advanced tab, set connection pool options:

```json
{
  "engine_params": {
    "pool_size": 5,
    "pool_recycle": 3600,
    "connect_args": {
      "connect_timeout": 10
    }
  }
}
```

## Writing a Virtual Dataset (SQL)

In Superset's SQL Lab, write a query and save it as a virtual dataset:

```sql
SELECT
    product_category,
    DATE_FORMAT(order_date, '%Y-%m') AS month,
    SUM(revenue)                      AS total_revenue,
    COUNT(DISTINCT customer_id)       AS unique_customers
FROM order_summary
WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY product_category, month;
```

Save as dataset "Monthly Revenue by Category" and build charts from it.

## Supporting Superset Jinja Templates

Superset supports Jinja templating in SQL Lab for parameterized queries:

```sql
SELECT *
FROM events
WHERE event_date BETWEEN '{{ from_dttm }}' AND '{{ to_dttm }}'
  AND event_type = '{{ filter_values("event_type")[0] }}'
LIMIT 1000;
```

## Adding Indexes for Chart Queries

```sql
-- Common Superset time-series pattern
ALTER TABLE order_summary ADD INDEX idx_order_date_category (order_date, product_category);

-- For GROUP BY on high-cardinality columns
ALTER TABLE events ADD INDEX idx_event_type_date (event_type, event_date);
```

## Row-Level Security

Superset supports row-level security filters per role. In Settings > Row Level Security, add a filter clause like `customer_id = {{ current_username() }}` to restrict data visibility per user.

## Summary

Apache Superset connects to MySQL via a SQLAlchemy URI using a read-only database account. Use `pymysql` or `mysqlclient` as the driver, configure pool recycling to handle idle timeouts, and add indexes on the date and dimension columns most commonly used in chart GROUP BY and WHERE clauses.
