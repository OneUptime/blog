# How to Use PostgreSQL Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PostgreSQL, Storage Engine, Integration, Federation

Description: Learn how to use the PostgreSQL table engine in ClickHouse to query PostgreSQL tables directly, perform federated joins, and replicate data into local MergeTree tables.

---

The `PostgreSQL` table engine creates a ClickHouse table that proxies reads and writes to a remote PostgreSQL database. ClickHouse pushes simple `WHERE` clauses (using `=`, `!=`, `>`, `>=`, `<`, `<=`, and `IN` operators) down to PostgreSQL, and streams results back. This enables federated analytics that combine PostgreSQL transactional data with ClickHouse analytical data without a separate ETL pipeline. For performance-critical workloads, you can also use it as an ETL source to pull data into local MergeTree tables.

## Creating a PostgreSQL Engine Table

```sql
-- Syntax: PostgreSQL('host:port', 'database', 'table', 'user', 'password'[, 'schema'])
CREATE TABLE pg_orders
(
    order_id     UInt64,
    customer_id  UInt64,
    status       String,
    total_amount Decimal(12, 2),
    created_at   DateTime,
    updated_at   DateTime
)
ENGINE = PostgreSQL(
    'pg-host:5432',
    'ecommerce',
    'orders',
    'ch_reader',
    'secret_password'
);
```

## Specifying a Non-Default Schema

PostgreSQL tables can live in schemas other than `public`. Pass the schema name as the sixth argument.

```sql
CREATE TABLE pg_audit_logs
(
    log_id      UInt64,
    table_name  String,
    action      String,
    performed_by String,
    performed_at DateTime,
    old_values  String,
    new_values  String
)
ENGINE = PostgreSQL(
    'pg-host:5432',
    'ecommerce',
    'audit_logs',
    'ch_reader',
    'secret_password',
    'audit_schema'   -- non-default schema
);
```

## Basic Query Through the PostgreSQL Engine

```sql
SELECT
    order_id,
    customer_id,
    status,
    total_amount,
    created_at
FROM pg_orders
WHERE status = 'shipped'
  AND created_at >= now() - INTERVAL 7 DAY
ORDER BY created_at DESC
LIMIT 100;
```

ClickHouse translates compatible `WHERE` predicates into a PostgreSQL-compatible statement and pushes them down for execution on the PostgreSQL server. Note that `LIMIT`, `ORDER BY`, joins, and aggregations are executed on the ClickHouse side after results are returned from PostgreSQL.

## Federated JOIN: PostgreSQL + ClickHouse

```sql
-- PostgreSQL: operational customer table
CREATE TABLE pg_customers
(
    customer_id UInt64,
    full_name   String,
    email       String,
    country     LowCardinality(String),
    plan        LowCardinality(String),
    signup_date Date
)
ENGINE = PostgreSQL('pg-host:5432', 'ecommerce', 'customers', 'ch_reader', 'secret');

-- ClickHouse: analytical event table (local MergeTree)
-- Combine them in a single query
SELECT
    c.country,
    c.plan,
    count()               AS event_count,
    uniq(e.user_id)       AS unique_users,
    sum(e.revenue)        AS revenue
FROM events AS e                          -- local ClickHouse table
JOIN pg_customers AS c ON e.user_id = c.customer_id
WHERE e.event_date = yesterday()
GROUP BY c.country, c.plan
ORDER BY revenue DESC
LIMIT 20;
```

## ETL: Pulling PostgreSQL Data Into MergeTree

```sql
-- Local MergeTree destination
CREATE TABLE orders_local
(
    order_id     UInt64,
    customer_id  UInt64,
    status       LowCardinality(String),
    total_amount Decimal(12, 2),
    created_at   DateTime,
    updated_at   DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, customer_id);

-- Initial full load
INSERT INTO orders_local
SELECT * FROM pg_orders;

-- Incremental refresh based on updated_at
INSERT INTO orders_local
SELECT *
FROM pg_orders
WHERE updated_at > (SELECT max(updated_at) FROM orders_local);
```

## Writing Back to PostgreSQL

The PostgreSQL engine supports `INSERT` for writing rows back to the remote table.

