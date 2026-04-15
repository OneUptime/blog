# How to Sync Data from PostgreSQL to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PostgreSQL, Data Engineering, CDC, Analytics

Description: Learn how to sync data from PostgreSQL to ClickHouse using MaterializedPostgreSQL, PeerDB, logical replication, and batch ETL patterns for real-time analytics.

---

> ClickHouse's MaterializedPostgreSQL engine replicates an entire PostgreSQL database using logical replication, keeping ClickHouse in sync automatically.

PostgreSQL is the go-to transactional database for many applications, but analytical queries can strain it. Syncing data to ClickHouse offloads heavy reads and delivers orders-of-magnitude faster analytics. This guide covers four approaches: MaterializedPostgreSQL replication, PeerDB CDC, the PostgreSQL table engine for direct queries, and batch ETL pipelines.

---

## Prerequisites

Ensure PostgreSQL is configured for logical replication.

```bash
# Check PostgreSQL version (10+ required for logical replication)
psql -c "SELECT version();"

# Verify wal_level is set to logical
psql -c "SHOW wal_level;"

# If not, update postgresql.conf
echo "wal_level = logical" >> /etc/postgresql/16/main/postgresql.conf
echo "max_replication_slots = 10" >> /etc/postgresql/16/main/postgresql.conf
echo "max_wal_senders = 10"       >> /etc/postgresql/16/main/postgresql.conf

# Restart PostgreSQL
sudo systemctl restart postgresql

# Create a replication user
psql -c "CREATE USER clickhouse_replication REPLICATION LOGIN PASSWORD 'repl_password';"
psql -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO clickhouse_replication;"
```

## Setting Up a Sample PostgreSQL Schema

Create sample tables to replicate.

```sql
-- In PostgreSQL
CREATE TABLE orders (
    order_id    SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    status      VARCHAR(50) NOT NULL,
    total_amount NUMERIC(10, 2),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    item_id    SERIAL PRIMARY KEY,
    order_id   INTEGER REFERENCES orders(order_id),
    product_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- Insert sample data
INSERT INTO orders (user_id, status, total_amount)
SELECT
    (random() * 10000)::INTEGER,
    (ARRAY['pending', 'paid', 'shipped', 'delivered', 'cancelled'])[floor(random() * 5 + 1)],
    round((random() * 1000)::NUMERIC, 2)
FROM generate_series(1, 100000);
```

## Approach 1 - MaterializedPostgreSQL

Use ClickHouse's built-in replication engine to mirror an entire database.

```sql
-- Create a materialized database that replicates from PostgreSQL
CREATE DATABASE pg_replica
ENGINE = MaterializedPostgreSQL(
    'localhost:5432',
    'myapp_db',
    'clickhouse_replication',
    'repl_password'
)
SETTINGS
    materialized_postgresql_tables_list = 'orders, order_items',
    materialized_postgresql_schema      = 'public';

-- Check replication status
SELECT *
FROM system.materialized_postgresql_tables
WHERE database = 'pg_replica';

-- Query the replicated data
SELECT
    status,
    count()               AS total_orders,
    sum(total_amount)     AS revenue,
    avg(total_amount)     AS avg_order_value
FROM pg_replica.orders
GROUP BY status
ORDER BY total_orders DESC;
```

## Approach 2 - PostgreSQL Table Engine (Direct Queries)

For lightweight access, query PostgreSQL directly from ClickHouse.

```sql
-- Create a table that reads directly from PostgreSQL
CREATE TABLE pg_orders
(
    order_id     Int32,
    user_id      Int32,
    status       String,
    total_amount Decimal(10, 2),
    created_at   DateTime,
    updated_at   DateTime
)
ENGINE = PostgreSQL(
    'localhost:5432',
    'myapp_db',
    'orders',
    'clickhouse_replication',
    'repl_password'
);

-- Query PostgreSQL data from ClickHouse
SELECT count() FROM pg_orders;

-- Use the table function for ad-hoc queries
SELECT *
FROM postgresql(
    'localhost:5432',
    'myapp_db',
    'orders',
    'clickhouse_replication',
    'repl_password'
)
WHERE created_at >= now() - INTERVAL 7 DAY
LIMIT 100;
```

## Approach 3 - PeerDB for CDC Sync

PeerDB is purpose-built for PostgreSQL-to-ClickHouse CDC.

```bash
# Install PeerDB
curl -sSf https://raw.githubusercontent.com/PeerDB-io/peerdb/main/install.sh | bash

# Or use Docker
docker run -d \
  --name peerdb \
  -p 8085:8085 \
  -e PEERDB_VERSION=latest \
  peerdb/peerdb-server:latest
```

