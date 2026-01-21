# How to Migrate from PostgreSQL/MySQL to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PostgreSQL, MySQL, Migration, Database, Analytics, Data Migration, ETL

Description: A practical guide to migrating analytics workloads from PostgreSQL or MySQL to ClickHouse, covering schema conversion, data migration strategies, query translation, and dual-write patterns for zero-downtime transitions.

---

PostgreSQL and MySQL are excellent transactional databases, but they struggle with analytical queries over large datasets. ClickHouse can run those same queries 100x faster. This guide covers how to migrate your analytics workloads while keeping your OLTP database for what it does best.

## When to Migrate

Move to ClickHouse when:
- Aggregation queries take seconds instead of milliseconds
- Table sizes exceed 100 million rows
- You're running separate read replicas just for analytics
- Dashboard queries are affecting production database performance
- You need to retain months or years of data for analysis

Keep PostgreSQL/MySQL for:
- Transactional workloads with frequent updates
- ACID compliance requirements
- Complex multi-table transactions
- Small datasets with complex relationships

## Architecture Patterns

### Pattern 1: Analytics Offload

Keep OLTP in PostgreSQL/MySQL, sync to ClickHouse for analytics:

```mermaid
flowchart LR
    App[Application]
    PG[(PostgreSQL/MySQL)]
    CH[(ClickHouse)]
    Dashboard[Dashboards]

    App -->|OLTP| PG
    PG -->|CDC/ETL| CH
    Dashboard -->|Analytics| CH
```

### Pattern 2: Dual Write

Write to both databases during transition:

```mermaid
flowchart LR
    App[Application]
    PG[(PostgreSQL)]
    CH[(ClickHouse)]

    App -->|Writes| PG
    App -->|Async Writes| CH
```

### Pattern 3: Full Migration

Replace PostgreSQL/MySQL entirely for analytics tables:

```mermaid
flowchart LR
    App[Application]
    PG[(PostgreSQL)]
    CH[(ClickHouse)]

    App -->|OLTP| PG
    App -->|Analytics| CH
```

## Schema Conversion

### Data Type Mapping

PostgreSQL/MySQL types don't map 1:1 to ClickHouse. Here's a conversion guide:

| PostgreSQL | MySQL | ClickHouse | Notes |
|------------|-------|------------|-------|
| SERIAL, BIGSERIAL | INT AUTO_INCREMENT | UInt64 | No auto-increment in ClickHouse |
| INTEGER | INT | Int32 | Signed integer |
| BIGINT | BIGINT | Int64 | Signed 64-bit |
| SMALLINT | SMALLINT | Int16 | Signed 16-bit |
| REAL | FLOAT | Float32 | Single precision |
| DOUBLE PRECISION | DOUBLE | Float64 | Double precision |
| NUMERIC(p,s) | DECIMAL(p,s) | Decimal64(s) | Fixed decimal |
| VARCHAR(n) | VARCHAR(n) | String | No length limit |
| TEXT | TEXT | String | Same as VARCHAR |
| BOOLEAN | TINYINT(1) | UInt8 | 0 or 1 |
| DATE | DATE | Date | YYYY-MM-DD |
| TIMESTAMP | DATETIME | DateTime | Second precision |
| TIMESTAMPTZ | DATETIME | DateTime('UTC') | With timezone |
| UUID | CHAR(36) | UUID | Native UUID type |
| JSONB | JSON | JSON or Map | Depends on usage |
| ARRAY | - | Array() | Native arrays |
| INET | - | IPv4/IPv6 | Native IP types |

### Example Schema Conversion

PostgreSQL schema:

```sql
-- PostgreSQL
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_created ON events(created_at);
```

ClickHouse equivalent:

```sql
-- ClickHouse
CREATE TABLE events
(
    id UInt64,  -- No auto-increment, generate in app or use generateUUIDv4()
    user_id UInt64,
    event_type LowCardinality(String),  -- Optimized for low cardinality
    properties Map(String, String),     -- Or JSON if structure varies
    created_at DateTime('UTC')
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id, event_type, created_at);  -- ORDER BY replaces indexes
```

### Key Differences

1. **No Primary Key Constraints**: ClickHouse doesn't enforce uniqueness
2. **No Foreign Keys**: Denormalize or use JOINs carefully
3. **No Auto-Increment**: Generate IDs in your application
4. **ORDER BY is Critical**: Determines physical data layout and query performance
5. **Partitioning is Different**: Time-based partitioning for data lifecycle

## Data Migration Strategies

### Strategy 1: Bulk Export/Import

Best for one-time migrations or initial data load.

Export from PostgreSQL:

```bash
# Export to CSV
psql -h localhost -U postgres -d mydb -c "\COPY (SELECT * FROM events) TO '/tmp/events.csv' WITH CSV HEADER"

# Or use COPY for better performance
COPY events TO '/tmp/events.csv' WITH (FORMAT CSV, HEADER);
```

Export from MySQL:

