# How to Query External Data Sources from ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, External Data, Table Engines, PostgreSQL, MySQL, S3, HDFS, Federation, Integration

Description: A practical guide to querying external data sources from ClickHouse using table engines and table functions for PostgreSQL, MySQL, S3, HDFS, and remote ClickHouse instances.

---

ClickHouse can query external data sources directly without importing data. This enables federated queries, real-time data integration, and hybrid architectures. This guide covers how to connect to various external sources.

## Table Functions vs Table Engines

### Table Functions (Ad-hoc Queries)

```sql
-- Direct query without creating a table
SELECT * FROM postgresql('host:5432', 'database', 'table', 'user', 'password');

SELECT * FROM s3('https://bucket.s3.amazonaws.com/data.parquet', 'Parquet');

SELECT * FROM mysql('host:3306', 'database', 'table', 'user', 'password');
```

### Table Engines (Persistent Connection)

```sql
-- Create persistent table mapping
CREATE TABLE pg_users
ENGINE = PostgreSQL('host:5432', 'database', 'users', 'user', 'password');

-- Query like a normal table
SELECT * FROM pg_users WHERE active = true;
```

## PostgreSQL Integration

### Basic Connection

```sql
-- Table function for ad-hoc queries
SELECT
    user_id,
    email,
    created_at
FROM postgresql(
    'postgres:5432',
    'app_database',
    'users',
    'readonly_user',
    'password'
)
WHERE created_at >= '2024-01-01';

-- Persistent table
CREATE TABLE pg_users (
    user_id UInt64,
    email String,
    name String,
    created_at DateTime
)
ENGINE = PostgreSQL(
    'postgres:5432',
    'app_database',
    'users',
    'readonly_user',
    'password'
);
```

### PostgreSQL with Schema

```sql
-- Specify schema
CREATE TABLE pg_orders
ENGINE = PostgreSQL(
    'postgres:5432',
    'app_database',
    'orders',
    'user',
    'password',
    'public'  -- schema name
);
```

### Join ClickHouse and PostgreSQL

```sql
-- Join ClickHouse events with PostgreSQL users
SELECT
    e.event_id,
    e.event_type,
    e.event_time,
    u.email,
    u.name
FROM events e
JOIN postgresql('postgres:5432', 'app', 'users', 'user', 'pass') u
    ON e.user_id = u.id
WHERE e.event_time >= today() - 7;
```

## MySQL Integration

### Basic MySQL Connection

```sql
-- Table function
SELECT * FROM mysql(
    'mysql:3306',
    'database',
    'table',
    'user',
    'password'
);

-- Persistent table
CREATE TABLE mysql_products (
    product_id UInt64,
    name String,
    price Decimal(10, 2),
    category String
)
ENGINE = MySQL(
    'mysql:3306',
    'ecommerce',
    'products',
    'readonly',
    'password'
);
```

### MySQL Connection Pool

```sql
-- With connection pool settings
CREATE TABLE mysql_orders
ENGINE = MySQL(
    'mysql:3306',
    'ecommerce',
    'orders',
    'user',
    'password'
)
SETTINGS
    connection_pool_size = 16,
    connection_max_tries = 3,
    connection_wait_timeout = 5;
```

## S3 Integration

### Read from S3

```sql
-- Read Parquet file
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/data/events/*.parquet',
    'AWS_ACCESS_KEY',
    'AWS_SECRET_KEY',
    'Parquet'
);

-- Read CSV with header
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/data/users.csv',
    'ACCESS_KEY',
    'SECRET_KEY',
    'CSVWithNames'
);

-- Read JSON
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/data/logs/*.json.gz',
    'ACCESS_KEY',
    'SECRET_KEY',
    'JSONEachRow'
);
```

### S3 Table Engine

```sql
-- Persistent S3 table
CREATE TABLE s3_events (
    event_id UInt64,
    event_type String,
    user_id UInt64,
    event_time DateTime
)
ENGINE = S3(
    'https://bucket.s3.amazonaws.com/events/',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);

-- Query like normal table
SELECT event_type, count()
FROM s3_events
WHERE event_time >= today() - 30
GROUP BY event_type;
```

### Write to S3

```sql
-- Insert results to S3
INSERT INTO FUNCTION s3(
    'https://bucket.s3.amazonaws.com/exports/report.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
)
SELECT
    toDate(event_time) AS date,
    event_type,
    count() AS events
FROM events
GROUP BY date, event_type;
```

### S3 with Wildcards

```sql
-- Read partitioned data
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/data/year=2024/month=*/day=*/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);

-- Read with virtual columns
SELECT
    _path,
    _file,
    *
FROM s3(
    'https://bucket.s3.amazonaws.com/logs/**/*.json.gz',
    'ACCESS_KEY',
    'SECRET_KEY',
    'JSONEachRow'
);
```

