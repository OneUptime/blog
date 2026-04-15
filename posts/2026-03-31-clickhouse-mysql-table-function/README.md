# How to Use mysql() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Table Function, MySQL, SQL, Database, Integration, ETL

Description: Learn how to use the mysql() table function in ClickHouse to query MySQL tables directly from ClickHouse SQL, enabling live joins, data migration, and federated analytics.

---

The `mysql()` table function in ClickHouse creates a live connection to a MySQL database and exposes a MySQL table as a virtual ClickHouse table. You can query, filter, join, and insert into MySQL tables using standard ClickHouse SQL - no data copy required.

## What Is the mysql() Table Function?

`mysql()` uses the MySQL wire protocol to connect to a MySQL (or MariaDB) server and execute queries on your behalf. The query is partially pushed down to MySQL, and the results are returned to ClickHouse for any remaining processing.

```sql
SELECT *
FROM mysql('mysql-server.internal:3306', 'mydb', 'users', 'ch_reader', 'secret_pass')
LIMIT 10;
```

## Basic Syntax

```sql
mysql(host:port, database, table, user, password [, replace_query [, on_duplicate_clause]])
```

| Parameter           | Description |
|---------------------|-------------|
| `host:port`         | MySQL host and port (default port 3306) |
| `database`          | MySQL database name |
| `table`             | MySQL table name |
| `user`              | MySQL username |
| `password`          | MySQL password |
| `replace_query`     | If 1, use `REPLACE` instead of `INSERT` (for writes) |
| `on_duplicate_clause`| `ON DUPLICATE KEY UPDATE ...` clause (for writes) |

## Reading from MySQL

```sql
-- Basic read
SELECT
    user_id,
    username,
    email,
    created_at
FROM mysql('mysql.internal:3306', 'app_db', 'users', 'clickhouse', 'ch_pass')
WHERE created_at >= '2026-01-01'
ORDER BY created_at DESC
LIMIT 100;
```

## Joining ClickHouse and MySQL Data

This is the most powerful use case - enriching high-volume ClickHouse data with low-volume MySQL reference data:

```sql
-- Join ClickHouse events with MySQL user profiles
SELECT
    e.user_id,
    u.username,
    u.plan_tier,
    count()       AS event_count,
    max(e.ts)     AS last_seen
FROM events AS e
JOIN mysql('mysql.internal:3306', 'app_db', 'users', 'ch_reader', 'pass') AS u
    ON e.user_id = u.id
WHERE e.ts >= now() - INTERVAL 7 DAY
GROUP BY e.user_id, u.username, u.plan_tier
ORDER BY event_count DESC
LIMIT 50;
```

## Importing MySQL Data into ClickHouse

Pull an entire MySQL table into a ClickHouse MergeTree table for faster analytics:

```sql
CREATE TABLE orders_local
(
    order_id    UInt64,
    user_id     UInt64,
    product_id  UInt32,
    amount      Float64,
    status      LowCardinality(String),
    created_at  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, user_id);

INSERT INTO orders_local
SELECT
    order_id,
    user_id,
    product_id,
    amount,
    status,
    created_at
FROM mysql('mysql.internal:3306', 'ecommerce', 'orders', 'importer', 'import_pass')
WHERE created_at >= '2025-01-01';
```

## Incremental Sync from MySQL

For ongoing sync, use a high-watermark approach:

```sql
-- Find the latest record already imported
SELECT max(created_at) AS last_sync FROM orders_local;

-- Then import new records from MySQL
INSERT INTO orders_local
SELECT *
FROM mysql('mysql.internal:3306', 'ecommerce', 'orders', 'importer', 'pass')
WHERE created_at > (SELECT max(created_at) FROM orders_local);
```

## Writing Back to MySQL

`INSERT INTO FUNCTION mysql(...)` writes ClickHouse query results into a MySQL table:

```sql
-- Push daily aggregates from ClickHouse back to MySQL
INSERT INTO FUNCTION mysql('mysql.internal:3306', 'reporting', 'daily_summaries', 'writer', 'write_pass')
SELECT
    toDate(ts)         AS report_date,
    product_category   AS category,
    count()            AS total_events,
    sum(revenue)       AS total_revenue
FROM events
WHERE toDate(ts) = yesterday()
GROUP BY report_date, category;
```

## Type Mapping: MySQL to ClickHouse

ClickHouse automatically maps MySQL types to ClickHouse types:

| MySQL Type | ClickHouse Type |
|---|---|
| `INT`, `INTEGER` | `Int32` |
| `BIGINT` | `Int64` |
| `FLOAT` | `Float32` |
| `DOUBLE` | `Float64` |
| `DECIMAL(p, s)` | `Decimal(p, s)` |
| `VARCHAR`, `TEXT` | `String` |
| `DATETIME` | `DateTime` |
| `DATE` | `Date` |
| `TINYINT` | `Int8` |
| `UNSIGNED TINYINT` | `UInt8` |

## Filtering and Predicate Pushdown

ClickHouse pushes `WHERE` conditions down to MySQL when possible, so MySQL does the filtering and only matching rows are transferred:

```sql
-- This WHERE clause is sent to MySQL; only matching rows cross the network
SELECT order_id, amount
FROM mysql('mysql.internal:3306', 'ecommerce', 'orders', 'reader', 'pass')
WHERE status = 'pending' AND created_at >= '2026-03-01';
```

## Using Named Collections for Credentials

Instead of hardcoding credentials in each query, define a named collection in `config.xml`:

```xml
<named_collections>
    <mysql_ecommerce>
        <host>mysql.internal</host>
        <port>3306</port>
        <user>ch_reader</user>
        <password>secure_pass</password>
        <database>ecommerce</database>
    </mysql_ecommerce>
</named_collections>
```

Then use the collection name:

```sql
SELECT count()
FROM mysql(mysql_ecommerce, table='orders');
```

## Handling Large MySQL Tables

For large tables, always filter by an indexed MySQL column to avoid full table scans on the MySQL side:

```sql
-- Good: uses MySQL index on created_at
SELECT count()
FROM mysql('mysql.internal:3306', 'db', 'orders', 'reader', 'pass')
WHERE created_at >= '2026-01-01' AND created_at < '2026-04-01';

-- Bad: full scan
SELECT count()
FROM mysql('mysql.internal:3306', 'db', 'orders', 'reader', 'pass')
WHERE lower(status) = 'active';
```

## Verifying MySQL Connectivity

Test the connection before building complex queries:

```sql
SELECT 1
FROM mysql('mysql.internal:3306', 'information_schema', 'tables', 'reader', 'pass')
LIMIT 1;
```

## MySQL User Permissions Required

The MySQL user needs only the permissions appropriate to the operation:

```sql
-- On MySQL: create user and grant read access
CREATE USER IF NOT EXISTS 'ch_reader'@'%' IDENTIFIED BY 'pass';
GRANT SELECT ON ecommerce.* TO 'ch_reader'@'%';

-- For writes
CREATE USER IF NOT EXISTS 'ch_writer'@'%' IDENTIFIED BY 'write_pass';
GRANT SELECT, INSERT ON reporting.* TO 'ch_writer'@'%';
```

## Summary

The `mysql()` table function makes ClickHouse a first-class citizen in MySQL-centric environments. Key points:

- Query MySQL tables with standard ClickHouse SQL.
- Join MySQL reference data with large ClickHouse fact tables.
- Import MySQL data into MergeTree tables for analytics performance.
- Write aggregated results back to MySQL for application consumption.
- Use named collections to avoid embedding credentials in queries.
- Push filters via `WHERE` clauses to minimize data transferred from MySQL.
