# How to Query MySQL Tables Directly from ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MySQL, MySQL Table Function, Federation, Integration, Query

Description: Query MySQL tables directly from ClickHouse using the MySQL table function and MySQL engine for federated queries and data joins.

---

ClickHouse can query MySQL tables directly without data replication using the `mysql` table function and `MySQL` table engine. This enables federated queries that join ClickHouse analytics data with MySQL operational data.

## Using the MySQL Table Function

The `mysql` table function executes a query on a remote MySQL server and returns the result:

```sql
SELECT *
FROM mysql(
    'mysql-host:3306',
    'myapp_db',
    'customers',
    'clickhouse_user',
    'secret'
)
WHERE country = 'US'
LIMIT 100;
```

## Create a Persistent MySQL Engine Table

The `MySQL` engine creates a table that proxies queries to MySQL:

```sql
CREATE TABLE mysql_customers
(
    id UInt32,
    name String,
    email String,
    country String,
    created_at DateTime
)
ENGINE = MySQL('mysql-host:3306', 'myapp_db', 'customers', 'clickhouse_user', 'secret');
```

Query it like a local table:

```sql
SELECT country, count() AS customer_count
FROM mysql_customers
GROUP BY country
ORDER BY customer_count DESC;
```

## Federated Joins

Join ClickHouse analytics with MySQL operational data:

```sql
SELECT
    c.country,
    c.name AS customer_name,
    sum(e.revenue) AS total_revenue
FROM events e
JOIN mysql_customers c ON e.user_id = c.id
WHERE e.event_date >= today() - 30
GROUP BY c.country, c.name
ORDER BY total_revenue DESC
LIMIT 50;
```

For best performance, ensure the MySQL side returns a small result set.

## Read-Write Support

The MySQL engine supports SELECT and INSERT operations. You can insert data into MySQL from ClickHouse:

```sql
-- Insert into MySQL from ClickHouse
INSERT INTO mysql_customers (name, email, country)
VALUES ('Jane Doe', 'jane@example.com', 'UK');
```

UPDATE and DELETE are not supported through the MySQL engine. To modify or delete rows, execute those statements directly on your MySQL server.

## Push Predicates to MySQL

ClickHouse pushes WHERE clauses to MySQL when possible. Avoid fetching large tables and filtering locally:

```sql
-- Good: filter pushed to MySQL
SELECT * FROM mysql_customers WHERE country = 'US';

-- Avoid: fetches all rows then filters in ClickHouse
SELECT * FROM mysql_customers WHERE lower(country) = 'us';
```

## Connection Pooling

For high-concurrency workloads, configure connection limits:

```sql
CREATE TABLE mysql_customers
ENGINE = MySQL('mysql-host:3306', 'myapp_db', 'customers', 'clickhouse_user', 'secret')
SETTINGS connection_pool_size = 16;
```

## Using Named Collections

```sql
CREATE NAMED COLLECTION mysql_conn AS
    host = 'mysql-host',
    port = 3306,
    database = 'myapp_db',
    user = 'clickhouse_user',
    password = 'secret';

SELECT * FROM mysql(mysql_conn, table='customers') LIMIT 10;
```

## Summary

ClickHouse's MySQL engine and table function enable federated queries on MySQL without data replication. Use `MySQL` engine tables for frequently queried tables, push predicates for efficiency, and join with local ClickHouse data for hybrid analytics. For real-time replication with better performance, switch to `MaterializedMySQL`.
