# How to Implement Cross-Database Queries in Cloud SQL PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, Cross-Database Queries, Foreign Data Wrappers

Description: Learn how to implement cross-database queries in Cloud SQL PostgreSQL using foreign data wrappers, dblink, and other techniques for querying data across multiple databases.

---

PostgreSQL, by design, does not let you query across databases within the same instance. Each database is an isolated namespace. This becomes a problem when your application has data spread across multiple databases and you need to join them, run reports that span databases, or migrate data between them. On Cloud SQL, you have several options for working around this limitation.

This guide covers the practical techniques for cross-database queries in Cloud SQL PostgreSQL, from the simplest approaches to more sophisticated setups.

## Understanding the Limitation

In PostgreSQL, a connection is always to a single database. You cannot write `SELECT * FROM other_database.schema.table` like you can in MySQL or SQL Server. This is a deliberate design choice that provides strong isolation between databases, but it means cross-database operations require extra setup.

The main approaches are dblink for ad-hoc cross-database queries, postgres_fdw (Foreign Data Wrapper) for persistent cross-database access, and application-level joins where you query each database separately and combine results in your code.

## Approach 1: Using dblink

dblink is the simplest way to query another database. It is a PostgreSQL extension that lets you run SQL against a remote database and return the results as a table.

### Enable the Extension

```sql
-- Connect to the database where you want to run cross-database queries
-- Enable the dblink extension
CREATE EXTENSION IF NOT EXISTS dblink;
```

### Basic Cross-Database Query

```sql
-- Query a table in another database on the same Cloud SQL instance
-- The connection string points to the other database
SELECT *
FROM dblink(
    'host=localhost dbname=other_database user=postgres password=YOUR_PASSWORD',
    'SELECT id, name, email FROM users WHERE active = true'
) AS remote_users(
    id INTEGER,
    name TEXT,
    email TEXT
);
```

### Joining Data Across Databases

```sql
-- Join local orders table with users from another database
SELECT
    o.order_id,
    o.order_date,
    o.total_amount,
    u.name AS customer_name,
    u.email AS customer_email
FROM orders o
JOIN dblink(
    'host=localhost dbname=customers_db user=postgres password=YOUR_PASSWORD',
    'SELECT id, name, email FROM users'
) AS u(id INTEGER, name TEXT, email TEXT)
ON o.customer_id = u.id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days';
```

### Persistent dblink Connections

For repeated queries, use a persistent named connection instead of reconnecting each time.

```sql
-- Open a named connection (stays open for the session)
SELECT dblink_connect('customers_conn',
    'host=localhost dbname=customers_db user=postgres password=YOUR_PASSWORD'
);

-- Use the named connection for queries
SELECT *
FROM dblink('customers_conn',
    'SELECT id, name, email FROM users WHERE active = true'
) AS users(id INTEGER, name TEXT, email TEXT);

-- Run multiple queries on the same connection
SELECT *
FROM dblink('customers_conn',
    'SELECT user_id, SUM(amount) as total FROM purchases GROUP BY user_id'
) AS purchases(user_id INTEGER, total NUMERIC);

-- Close the connection when done
SELECT dblink_disconnect('customers_conn');
```

## Approach 2: Using postgres_fdw (Foreign Data Wrapper)

postgres_fdw is the more robust approach. It creates permanent mappings between local and remote tables, making cross-database queries feel like querying local tables.

### Set Up the Foreign Server

```sql
-- Enable the foreign data wrapper extension
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Create a foreign server pointing to the other database
-- For same-instance cross-database access, use localhost
CREATE SERVER customers_server
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'localhost',
    dbname 'customers_db',
    port '5432'
);

-- Create a user mapping that maps local users to remote credentials
CREATE USER MAPPING FOR postgres
SERVER customers_server
OPTIONS (
    user 'postgres',
    password 'YOUR_PASSWORD'
);
```

### Import Foreign Tables

```sql
-- Option 1: Import specific tables
CREATE FOREIGN TABLE remote_users (
    id INTEGER,
    name TEXT,
    email TEXT,
    active BOOLEAN,
    created_at TIMESTAMP
)
SERVER customers_server
OPTIONS (
    schema_name 'public',
    table_name 'users'
);

-- Option 2: Import an entire schema at once (much more convenient)
CREATE SCHEMA IF NOT EXISTS remote_customers;

IMPORT FOREIGN SCHEMA public
FROM SERVER customers_server
INTO remote_customers;
-- This imports ALL tables from the remote public schema
```

### Query Foreign Tables Like Local Tables

```sql
-- Now you can query the foreign tables directly
SELECT * FROM remote_users WHERE active = true;

-- Join with local tables seamlessly
SELECT
    o.order_id,
    o.order_date,
    o.total_amount,
    ru.name AS customer_name,
    ru.email AS customer_email
FROM orders o
JOIN remote_users ru ON o.customer_id = ru.id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY o.order_date DESC;

-- Aggregate across databases
SELECT
    ru.name AS customer,
    COUNT(o.order_id) AS order_count,
    SUM(o.total_amount) AS total_spent
FROM orders o
JOIN remote_users ru ON o.customer_id = ru.id
GROUP BY ru.name
ORDER BY total_spent DESC
LIMIT 20;
```

