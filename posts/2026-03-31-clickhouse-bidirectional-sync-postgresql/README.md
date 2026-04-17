# How to Set Up Bidirectional Sync Between ClickHouse and PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PostgreSQL, Bidirectional Sync, Replication, Integration, Data Pipeline

Description: Set up bidirectional data sync between ClickHouse and PostgreSQL to share data in both directions without creating replication loops.

---

Bidirectional sync between ClickHouse and PostgreSQL enables each system to act as the authoritative source for different data sets. PostgreSQL handles transactional writes, while ClickHouse handles analytical aggregations that are written back to PostgreSQL for application use.

## Architecture

```text
PostgreSQL (writes) --> ClickHouse (analytics)
                                |
                                v
                  ClickHouse Aggregates --> PostgreSQL (read by application)
```

This is not true two-way replication of the same data, but a pattern where different data flows in each direction.

## Direction 1: PostgreSQL to ClickHouse (Real-Time Replication)

Use `MaterializedPostgreSQL` to sync transactional data:

```sql
CREATE DATABASE pg_live
ENGINE = MaterializedPostgreSQL('pg-host:5432', 'myapp', 'clickhouse_user', 'secret')
SETTINGS materialized_postgresql_schema = 'public';
```

Verify replication is working:

```sql
SELECT count() FROM pg_live.orders;
```

## Direction 2: ClickHouse Aggregates to PostgreSQL

Write ClickHouse analytical results back to PostgreSQL using the PostgreSQL engine:

```sql
-- Create a PostgreSQL engine table in ClickHouse
CREATE TABLE pg_daily_revenue
(
    report_date Date,
    country String,
    total_revenue Decimal(18, 4),
    order_count UInt32
)
ENGINE = PostgreSQL('pg-host:5432', 'myapp', 'daily_revenue_report', 'clickhouse_user', 'secret');

-- Insert aggregates from ClickHouse into PostgreSQL
INSERT INTO pg_daily_revenue
SELECT
    toDate(created_at) AS report_date,
    customer_country AS country,
    sum(total_amount) AS total_revenue,
    count() AS order_count
FROM pg_live.orders
WHERE toDate(created_at) = yesterday()
GROUP BY report_date, country;
```

Create the target table in PostgreSQL first:

```sql
-- PostgreSQL
CREATE TABLE daily_revenue_report (
    report_date DATE,
    country VARCHAR(100),
    total_revenue NUMERIC(18, 4),
    order_count INTEGER,
    PRIMARY KEY (report_date, country)
);
```

## Prevent Replication Loops

The key to bidirectional sync is ensuring that data written back to PostgreSQL does not trigger CDC events that re-replicate to ClickHouse. Use a separate schema or table prefix for ClickHouse-written data:

```sql
-- PostgreSQL schema for ClickHouse writes
CREATE SCHEMA clickhouse_reports;

CREATE TABLE clickhouse_reports.daily_revenue (
    report_date DATE,
    country VARCHAR(100),
    total_revenue NUMERIC(18, 4),
    order_count INTEGER
);

-- Exclude this schema from MaterializedPostgreSQL replication
CREATE DATABASE pg_live
ENGINE = MaterializedPostgreSQL('pg-host:5432', 'myapp', 'clickhouse_user', 'secret')
SETTINGS
    materialized_postgresql_schema = 'public',
    materialized_postgresql_tables_list = 'orders,customers,products';
```

## Schedule the Aggregation Job

Use a cron job or a refreshable materialized view to run the aggregation on a schedule:

```bash
#!/bin/bash
# Run nightly at 2 AM
clickhouse-client --query="
INSERT INTO pg_daily_revenue
SELECT
    toDate(created_at) AS report_date,
    customer_country AS country,
    sum(total_amount) AS total_revenue,
    count() AS order_count
FROM pg_live.orders
WHERE toDate(created_at) = yesterday()
GROUP BY report_date, country
"
```

## Monitor Both Directions

Verify the MaterializedPostgreSQL database is registered in ClickHouse:

```sql
SELECT name, engine FROM system.databases WHERE engine = 'MaterializedPostgreSQL';
```

Check PostgreSQL write success:

```sql
SELECT * FROM pg_daily_revenue
WHERE report_date = yesterday()
LIMIT 10;
```

## Summary

Bidirectional sync between ClickHouse and PostgreSQL works by using `MaterializedPostgreSQL` for the PostgreSQL-to-ClickHouse direction and the `PostgreSQL` engine for writing aggregates back to PostgreSQL. Avoid replication loops by excluding ClickHouse-written tables from the CDC replication configuration and scheduling aggregate writes as nightly jobs.