```sql
-- Create a PostgreSQL peer in PeerDB
CREATE PEER pg_source FROM POSTGRES WITH (
    host      = 'localhost',
    port      = '5432',
    user      = 'clickhouse_replication',
    password  = 'repl_password',
    database  = 'myapp_db'
);

-- Create a ClickHouse peer
CREATE PEER ch_dest FROM CLICKHOUSE WITH (
    host     = 'localhost',
    port     = '9000',
    user     = 'default',
    password = 'password',
    database = 'default'
);

-- Create a CDC mirror
CREATE MIRROR orders_cdc
FROM pg_source TO ch_dest
FOR TABLES IN SCHEMA public
WITH (
    publication_name        = 'peerdb_pub',
    replication_slot_name   = 'peerdb_slot',
    snapshot_num_rows_per_partition = 100000,
    max_batch_size          = 100000,
    sync_mode               = 'avro'
);
```

## Approach 4 - Batch ETL with Python

For simpler use cases, run periodic batch syncs.

```python
import psycopg2
import clickhouse_connect
from datetime import datetime, timedelta

# Connect to PostgreSQL
pg_conn = psycopg2.connect(
    host='localhost', port=5432,
    dbname='myapp_db',
    user='clickhouse_replication',
    password='repl_password'
)

# Connect to ClickHouse
ch_client = clickhouse_connect.get_client(
    host='localhost', port=8123,
    username='default', password='password'
)

def sync_orders(since: datetime):
    """Sync orders modified since the given timestamp."""
    cursor = pg_conn.cursor()
    cursor.execute(
        """
        SELECT order_id, user_id, status, total_amount::FLOAT,
               created_at, updated_at
        FROM orders
        WHERE updated_at >= %s
        ORDER BY updated_at
        LIMIT 100000
        """,
        (since,)
    )

    rows = cursor.fetchall()
    if not rows:
        print("No new rows to sync")
        return

    ch_client.insert(
        'orders',
        rows,
        column_names=[
            'order_id', 'user_id', 'status', 'total_amount',
            'created_at', 'updated_at'
        ]
    )
    print(f"Synced {len(rows)} orders")
    cursor.close()


# Create matching ClickHouse table
ch_client.command("""
    CREATE TABLE IF NOT EXISTS orders (
        order_id     Int32,
        user_id      Int32,
        status       LowCardinality(String),
        total_amount Float64,
        created_at   DateTime,
        updated_at   DateTime
    )
    ENGINE = ReplacingMergeTree(updated_at)
    PARTITION BY toYYYYMM(created_at)
    ORDER BY order_id
""")

# Run the sync
since = datetime.now() - timedelta(hours=1)
sync_orders(since)
```

## Deduplication after Sync

Use `FINAL` or `OPTIMIZE` to deduplicate ReplacingMergeTree data.

```sql
-- Query with deduplication applied
SELECT
    status,
    count()           AS orders,
    sum(total_amount) AS revenue
FROM orders FINAL
GROUP BY status
ORDER BY orders DESC;

-- Force deduplication for a specific partition
OPTIMIZE TABLE orders PARTITION '202603' FINAL;

-- Check deduplication ratio
SELECT
    count()                          AS total_rows,
    count(DISTINCT order_id)         AS unique_orders,
    count() - count(DISTINCT order_id) AS duplicates
FROM orders;
```

## Monitoring Replication Lag

Keep an eye on how current the ClickHouse data is.

```sql
-- Check the lag between PostgreSQL and ClickHouse (MaterializedPostgreSQL)
SELECT
    database,
    table,
    last_exception,
    is_readonly
FROM system.materialized_postgresql_tables;

-- Check max updated_at in ClickHouse vs PostgreSQL
SELECT max(updated_at) AS ch_max_updated FROM orders;

-- In PostgreSQL, check the current max:
-- SELECT max(updated_at) FROM orders;
```

## Summary

Syncing PostgreSQL to ClickHouse can be done through MaterializedPostgreSQL (built-in logical replication), PeerDB (purpose-built CDC tool), the PostgreSQL table engine (direct queries), or batch ETL scripts. MaterializedPostgreSQL is the simplest for full-database replication. PeerDB handles schema changes and high-throughput CDC. The PostgreSQL engine is suitable for infrequent, low-volume queries. For replicated data, use `ReplacingMergeTree` and query with `FINAL` to ensure deduplication.
