# How to Query PostgreSQL Tables Directly from ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PostgreSQL, PostgreSQL Table Function, Federation, Integration, Query

Description: Query PostgreSQL tables directly from ClickHouse using the PostgreSQL engine and table function for federated analytics without data replication.

---

ClickHouse provides the `postgresql` table function and `PostgreSQL` engine to query PostgreSQL tables directly. This enables federated joins between ClickHouse analytics tables and PostgreSQL transactional data.

## Using the PostgreSQL Table Function

```sql
SELECT *
FROM postgresql(
    'pg-host:5432',
    'myapp',
    'orders',
    'clickhouse_user',
    'secret'
)
WHERE status = 'pending'
LIMIT 100;
```

## Create a PostgreSQL Engine Table

```sql
CREATE TABLE pg_orders
(
    id UInt64,
    user_id UInt32,
    status String,
    total_amount Decimal(18, 4),
    created_at DateTime
)
ENGINE = PostgreSQL('pg-host:5432', 'myapp', 'orders', 'clickhouse_user', 'secret');
```

## Federated Analytics Query

Join ClickHouse event data with PostgreSQL order data:

```sql
SELECT
    o.status,
    count() AS order_count,
    sum(o.total_amount) AS revenue,
    uniq(e.user_id) AS active_users
FROM pg_orders o
JOIN events e ON o.user_id = e.user_id
WHERE o.created_at >= now() - INTERVAL 7 DAY
GROUP BY o.status
ORDER BY revenue DESC;
```

## Query a PostgreSQL View

The PostgreSQL engine supports views as well as tables:

```sql
CREATE TABLE pg_revenue_summary
(
    region String,
    total_revenue Decimal(18, 2),
    order_count UInt64
)
ENGINE = PostgreSQL('pg-host:5432', 'myapp', 'revenue_summary_view', 'clickhouse_user', 'secret');

SELECT * FROM pg_revenue_summary;
```

## Use Custom WHERE Clause Push-Down

Ensure filters are applied on the PostgreSQL side:

```sql
-- Good: simple equality pushed to PostgreSQL
SELECT * FROM pg_orders WHERE status = 'completed';

-- Avoid: complex expressions may not push down
SELECT * FROM pg_orders WHERE extract(year FROM created_at) = 2025;
```

## Write from ClickHouse to PostgreSQL

Insert ClickHouse data into PostgreSQL:

```sql
INSERT INTO pg_orders (user_id, status, total_amount, created_at)
SELECT user_id, 'pending', revenue, event_time
FROM events
WHERE event_type = 'checkout'
  AND event_date = yesterday();
```

## Use Named Collections

```sql
CREATE NAMED COLLECTION pg_conn AS
    host = 'pg-host',
    port = 5432,
    database = 'myapp',
    user = 'clickhouse_user',
    password = 'secret';

SELECT * FROM postgresql(pg_conn, table='orders') LIMIT 10;
```

## Configure Schema

For PostgreSQL schemas other than `public`:

```sql
CREATE TABLE pg_analytics_events
(
    event_id UInt64,
    user_id UInt32,
    event_type String,
    event_time DateTime
)
ENGINE = PostgreSQL('pg-host:5432', 'myapp', 'events', 'clickhouse_user', 'secret', 'analytics');
```

The sixth parameter specifies the PostgreSQL schema name.

## Performance Considerations

- Each query opens a new PostgreSQL connection by default
- Use LIMIT to avoid fetching large tables
- For repeated heavy queries, replicate data via `MaterializedPostgreSQL`
- Monitor PostgreSQL connection count with `pg_stat_activity`

## Summary

ClickHouse's PostgreSQL engine enables federated queries on PostgreSQL without data movement. Create persistent engine tables for frequently accessed PostgreSQL data, push predicates to reduce data transfer, and join with local ClickHouse tables for hybrid analytics. For real-time access at scale, use `MaterializedPostgreSQL` replication.
