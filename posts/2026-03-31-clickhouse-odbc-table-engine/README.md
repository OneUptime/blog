# How to Use ODBC Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ODBC, Table Engine, Integration, PostgreSQL, MySQL, External Data

Description: Learn how to use the ClickHouse ODBC table engine to create a persistent table object backed by an external ODBC database for seamless cross-database SQL queries.

---

The ODBC table engine in ClickHouse creates a persistent named table that proxies queries to an external ODBC-compatible database. It differs from the `odbc()` table function in that it is a named, reusable object - once created, you query it like any other ClickHouse table.

## Prerequisites

Install `unixODBC` and the relevant ODBC driver:

```bash
sudo apt-get install unixodbc odbc-postgresql
```

Configure your DSN in `/etc/odbc.ini`:

```text
[pg_prod]
Driver   = PostgreSQL Unicode
Server   = pg-host
Port     = 5432
Database = mydb
Username = reader
Password  = secret
```

## Creating an ODBC Table

```sql
CREATE TABLE pg_customers (
    id         UInt64,
    name       String,
    email      String,
    country    String,
    plan       String
) ENGINE = ODBC('DSN=pg_prod;', 'public', 'customers');
```

The arguments are:
1. Connection string (DSN-based or driver string).
2. External database or schema name (e.g., `public` for PostgreSQL).
3. Table name in the remote database.

## Querying via the ODBC Table

```sql
SELECT country, count() AS customers
FROM pg_customers
GROUP BY country
ORDER BY customers DESC
LIMIT 10;
```

## Joining ODBC Table with ClickHouse Data

```sql
SELECT
    e.event_type,
    c.plan,
    count()       AS events,
    avg(e.value)  AS avg_value
FROM events AS e
LEFT JOIN pg_customers AS c ON e.user_id = c.id
WHERE e.event_time >= today() - 30
GROUP BY e.event_type, c.plan;
```

## Filtering and Pushdown

Simple WHERE clauses on the ODBC table may be pushed down to the remote database, similar to how other integration engines like MySQL and PostgreSQL handle predicate pushdown:

```sql
-- The filter may be pushed down so that only matching rows are returned
SELECT name, email
FROM pg_customers
WHERE plan = 'enterprise' AND country = 'US';
```

## MySQL ODBC Table

For MySQL, install the MySQL ODBC driver and configure:

```text
[mysql_prod]
Driver   = MySQL ODBC 8.0 Unicode Driver
Server   = mysql-host
Port     = 3306
Database = mydb
User     = reader
Password = secret
```

```sql
CREATE TABLE mysql_products (
    product_id  UInt32,
    name        String,
    price       Float64,
    category_id UInt16
) ENGINE = ODBC('DSN=mysql_prod;', 'mydb', 'products');
```

## Using ODBC Table for Data Migration

```sql
-- Bulk insert from ODBC source into ClickHouse native table
INSERT INTO ch_products (product_id, name, price, category_id)
SELECT product_id, name, price, category_id
FROM mysql_products
WHERE price > 0;
```

## Checking Available Columns

```sql
DESCRIBE TABLE pg_customers;
```

## Dropping the ODBC Table

```sql
DROP TABLE pg_customers;
```

This removes the ClickHouse table definition only; the remote database is unaffected.

## Summary

The ODBC table engine creates a reusable ClickHouse table that proxies to any ODBC-compatible external database. Configure a DSN in `odbc.ini`, create the table with ENGINE = ODBC, and query it like a native table. Use it for recurring cross-database joins and scheduled data migration pipelines. For one-off queries, the `odbc()` table function is more lightweight.