## Remote ClickHouse

### Query Remote ClickHouse

```sql
-- Remote table function
SELECT *
FROM remote(
    'clickhouse-2:9000',
    'database',
    'table',
    'user',
    'password'
);

-- Query cluster
SELECT *
FROM cluster(
    'analytics_cluster',
    database,
    table
);
```

### Distributed Queries

```sql
-- Create distributed table over remote servers
CREATE TABLE distributed_events AS events
ENGINE = Distributed(
    'cluster_name',
    'database',
    'events',
    rand()  -- sharding key
);

-- Query across all shards
SELECT count() FROM distributed_events;
```

## HDFS Integration

### Read from HDFS

```sql
-- Read Parquet from HDFS
SELECT *
FROM hdfs(
    'hdfs://namenode:9000/data/events/*.parquet',
    'Parquet'
);

-- Read ORC
SELECT *
FROM hdfs(
    'hdfs://namenode:9000/warehouse/events/year=2024/month=01/*.orc',
    'ORC'
);
```

### HDFS Table Engine

```sql
CREATE TABLE hdfs_events (
    event_id UInt64,
    event_type String,
    event_time DateTime
)
ENGINE = HDFS(
    'hdfs://namenode:9000/data/events/',
    'Parquet'
);
```

## URL Function

### HTTP/HTTPS Data Sources

```sql
-- Read from HTTP endpoint
SELECT *
FROM url(
    'https://api.example.com/data.json',
    'JSONEachRow'
);

-- Read CSV from URL
SELECT *
FROM url(
    'https://example.com/reports/daily.csv',
    'CSVWithNames',
    'date Date, value Float64'
);
```

## MongoDB Integration

### MongoDB Table Engine

```sql
-- Connect to MongoDB
CREATE TABLE mongo_users (
    _id String,
    email String,
    name String,
    created_at DateTime
)
ENGINE = MongoDB(
    'mongodb://user:password@mongo:27017/database',
    'users'
);

-- Query MongoDB collection
SELECT * FROM mongo_users WHERE email LIKE '%@example.com';
```

## SQLite Integration

### SQLite Table Engine

```sql
-- Connect to SQLite file
CREATE TABLE sqlite_data
ENGINE = SQLite('/path/to/database.db', 'table_name');

-- Query SQLite
SELECT * FROM sqlite_data;
```

## Performance Optimization

### Filtering Push-Down

```sql
-- Filters are pushed to external source when possible
SELECT *
FROM postgresql('host', 'db', 'users', 'user', 'pass')
WHERE user_id = 12345;  -- Pushed to PostgreSQL
```

### Caching External Data

```sql
-- Create materialized table from external source
CREATE TABLE users_cache
ENGINE = MergeTree()
ORDER BY user_id
AS SELECT * FROM postgresql('host', 'db', 'users', 'user', 'pass');

-- Refresh periodically
INSERT INTO users_cache
SELECT * FROM postgresql('host', 'db', 'users', 'user', 'pass')
WHERE updated_at > (SELECT max(updated_at) FROM users_cache);
```

### Use Dictionaries for Lookups

```sql
-- Dictionary for frequent lookups
CREATE DICTIONARY users_dict (
    user_id UInt64,
    email String,
    name String
)
PRIMARY KEY user_id
SOURCE(POSTGRESQL(
    HOST 'postgres'
    PORT 5432
    USER 'readonly'
    PASSWORD 'password'
    DB 'app'
    TABLE 'users'
))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 600);

-- Fast lookups
SELECT
    event_id,
    dictGet('users_dict', 'email', user_id) AS email
FROM events;
```

## Best Practices

### Connection Management

```sql
-- Use connection pooling
CREATE TABLE external_data
ENGINE = PostgreSQL(...)
SETTINGS
    connection_pool_size = 16,
    connection_max_tries = 3,
    connection_wait_timeout = 5;
```

### Error Handling

```sql
-- Handle connection errors gracefully
SELECT *
FROM postgresql('host', 'db', 'table', 'user', 'pass')
SETTINGS
    external_storage_connect_timeout_sec = 10,
    external_storage_max_read_rows = 1000000;
```

### Security

```xml
<!-- Named collections for credentials -->
<clickhouse>
    <named_collections>
        <postgres_main>
            <host>postgres</host>
            <port>5432</port>
            <database>app</database>
            <user>readonly</user>
            <password>secret</password>
        </postgres_main>
    </named_collections>
</clickhouse>
```

```sql
-- Use named collection
SELECT * FROM postgresql(postgres_main, table = 'users');
```

---

ClickHouse's external data integration enables federated queries across PostgreSQL, MySQL, S3, HDFS, and more. Use table functions for ad-hoc queries and table engines for persistent connections. For frequently accessed external data, consider caching in ClickHouse tables or using dictionaries for fast lookups.
