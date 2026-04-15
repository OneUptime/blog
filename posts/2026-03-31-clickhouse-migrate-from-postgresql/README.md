# How to Migrate from PostgreSQL to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PostgreSQL, Migration, Database, Analytics, Replication

Description: Migrate large analytical tables from PostgreSQL to ClickHouse by mapping types, using COPY for exports, leveraging the PostgreSQL table engine, and enabling CDC replication.

---

PostgreSQL is a powerful transactional database, but large analytical queries over hundreds of millions of rows consume significant resources and block OLTP workloads. ClickHouse's columnar storage processes the same queries orders of magnitude faster. This guide covers a complete migration strategy from schema mapping to live replication.

## PostgreSQL vs ClickHouse Architecture

PostgreSQL stores rows on disk. ClickHouse stores columns on disk. This distinction matters for analytical queries:

- `SELECT count(*) FROM events WHERE event_type = 'purchase'` in ClickHouse reads only the `event_type` column
- In PostgreSQL, the same query reads every row entirely or relies on an index
- ClickHouse also applies vectorized SIMD operations across column blocks, making aggregations extremely fast

## Data Type Mapping

| PostgreSQL | ClickHouse |
|------------|------------|
| SMALLINT | Int16 |
| INTEGER | Int32 |
| BIGINT | Int64 |
| SERIAL / BIGSERIAL | UInt64 |
| REAL | Float32 |
| DOUBLE PRECISION | Float64 |
| NUMERIC(p, s) | Decimal(p, s) |
| TEXT / VARCHAR | String |
| CHAR(n) | FixedString(n) |
| BOOLEAN | Bool |
| DATE | Date |
| TIMESTAMP | DateTime |
| TIMESTAMPTZ | DateTime (store UTC) |
| UUID | UUID |
| JSONB / JSON | String (use JSONExtract) |
| ARRAY | Array(T) |
| ENUM | LowCardinality(String) |
| BYTEA | String |

## Example: PostgreSQL Schema

```sql
-- PostgreSQL
CREATE TABLE events (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT    NOT NULL,
    session_id  TEXT      NOT NULL DEFAULT '',
    event_type  TEXT      NOT NULL,
    page        TEXT,
    amount      NUMERIC(10, 2),
    properties  JSONB     DEFAULT '{}',
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_user    ON events(user_id);
CREATE INDEX idx_events_created ON events(created_at);
CREATE INDEX idx_events_type    ON events(event_type);
```

## Equivalent ClickHouse Schema

```sql
CREATE TABLE events
(
    id          UInt64,
    user_id     UInt64,
    session_id  String,
    event_type  LowCardinality(String),
    page        String,
    amount      Decimal(10, 2)  DEFAULT 0,
    properties  String          DEFAULT '{}',
    created_at  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (event_type, user_id, created_at);
```

Differences from PostgreSQL:
- No `PRIMARY KEY` enforcement or uniqueness constraints
- Replace `JSONB` with `String` and use `JSONExtractString/Int/Float` functions
- No B-tree indexes - the `ORDER BY` sort key serves as the primary access path (ClickHouse supports data skipping indexes like `minmax` and `bloom_filter` but these are not equivalent to PostgreSQL secondary indexes)
- `LowCardinality(String)` for low-cardinality columns is more efficient than PostgreSQL enums

## Step 1: Export from PostgreSQL Using COPY

The fastest method to export large tables is PostgreSQL's `COPY` command:

```bash
psql -h postgres.host -U analytics_user -d analytics \
  -c "\COPY events (id, user_id, session_id, event_type, page, amount, created_at)
      TO '/tmp/events.csv'
      WITH (FORMAT CSV, HEADER true);"
```

For very large tables, export in date ranges to avoid locking issues:

```bash
psql -h postgres.host -U analytics_user -d analytics << 'EOF'
\COPY (
    SELECT id, user_id, session_id, event_type, page, amount, created_at
    FROM events
    WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'
) TO '/tmp/events_2024.csv' WITH (FORMAT CSV, HEADER true);
EOF
```

## Step 2: Load into ClickHouse

```bash
clickhouse-client \
  --database analytics \
  --query "INSERT INTO events FORMAT CSVWithNames" \
  < /tmp/events.csv
```

For parallel loading of multiple files:

```bash
for file in /tmp/events_*.csv; do
  clickhouse-client \
    --database analytics \
    --query "INSERT INTO events FORMAT CSVWithNames" \
    < "$file" &
done
wait
echo "All files loaded"
```

