# How to Use JDBC Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, JDBC, Table Engine, Integration, PostgreSQL, MySQL, External Data

Description: Learn how to use the ClickHouse JDBC table engine to create a persistent table object backed by an external JDBC database for seamless SQL integration.

---

The JDBC table engine in ClickHouse creates a permanent named table that proxies SQL queries to an external JDBC-compatible database - including PostgreSQL, MySQL, Oracle, and SQL Server. Unlike the `jdbc()` table function (which is ad hoc), the JDBC table engine persists as a named object and is reusable across sessions and materialized views.

## Prerequisites

The JDBC table engine requires the ClickHouse JDBC Bridge running as a separate process. By default it listens on port 9019:

```bash
java -jar clickhouse-jdbc-bridge-<version>-shaded.jar
```

Bridge server settings (listen host/port, threads, etc.) are configured via `config/httpd.json` and `config/vertx.json` rather than command-line flags.

Configure your data source as a JSON file under `config/datasources/`, for example `config/datasources/pg_prod.json`:

```text
{
  "pg_prod": {
    "driverClassName": "org.postgresql.Driver",
    "jdbcUrl": "jdbc:postgresql://pg-host:5432/mydb",
    "username": "reader",
    "password": "secret"
  }
}
```

## Creating a JDBC Table

```sql
CREATE TABLE pg_customers (
    id          UInt64,
    name        String,
    email       String,
    country     String,
    plan        String,
    created_at  DateTime
) ENGINE = JDBC('jdbc:postgresql://pg-host:5432/mydb', 'public', 'customers');
```

Or using the bridge datasource name:

```sql
CREATE TABLE pg_orders (
    order_id    UInt64,
    customer_id UInt64,
    amount      Float64,
    created_at  DateTime
) ENGINE = JDBC('pg_prod', 'public', 'orders');
```

## Querying via the JDBC Table

```sql
SELECT name, plan, count() AS cnt
FROM pg_customers
WHERE country = 'US'
GROUP BY name, plan
ORDER BY cnt DESC
LIMIT 10;
```

The query is pushed through the JDBC bridge to PostgreSQL.

## Joining JDBC Table with Native ClickHouse Table

```sql
SELECT
    e.event_type,
    c.plan,
    count() AS events
FROM events AS e
INNER JOIN pg_customers AS c ON e.user_id = c.id
WHERE e.event_time >= today() - 7
GROUP BY e.event_type, c.plan
ORDER BY events DESC;
```

## Pushing Filters to the Remote Database

ClickHouse pushes WHERE conditions to the JDBC engine, which translates them to the remote SQL dialect. Use precise filters to minimize data transfer:

```sql
-- This filter is pushed to PostgreSQL
SELECT * FROM pg_orders WHERE created_at >= '2026-03-01' LIMIT 100;
```

## Using JDBC Table in a Materialized View Pipeline

```sql
-- Sync last day of orders from PostgreSQL into ClickHouse nightly
INSERT INTO ch_orders
SELECT order_id, customer_id, amount, created_at
FROM pg_orders
WHERE toDate(created_at) = yesterday();
```

## Type Mapping

ClickHouse JDBC engine maps external types to ClickHouse types:

```text
PostgreSQL     ClickHouse
integer        Int32
bigint         Int64
varchar        String
timestamp      DateTime
numeric(p,s)   Decimal(p,s)
boolean        UInt8
```

## Dropping the JDBC Table

```sql
DROP TABLE pg_customers;
```

This only removes the ClickHouse table definition - no data is deleted in PostgreSQL.

## Summary

The JDBC table engine creates a persistent ClickHouse table backed by any JDBC-compatible database, enabling SQL joins between ClickHouse and external relational systems. It requires the ClickHouse JDBC Bridge sidecar. Use it for recurring cross-database joins or scheduled data sync pipelines. For one-off queries, the `jdbc()` table function is lighter weight.