### Cross-Database Query for Cloud SQL Instances

For querying across different Cloud SQL instances (not just databases), use the instance's private IP.

```sql
-- Connect to a different Cloud SQL instance
CREATE SERVER analytics_server
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host '10.0.0.5',  -- Private IP of the other Cloud SQL instance
    dbname 'analytics',
    port '5432'
);

CREATE USER MAPPING FOR postgres
SERVER analytics_server
OPTIONS (
    user 'analytics_reader',
    password 'READER_PASSWORD'
);

-- Import tables from the remote instance
IMPORT FOREIGN SCHEMA public
FROM SERVER analytics_server
INTO remote_analytics;
```

## Approach 3: Using Materialized Views for Performance

Foreign data wrapper queries can be slow for large tables because they fetch data over the network on every query. Use materialized views to cache frequently accessed remote data locally.

```sql
-- Create a materialized view that caches remote data locally
CREATE MATERIALIZED VIEW cached_customers AS
SELECT
    id,
    name,
    email,
    active,
    created_at
FROM remote_users
WHERE active = true;

-- Create an index on the materialized view for fast lookups
CREATE INDEX idx_cached_customers_id ON cached_customers(id);

-- Use the cached data for joins (much faster)
SELECT
    o.order_id,
    c.name AS customer_name,
    o.total_amount
FROM orders o
JOIN cached_customers c ON o.customer_id = c.id;

-- Refresh the cache periodically
-- You can automate this with pg_cron
REFRESH MATERIALIZED VIEW CONCURRENTLY cached_customers;
```

### Automate Cache Refresh with pg_cron

```sql
-- Enable pg_cron extension (supported on Cloud SQL)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Refresh the materialized view every hour
SELECT cron.schedule(
    'refresh-customers-cache',
    '0 * * * *',  -- Every hour
    'REFRESH MATERIALIZED VIEW CONCURRENTLY cached_customers'
);

-- Check scheduled jobs
SELECT * FROM cron.job;
```

## Approach 4: Application-Level Cross-Database Queries

Sometimes the cleanest approach is to handle cross-database queries in your application code.

```python
import asyncpg
import asyncio

async def cross_database_query():
    """Query multiple databases and join results in Python."""
    # Connect to both databases concurrently
    orders_conn = await asyncpg.connect(
        host='CLOUD_SQL_IP',
        database='orders_db',
        user='postgres',
        password='PASSWORD',
    )
    customers_conn = await asyncpg.connect(
        host='CLOUD_SQL_IP',
        database='customers_db',
        user='postgres',
        password='PASSWORD',
    )

    # Run both queries concurrently
    orders_task = orders_conn.fetch(
        "SELECT order_id, customer_id, total_amount, order_date "
        "FROM orders WHERE order_date >= $1",
        datetime.date.today() - datetime.timedelta(days=30),
    )
    customers_task = customers_conn.fetch(
        "SELECT id, name, email FROM users WHERE active = true"
    )

    orders, customers = await asyncio.gather(orders_task, customers_task)

    # Build a lookup dictionary for customers
    customer_map = {c['id']: c for c in customers}

    # Join in application code
    results = []
    for order in orders:
        customer = customer_map.get(order['customer_id'])
        if customer:
            results.append({
                'order_id': order['order_id'],
                'customer_name': customer['name'],
                'total_amount': order['total_amount'],
                'order_date': order['order_date'],
            })

    # Close connections
    await orders_conn.close()
    await customers_conn.close()

    return results
```

## Security Considerations

When using cross-database queries, keep security in mind. Create dedicated read-only users for foreign data wrapper connections rather than using the superuser. Store passwords in Secret Manager rather than hardcoding them. Use Cloud SQL's private IP networking to keep cross-instance traffic within your VPC. Limit which tables are imported through foreign schemas to only those actually needed.

```sql
-- Create a read-only user on the remote database
-- Run this on the customers_db database
CREATE ROLE fdw_reader WITH LOGIN PASSWORD 'SECURE_PASSWORD';
GRANT CONNECT ON DATABASE customers_db TO fdw_reader;
GRANT USAGE ON SCHEMA public TO fdw_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO fdw_reader;

-- Use this restricted user in your foreign server mapping
CREATE USER MAPPING FOR postgres
SERVER customers_server
OPTIONS (user 'fdw_reader', password 'SECURE_PASSWORD');
```

Cross-database queries in Cloud SQL PostgreSQL require a bit of setup, but once configured, foreign data wrappers make it feel almost native. For ad-hoc queries, dblink is quick and easy. For persistent cross-database access, postgres_fdw with materialized views gives you the best combination of convenience and performance. Choose the approach that fits your query patterns and performance requirements.