## Step 3: Use ClickHouse PostgreSQL Table Function

ClickHouse can query PostgreSQL directly without exporting:

```sql
SELECT *
FROM postgresql(
    'postgres.host:5432',
    'analytics',
    'events',
    'analytics_user',
    'password'
)
LIMIT 5;
```

Insert from PostgreSQL to ClickHouse in a single SQL statement:

```sql
INSERT INTO events
SELECT
    id,
    user_id,
    session_id,
    event_type,
    page,
    amount,
    created_at
FROM postgresql(
    'postgres.host:5432',
    'analytics',
    'events',
    'analytics_user',
    'password'
);
```

## Step 4: Create a PostgreSQL Database Engine Mirror

```sql
CREATE DATABASE pg_mirror
ENGINE = PostgreSQL(
    'postgres.host:5432',
    'analytics',
    'analytics_user',
    'password'
);
```

This gives ClickHouse read access to all PostgreSQL tables in the `analytics` database.

## Step 5: Enable CDC with MaterializedPostgreSQL

For continuous replication using the PostgreSQL logical replication protocol:

```sql
CREATE DATABASE pg_cdc
ENGINE = MaterializedPostgreSQL(
    'postgres.host:5432',
    'analytics',
    'analytics_user',
    'password'
)
SETTINGS
    materialized_postgresql_tables_list = 'events,orders,users',
    materialized_postgresql_schema = 'public';
```

Requirements on the PostgreSQL side:

```sql
-- Set replication level in postgresql.conf
-- wal_level = logical

-- Grant replication permission
ALTER USER analytics_user REPLICATION;

-- Create a replication slot
SELECT pg_create_logical_replication_slot('clickhouse_slot', 'pgoutput');

-- Create publication
CREATE PUBLICATION clickhouse_pub FOR TABLE events, orders, users;
```

Verify replication is running in ClickHouse:

```sql
SELECT *
FROM system.tables
WHERE database = 'pg_cdc';
```

## Handling JSONB Migration

PostgreSQL JSONB stored as `String` in ClickHouse can still be queried efficiently:

```sql
-- PostgreSQL query
SELECT properties->>'referrer' AS referrer, count(*) FROM events GROUP BY 1;

-- ClickHouse equivalent
SELECT
    JSONExtractString(properties, 'referrer') AS referrer,
    count()
FROM events
GROUP BY referrer;
```

For frequently accessed JSON keys, extract them into dedicated columns:

```sql
ALTER TABLE events ADD COLUMN referrer String DEFAULT '';
ALTER TABLE events ADD COLUMN device   LowCardinality(String) DEFAULT '';

ALTER TABLE events UPDATE
    referrer = JSONExtractString(properties, 'referrer'),
    device   = JSONExtractString(properties, 'device')
WHERE properties != '{}';
```

## Rewriting PostgreSQL Window Functions

PostgreSQL window functions translate directly to ClickHouse:

```sql
-- PostgreSQL
SELECT
    user_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS event_num
FROM events;

-- ClickHouse
SELECT
    user_id,
    created_at,
    row_number() OVER (PARTITION BY user_id ORDER BY created_at) AS event_num
FROM events;
```

## Validation

```sql
-- PostgreSQL
SELECT count(*), sum(amount), max(created_at) FROM events;

-- ClickHouse
SELECT count(), sum(amount), max(created_at) FROM events;
```

Compare results. Differences may come from NULL handling or JSONB parsing. ClickHouse treats NULL as a value in aggregations differently from PostgreSQL, so verify `count(*)` vs `count(column)` semantics.

## Performance Comparison After Migration

A typical aggregation query over 100 million rows:

```sql
SELECT
    event_type,
    toDate(created_at) AS day,
    count()            AS total,
    uniq(user_id)      AS unique_users,
    sum(amount)        AS revenue
FROM events
WHERE created_at >= today() - 90
GROUP BY event_type, day
ORDER BY day, total DESC;
```

PostgreSQL on a 100M row table: 45-120 seconds with indexes.
ClickHouse on the same data: 0.3-2 seconds.

## Summary

Migrating from PostgreSQL to ClickHouse requires mapping data types, redesigning schemas around sort keys instead of B-tree indexes, and choosing between one-time export or continuous `MaterializedPostgreSQL` replication. Use the `postgresql()` table function for the initial bulk load and `MaterializedPostgreSQL` for ongoing CDC. Keep PostgreSQL for all transactional writes and use ClickHouse exclusively for analytical reads and reporting queries.