```bash
# Export to CSV
mysql -h localhost -u root -p mydb -e "SELECT * FROM events INTO OUTFILE '/tmp/events.csv' FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\n';"

# Or use mysqldump for structure
mysqldump --tab=/tmp --fields-terminated-by=',' --fields-enclosed-by='"' mydb events
```

Import to ClickHouse:

```sql
-- Import from local file
INSERT INTO events
SELECT *
FROM file('/tmp/events.csv', 'CSVWithNames');

-- Import from URL
INSERT INTO events
SELECT *
FROM url('http://example.com/events.csv', 'CSVWithNames');

-- Import from S3
INSERT INTO events
SELECT *
FROM s3('https://bucket.s3.amazonaws.com/events.csv', 'AWS_KEY', 'AWS_SECRET', 'CSVWithNames');
```

### Strategy 2: Direct Database Connection

ClickHouse can read directly from PostgreSQL and MySQL.

PostgreSQL integration:

```sql
-- Create a PostgreSQL table function query
SELECT *
FROM postgresql(
    'postgres-host:5432',
    'database',
    'events',
    'user',
    'password'
);

-- Insert directly from PostgreSQL
INSERT INTO events
SELECT
    id,
    user_id,
    event_type,
    created_at
FROM postgresql(
    'postgres-host:5432',
    'database',
    'events',
    'user',
    'password'
)
WHERE created_at >= '2024-01-01';
```

MySQL integration:

```sql
-- Query MySQL directly
SELECT *
FROM mysql(
    'mysql-host:3306',
    'database',
    'events',
    'user',
    'password'
);

-- Copy data from MySQL
INSERT INTO events
SELECT *
FROM mysql(
    'mysql-host:3306',
    'database',
    'events',
    'user',
    'password'
);
```

### Strategy 3: Change Data Capture (CDC)

For continuous synchronization, use CDC tools like Debezium.

Set up Debezium with Kafka:

```yaml
# Debezium PostgreSQL connector config
{
  "name": "pg-events-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "password",
    "database.dbname": "mydb",
    "table.include.list": "public.events",
    "topic.prefix": "pg",
    "plugin.name": "pgoutput"
  }
}
```

Consume in ClickHouse using Kafka engine:

```sql
-- Create Kafka engine table
CREATE TABLE events_kafka
(
    id UInt64,
    user_id UInt64,
    event_type String,
    created_at DateTime
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'pg.public.events',
    kafka_group_name = 'clickhouse-consumer',
    kafka_format = 'JSONEachRow';

-- Create materialized view to move data to MergeTree
CREATE MATERIALIZED VIEW events_mv TO events AS
SELECT *
FROM events_kafka;
```

### Strategy 4: Application-Level Dual Write

Write to both databases from your application:

```python
# Python example with async writes to ClickHouse
import asyncio
from sqlalchemy import create_engine
import clickhouse_connect

# PostgreSQL connection
pg_engine = create_engine('postgresql://user:pass@localhost/mydb')

# ClickHouse connection
ch_client = clickhouse_connect.get_client(host='localhost')

async def insert_event(event_data):
    # Write to PostgreSQL (synchronous, transactional)
    with pg_engine.connect() as conn:
        conn.execute(
            "INSERT INTO events (user_id, event_type, created_at) VALUES (%s, %s, %s)",
            (event_data['user_id'], event_data['event_type'], event_data['created_at'])
        )
        conn.commit()

    # Write to ClickHouse (async, can fail independently)
    try:
        ch_client.insert('events', [
            [event_data['user_id'], event_data['event_type'], event_data['created_at']]
        ], column_names=['user_id', 'event_type', 'created_at'])
    except Exception as e:
        # Log error, add to retry queue
        log_clickhouse_failure(event_data, e)
```

## Query Translation

### Basic SELECT

PostgreSQL/MySQL:
```sql
SELECT user_id, COUNT(*) as event_count
FROM events
WHERE created_at >= '2024-01-01'
GROUP BY user_id
ORDER BY event_count DESC
LIMIT 100;
```

ClickHouse (usually identical):
```sql
SELECT user_id, COUNT(*) as event_count
FROM events
WHERE created_at >= '2024-01-01'
GROUP BY user_id
ORDER BY event_count DESC
LIMIT 100;
```

### Date Functions

PostgreSQL:
```sql
SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(*)
FROM events
GROUP BY DATE_TRUNC('hour', created_at);
```

ClickHouse:
```sql
SELECT toStartOfHour(created_at) as hour, COUNT(*)
FROM events
GROUP BY toStartOfHour(created_at);
```

Common date function mappings:

| PostgreSQL | MySQL | ClickHouse |
|------------|-------|------------|
| DATE_TRUNC('day', ts) | DATE(ts) | toDate(ts) |
| DATE_TRUNC('hour', ts) | DATE_FORMAT(ts, '%Y-%m-%d %H:00:00') | toStartOfHour(ts) |
| DATE_TRUNC('month', ts) | DATE_FORMAT(ts, '%Y-%m-01') | toStartOfMonth(ts) |
| EXTRACT(DOW FROM ts) | DAYOFWEEK(ts) | toDayOfWeek(ts) |
| NOW() | NOW() | now() |
| ts + INTERVAL '1 day' | ts + INTERVAL 1 DAY | ts + INTERVAL 1 DAY |

### String Functions

PostgreSQL:
```sql
SELECT LOWER(name), SUBSTRING(email, 1, 5)
FROM users
WHERE name ILIKE '%john%';
```

ClickHouse:
```sql
SELECT lower(name), substring(email, 1, 5)
FROM users
WHERE lower(name) LIKE '%john%';  -- No ILIKE, use lower()
```

### JSON Queries

PostgreSQL:
```sql
SELECT properties->>'action' as action
FROM events
WHERE properties->>'page' = 'home';
```

ClickHouse (with Map):
```sql
SELECT properties['action'] as action
FROM events
WHERE properties['page'] = 'home';
```

ClickHouse (with JSON):
```sql
SELECT properties.action as action
FROM events
WHERE properties.page = 'home';
```

### Window Functions

PostgreSQL:
```sql
SELECT
    user_id,
    event_type,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as event_num
FROM events;
```

ClickHouse:
```sql
SELECT
    user_id,
    event_type,
    row_number() OVER (PARTITION BY user_id ORDER BY created_at) as event_num
FROM events;
```

Most window functions work identically.

## Handling Updates and Deletes

ClickHouse is append-optimized. Updates and deletes work differently.

### Mutations (ALTER TABLE)

```sql
-- Update rows (async, resource-intensive)
ALTER TABLE events UPDATE event_type = 'signup' WHERE event_type = 'register';

-- Delete rows (async, resource-intensive)
ALTER TABLE events DELETE WHERE created_at < '2023-01-01';

-- Check mutation progress
SELECT * FROM system.mutations WHERE table = 'events' AND is_done = 0;
```

### ReplacingMergeTree for Mutable Data

```sql
-- Create table that deduplicates by key
CREATE TABLE users
(
    user_id UInt64,
    name String,
    email String,
    updated_at DateTime
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id;

-- "Update" by inserting new row with same user_id
INSERT INTO users VALUES (1, 'John Updated', 'john@example.com', now());

-- Query with FINAL to get latest version
SELECT * FROM users FINAL WHERE user_id = 1;
```

## Migration Checklist

### Pre-Migration

- [ ] Identify tables to migrate (analytics/reporting tables)
- [ ] Map data types and plan schema changes
- [ ] Estimate data volume and storage requirements
- [ ] Plan ORDER BY keys based on query patterns
- [ ] Set up ClickHouse cluster (if needed)
- [ ] Create target tables in ClickHouse

### Migration

- [ ] Perform initial bulk data load
- [ ] Verify row counts match
- [ ] Set up ongoing sync (CDC or dual-write)
- [ ] Validate data integrity with checksums

### Post-Migration

- [ ] Translate and test critical queries
- [ ] Update application code to query ClickHouse
- [ ] Set up monitoring and alerting
- [ ] Configure data retention (TTL)
- [ ] Document query differences for the team

## Common Pitfalls

### 1. Expecting Transactional Behavior

ClickHouse doesn't have transactions in the traditional sense:

```sql
-- This doesn't work like PostgreSQL
BEGIN;
INSERT INTO events VALUES ...;
INSERT INTO related_events VALUES ...;
COMMIT;

-- Instead, batch inserts atomically at the INSERT level
INSERT INTO events VALUES
    (...),
    (...),
    (...);
```

### 2. Using JOINs Like in OLTP

Large JOINs are expensive. Denormalize when possible:

```sql
-- Instead of joining users table repeatedly
-- Denormalize user info into events table
CREATE TABLE events
(
    event_id UInt64,
    user_id UInt64,
    user_name String,  -- Denormalized
    user_country LowCardinality(String),  -- Denormalized
    event_type String,
    created_at DateTime
)
ENGINE = MergeTree()
ORDER BY (user_country, event_type, created_at);
```

### 3. Not Optimizing ORDER BY

The ORDER BY clause is your primary index. Choose wisely:

```sql
-- If you mostly query by user_id first:
ORDER BY (user_id, created_at)

-- If you mostly query by date range first:
ORDER BY (created_at, user_id)

-- If you filter by event_type then aggregate by date:
ORDER BY (event_type, created_at)
```

### 4. Forgetting LowCardinality

For columns with few unique values:

```sql
-- Wastes space
event_type String

-- Much more efficient
event_type LowCardinality(String)
```

---

Migrating from PostgreSQL or MySQL to ClickHouse transforms your analytics performance. Start with analytics tables that don't need ACID guarantees, use CDC for ongoing sync, and keep your OLTP database for what it does best. The combination of PostgreSQL for transactions and ClickHouse for analytics is a powerful pattern.