```sql
INSERT INTO pg_orders VALUES
    (88001, 22001, 'pending', 299.99, now(), now());
```

ClickHouse translates this into a PostgreSQL `INSERT` statement. Note that `UPDATE` and `DELETE` are not supported through either the engine or the table function — only `SELECT` and `INSERT` operations are available. For mutations, execute them directly on the PostgreSQL server.

## Using the postgresql() Table Function

For one-off queries without a permanent table definition:

```sql
SELECT
    customer_id,
    full_name,
    signup_date
FROM postgresql(
    'pg-host:5432',
    'ecommerce',
    'customers',
    'ch_reader',
    'secret'
)
WHERE signup_date >= '2024-01-01'
ORDER BY signup_date DESC
LIMIT 10;
```

## Handling PostgreSQL Arrays and JSONB

PostgreSQL `ARRAY` columns are automatically mapped to ClickHouse `Array` types. PostgreSQL `JSONB` and `JSON` columns are read as `String` in ClickHouse. Use JSON extraction functions to parse JSONB data.

```sql
CREATE TABLE pg_products
(
    product_id  UInt64,
    name        String,
    tags        Array(String),   -- PostgreSQL: TEXT[], mapped to Array(String)
    attributes  String           -- PostgreSQL: JSONB, arrives as String
)
ENGINE = PostgreSQL('pg-host:5432', 'catalog', 'products', 'reader', 'pass');

-- Parse JSON attributes in ClickHouse
SELECT
    product_id,
    name,
    tags,
    JSONExtractString(attributes, 'color')  AS color,
    JSONExtractFloat(attributes, 'weight')  AS weight_kg
FROM pg_products
WHERE JSONExtractString(attributes, 'category') = 'electronics'
LIMIT 20;
```

Note that PostgreSQL arrays must have a consistent number of dimensions across all rows in the same column, and `Nullable(Array(...))` is not supported.

## Type Mapping Reference

```text
PostgreSQL Type      ClickHouse Type
INT2 / SMALLINT      Int16
INT4 / INTEGER       Int32
INT8 / BIGINT        Int64
SERIAL               UInt32
BIGSERIAL            UInt64
FLOAT4 / REAL        Float32
FLOAT8 / DOUBLE      Float64
NUMERIC/DECIMAL      Decimal(P, S)
BOOLEAN              UInt8
VARCHAR / TEXT       String
DATE                 Date32
TIMESTAMP            DateTime64(6)
TIMESTAMPTZ          DateTime64(6)
UUID                 UUID
JSONB / JSON         String
ARRAY                Array(T)
```

## Connection Pooling Settings

Connection pool settings for PostgreSQL are configured at the ClickHouse server level, not as engine-level `SETTINGS` in the `CREATE TABLE` statement. You can set them in a session or in the server configuration:

```sql
-- Server-level settings for PostgreSQL connections
SET postgresql_connection_pool_size = 16;
SET postgresql_connection_pool_wait_timeout = 5000;  -- milliseconds
SET postgresql_connection_pool_auto_close_connection = 0;

-- Then create the table normally
CREATE TABLE pg_events
(
    event_id   UInt64,
    event_type String,
    event_time DateTime64(6)
)
ENGINE = PostgreSQL(
    'pg-host:5432',
    'analytics',
    'events',
    'ch_reader',
    'secret'
);
```

## Limitations

- Full-table scans on large PostgreSQL tables are slow; push predicates via `WHERE` to minimize data transfer.
- Complex ClickHouse functions in `WHERE` do not push down to PostgreSQL.
- No parallel reads; PostgreSQL engine uses a single connection per query.
- No ClickHouse compression, partitioning, or indexing on remote data.
- Schema changes must be made on the PostgreSQL side first.

## Summary

The `PostgreSQL` engine provides transparent federated access to PostgreSQL tables from ClickHouse. Use it for operational joins, lightweight ETL pulls, and reference data lookups. For high-frequency analytical queries, copy the relevant PostgreSQL data into a local MergeTree table using incremental `INSERT ... SELECT` jobs to take full advantage of ClickHouse's columnar storage and parallel query execution.
