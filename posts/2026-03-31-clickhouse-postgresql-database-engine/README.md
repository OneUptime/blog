# How to Use PostgreSQL Database Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PostgreSQL Database Engine, PostgreSQL, Federated Query, External Database

Description: Learn how to use the PostgreSQL database engine in ClickHouse to query PostgreSQL tables directly without copying data.

---

The PostgreSQL database engine in ClickHouse creates a virtual database that maps PostgreSQL tables as ClickHouse tables. Queries against these tables are forwarded to PostgreSQL in real time. This is ideal for federated queries, joining PostgreSQL operational data with ClickHouse analytics data, or migrating data incrementally.

## Creating the Database

```sql
CREATE DATABASE pg_live
ENGINE = PostgreSQL(
    '10.0.0.5:5432',
    'production',
    'readonly_user',
    'password',
    'public'  -- schema name (optional, default: public)
);
```

All tables in the `public` schema of the `production` PostgreSQL database become accessible via `pg_live`.

## Querying PostgreSQL Tables

```sql
-- Query a PostgreSQL table directly
SELECT
    order_id,
    customer_id,
    total_amount,
    status
FROM pg_live.orders
WHERE created_at >= now() - INTERVAL 24 HOUR
ORDER BY created_at DESC
LIMIT 100;
```

ClickHouse pushes compatible predicates to PostgreSQL for execution, reducing data transfer.

## Joining with Local ClickHouse Tables

A powerful use case is enriching ClickHouse event data with PostgreSQL dimension tables:

```sql
SELECT
    e.event_id,
    e.event_type,
    e.ts,
    c.name AS customer_name,
    c.plan AS subscription_plan
FROM local_events AS e
INNER JOIN pg_live.customers AS c USING (customer_id)
WHERE e.ts >= today()
ORDER BY e.ts DESC;
```

ClickHouse reads the PostgreSQL data and performs the join locally.

## Listing Available Tables

```sql
SHOW TABLES FROM pg_live;
```

Or:

```sql
SELECT name
FROM system.tables
WHERE database = 'pg_live';
```

## Filtering and Predicate Pushdown

ClickHouse pushes WHERE conditions to PostgreSQL where possible:

```sql
-- PostgreSQL executes the WHERE filter on its side
SELECT * FROM pg_live.products
WHERE category = 'electronics'
  AND price > 100;
```

Complex expressions may not be pushed down, causing a full table scan on the PostgreSQL side.

## Performance Considerations

The PostgreSQL database engine performs live queries - every SELECT hits PostgreSQL. For high-frequency analytics:
- Prefer MaterializedPostgreSQL for analytics workloads
- Use the PostgreSQL engine for low-frequency lookups or joins on small tables

```sql
-- For large analytical queries, materialize first
INSERT INTO local_orders
SELECT * FROM pg_live.orders
WHERE created_at >= '2024-01-01';
```

## Limitations

- Supports SELECT and INSERT; INSERT runs as a `COPY ... FROM STDIN` on the PostgreSQL side with auto-commit
- No caching - every query hits PostgreSQL
- Performance is limited by PostgreSQL response time and network latency
- Not suitable for high-QPS analytical queries

## Summary

The PostgreSQL database engine provides a convenient bridge for federated queries between ClickHouse and PostgreSQL. It is best used for ad-hoc data exploration, incremental migrations, and occasional joins with small dimension tables. For sustained analytics on PostgreSQL data, use MaterializedPostgreSQL to create a local replica in ClickHouse instead.
