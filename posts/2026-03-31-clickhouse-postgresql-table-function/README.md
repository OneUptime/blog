# How to Use postgresql() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Table Function, PostgreSQL, Federation, Integration

Description: Learn how to use the postgresql() table function in ClickHouse to query PostgreSQL tables directly from ClickHouse SQL without setting up a permanent external table engine.

---

The `postgresql()` table function in ClickHouse lets you run ad hoc queries against PostgreSQL tables directly from ClickHouse SQL. Unlike the PostgreSQL table engine which creates a persistent table definition, `postgresql()` is used inline in a query and is ideal for one-time lookups, data migrations, and federated queries that combine ClickHouse analytics with live PostgreSQL data.

## How the postgresql() Table Function Works

```mermaid
graph LR
    A[ClickHouse Query] -->|postgresql()| B[PostgreSQL Server]
    B --> C[Result Rows]
    C --> A
```

ClickHouse connects to PostgreSQL using the PostgreSQL wire protocol, sends a `SELECT` query to the PostgreSQL side, and streams the result back. Simple `WHERE` conditions (`=`, `!=`, `>`, `>=`, `<`, `<=`, `IN`) are pushed down to PostgreSQL. Joins, aggregations, sorting, and `LIMIT` are executed in ClickHouse after the remote query finishes.

## Syntax

```sql
postgresql('host:port', 'database', 'table', 'user', 'password')
postgresql('host:port', 'database', 'table', 'user', 'password', 'schema')
```

Parameters:
- `host:port` - PostgreSQL server address (default port 5432)
- `database` - PostgreSQL database name
- `table` - table or view name in PostgreSQL
- `user` / `password` - PostgreSQL credentials
- `schema` - optional schema name (default: public)

## Basic Usage

### Simple SELECT from PostgreSQL

```sql
SELECT *
FROM postgresql('postgres-server:5432', 'mydb', 'users', 'reader', 'secret')
LIMIT 10;
```

### Aggregating Remote Data

```sql
SELECT
    status,
    count()  AS order_count,
    sum(total_amount) AS revenue
FROM postgresql('pg-host:5432', 'ecommerce', 'orders', 'analyst', 'pass123')
WHERE created_at >= '2026-01-01'
GROUP BY status
ORDER BY revenue DESC;
```

### Using a Custom Schema

```sql
SELECT *
FROM postgresql('pg-host:5432', 'analytics', 'fact_sales', 'user', 'pass', 'reporting')
LIMIT 100;
```

## Complete Working Example

This example demonstrates the full pattern: querying PostgreSQL data from ClickHouse and joining it with local ClickHouse data for enrichment.

```sql
-- Assume PostgreSQL has a 'customers' table:
-- CREATE TABLE customers (id INT, name TEXT, country TEXT, tier TEXT);

-- Assume ClickHouse has an 'events' table with user activity:
CREATE TABLE events
(
    event_id   UInt64,
    user_id    UInt32,
    event_type String,
    event_time DateTime
)
ENGINE = MergeTree()
ORDER BY (event_time, user_id);

INSERT INTO events VALUES
    (1, 101, 'login',    '2026-03-28 10:00:00'),
    (2, 102, 'purchase', '2026-03-28 10:05:00'),
    (3, 101, 'logout',   '2026-03-28 10:30:00'),
    (4, 103, 'login',    '2026-03-29 09:00:00');

-- Join ClickHouse events with PostgreSQL customer data
SELECT
    e.user_id,
    pg.name         AS customer_name,
    pg.tier         AS customer_tier,
    count()         AS event_count
FROM events AS e
JOIN (
    SELECT id, name, tier
    FROM postgresql('pg-host:5432', 'ecommerce', 'customers', 'user', 'pass')
) AS pg ON e.user_id = pg.id
GROUP BY e.user_id, pg.name, pg.tier
ORDER BY event_count DESC;
```

## Migrating Data from PostgreSQL to ClickHouse

The `postgresql()` table function combined with `INSERT INTO ... SELECT` is the standard pattern for one-time data migrations.

```sql
-- Create the target table in ClickHouse
CREATE TABLE products
(
    product_id   UInt32,
    name         String,
    category     String,
    price        Float64,
    created_date Date
)
ENGINE = MergeTree()
ORDER BY (category, product_id);

-- Copy all rows from PostgreSQL
INSERT INTO products
SELECT
    id,
    name,
    category,
    price,
    created_at::date
FROM postgresql('pg-source:5432', 'inventory', 'products', 'migrator', 'migpass');
```

## Incremental Sync Pattern

For regularly refreshing a ClickHouse table with changes from PostgreSQL:

```sql
-- Insert only rows updated in the last hour
INSERT INTO clickhouse_orders
SELECT *
FROM postgresql('pg-host:5432', 'sales', 'orders', 'sync_user', 'sync_pass')
WHERE updated_at >= now() - INTERVAL 1 HOUR;
```

## Type Mapping

ClickHouse maps PostgreSQL types to ClickHouse types automatically for common types:

```text
PostgreSQL Type  | ClickHouse Type
-----------------+------------------
INT / INTEGER    | Int32
BIGINT           | Int64
SMALLINT         | Int16
FLOAT / REAL     | Float32
DOUBLE PRECISION | Float64
TEXT / VARCHAR   | String
BOOLEAN          | UInt8
DATE             | Date
TIMESTAMP        | DateTime
NUMERIC          | Decimal
UUID             | UUID
```

## Performance Tips

- Add `WHERE` clauses to push filtering to PostgreSQL and reduce data transferred.
- For large tables, use `LIMIT` or partition-based filters to avoid scanning the whole table.
- Avoid calling `postgresql()` in high-frequency queries; create a ReplacingMergeTree or use the PostgreSQL table engine for persistent access patterns.
- Use named collections to avoid embedding credentials in queries:

```sql
-- Using a named collection (defined in config)
SELECT *
FROM postgresql(my_pg_collection, table='customers');
```

## Difference Between postgresql() Function and PostgreSQL Engine

```text
Feature              | postgresql() function       | PostgreSQL engine
---------------------+-----------------------------+--------------------
Setup required       | None                        | CREATE TABLE needed
Use case             | Ad hoc, one-time queries    | Persistent reads
Credentials in query | Yes (or named collection)   | In DDL / config
Materialization      | On every query              | On every query
Best for             | Migrations, joins           | Dashboards, lookups
```

## Summary

The `postgresql()` table function in ClickHouse provides a simple way to run ad hoc queries against PostgreSQL tables without permanent table definitions. It is ideal for data migrations using `INSERT INTO ... SELECT`, federated joins between ClickHouse analytics data and PostgreSQL operational data, and exploratory queries during data engineering. For production workloads with repeated access patterns, use the PostgreSQL table engine or materialize the data into ClickHouse for better performance.
