# How to Use MySQL Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MySQL, Storage Engine, Integration, Federation

Description: Learn how to use the MySQL table engine in ClickHouse to query MySQL tables directly, join MySQL data with ClickHouse tables, and replicate data between systems.

---

The `MySQL` table engine creates a ClickHouse table that proxies reads and writes to a remote MySQL database table. Queries against a MySQL engine table are pushed down to MySQL where possible, and results are streamed back to ClickHouse. This enables federated queries that join MySQL operational data with ClickHouse analytical data, as well as ETL pipelines that pull from MySQL into local MergeTree tables.

## Creating a MySQL Engine Table

```sql
-- Syntax: MySQL('host:port', 'database', 'table', 'user', 'password')
CREATE TABLE mysql_orders
(
    order_id     UInt64,
    customer_id  UInt64,
    status       String,
    total_amount Decimal(10, 2),
    created_at   DateTime,
    updated_at   DateTime
)
ENGINE = MySQL('mysql-host:3306', 'ecommerce', 'orders', 'ch_reader', 'secret');
```

ClickHouse maps MySQL types to ClickHouse types. Verify that your declared types are compatible with the MySQL column types.

## Basic SELECT Through MySQL Engine

```sql
-- Read directly from MySQL
SELECT
    order_id,
    customer_id,
    status,
    total_amount,
    created_at
FROM mysql_orders
WHERE status = 'pending'
  AND created_at >= now() - INTERVAL 24 HOUR
ORDER BY created_at DESC
LIMIT 50;
```

The `WHERE` clause is pushed down to MySQL, so MySQL executes the filter before sending rows to ClickHouse.

## Joining MySQL Data With ClickHouse Data

```sql
-- MySQL table: customer profiles (operational store)
CREATE TABLE mysql_customers
(
    customer_id UInt64,
    full_name   String,
    email       String,
    country     String,
    tier        String
)
ENGINE = MySQL('mysql-host:3306', 'ecommerce', 'customers', 'ch_reader', 'secret');

-- ClickHouse table: event analytics (analytical store)
-- Already exists locally in MergeTree

-- Federated join: enrich analytics with MySQL profile data
SELECT
    e.event_date,
    c.country,
    c.tier,
    count()          AS event_count,
    uniq(e.user_id)  AS unique_users,
    sum(e.revenue)   AS total_revenue
FROM daily_event_summary AS e
JOIN mysql_customers AS c ON e.user_id = c.customer_id
WHERE e.event_date BETWEEN '2024-06-01' AND '2024-06-15'
GROUP BY e.event_date, c.country, c.tier
ORDER BY e.event_date DESC, total_revenue DESC;
```

## Replicating MySQL Data Into ClickHouse

For better query performance, copy MySQL data into a local MergeTree table.

```sql
-- Create local MergeTree copy
CREATE TABLE orders_local
(
    order_id     UInt64,
    customer_id  UInt64,
    status       LowCardinality(String),
    total_amount Decimal(10, 2),
    created_at   DateTime,
    updated_at   DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, customer_id);

-- Initial full load from MySQL
INSERT INTO orders_local
SELECT *
FROM mysql_orders;

-- Incremental refresh (run periodically)
INSERT INTO orders_local
SELECT *
FROM mysql_orders
WHERE updated_at > (SELECT max(updated_at) FROM orders_local);
```

## Using MySQL Engine With a WHERE Pushdown

ClickHouse pushes simple `WHERE` conditions down to MySQL. Complex ClickHouse-specific functions do not push down.

```sql
-- These predicates push down to MySQL (MySQL-compatible syntax)
SELECT order_id, total_amount
FROM mysql_orders
WHERE customer_id = 12345
  AND status IN ('pending', 'processing')
  AND created_at >= '2024-06-01';

-- This predicate does NOT push down (ClickHouse-specific function)
SELECT order_id, toDate(created_at) AS order_date
FROM mysql_orders
WHERE toYYYYMM(created_at) = 202406;
```

## Writing Back to MySQL

The MySQL engine supports `INSERT` statements that write back to the remote MySQL table.

```sql
-- Insert a row into the remote MySQL table
INSERT INTO mysql_orders VALUES
    (99001, 55001, 'pending', 149.99, now(), now());

-- ClickHouse does not support UPDATE or DELETE via the MySQL engine (only SELECT and INSERT)
-- Use MySQL directly for updates and deletes
```

## Using the MySQL Table Function

For one-off queries without creating a permanent table, use the `mysql()` table function.

```sql
-- Ad hoc query against MySQL without a permanent table definition
SELECT
    product_id,
    product_name,
    stock_quantity
FROM mysql('mysql-host:3306', 'ecommerce', 'products', 'ch_reader', 'secret')
WHERE stock_quantity < 10
ORDER BY stock_quantity;
```

## Type Mapping Reference

```sql
-- Create a MySQL engine table with diverse types to illustrate mapping
CREATE TABLE mysql_type_demo
(
    id           UInt32,        -- MySQL: INT UNSIGNED
    name         String,        -- MySQL: VARCHAR
    score        Float64,       -- MySQL: DOUBLE
    price        Decimal(8, 2), -- MySQL: DECIMAL(8,2)
    active       UInt8,         -- MySQL: TINYINT / BOOLEAN
    created_date Date,          -- MySQL: DATE
    created_ts   DateTime,      -- MySQL: DATETIME / TIMESTAMP
    tags         String         -- MySQL: TEXT / JSON (read as String)
)
ENGINE = MySQL('mysql-host:3306', 'demo', 'type_demo', 'reader', 'pass');
```

## Monitoring Query Execution

```sql
-- Check what queries ClickHouse sent to MySQL
SELECT
    query,
    elapsed,
    read_rows,
    read_bytes
FROM system.query_log
WHERE query LIKE '%mysql_orders%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;
```

## Limitations

- No ClickHouse-specific index or compression on the remote table.
- Complex ClickHouse functions in `WHERE` do not push down.
- Large full-table scans are slow because MySQL is not columnar.
- `ALTER TABLE` cannot change the remote MySQL schema.
- No support for MySQL stored procedures or triggers.

## Summary

The `MySQL` engine enables federated access to MySQL tables from ClickHouse. Use it for joining operational MySQL data with ClickHouse analytical tables, for lightweight ETL pulls, or for reading reference data. For repetitive analytical queries, copy the MySQL data into a local MergeTree table to avoid network round-trips and leverage ClickHouse's columnar performance.
