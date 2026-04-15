# How to Use MongoDB Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MongoDB, Storage Engine, Integration, NoSQL

Description: Learn how to use the MongoDB table engine in ClickHouse to query MongoDB collections directly, join document data with analytical tables, and replicate data into MergeTree.

---

The `MongoDB` table engine connects ClickHouse to a MongoDB collection and allows you to query documents as if they were rows in a ClickHouse table. ClickHouse translates simple `WHERE` predicates into MongoDB query filters and streams the matching documents back. This engine is useful for enriching ClickHouse analytical queries with MongoDB document data, building federated dashboards, or pulling MongoDB data into local MergeTree tables for faster repeated analysis.

## Prerequisites

ClickHouse must be able to reach the MongoDB server on its port (default 27017). Ensure network connectivity and the MongoDB user has `read` permission on the target collection.

## Creating a MongoDB Engine Table

```sql
-- Syntax: MongoDB('host:port', 'database', 'collection', 'user', 'password'[, options])
CREATE TABLE mongo_users
(
    _id         String,
    username    String,
    email       String,
    plan        String,
    country     String,
    created_at  DateTime,
    is_active   UInt8
)
ENGINE = MongoDB(
    'mongo-host:27017',
    'ecommerce',
    'users',
    'ch_reader',
    'secret_password'
);
```

ClickHouse maps MongoDB field names to columns. The `_id` field (MongoDB ObjectId) is read as a `String`.

## Querying MongoDB Collections

```sql
SELECT
    _id,
    username,
    email,
    plan,
    country,
    created_at
FROM mongo_users
WHERE is_active = 1
  AND plan = 'premium'
ORDER BY created_at DESC
LIMIT 20;
```

```text
_id                      username  email                 plan     country  created_at
64a1b2c3d4e5f6a7b8c9d0e1  alice     alice@example.com    premium  US       2024-06-01 10:00:00
64a1b2c3d4e5f6a7b8c9d0e2  bob       bob@example.com      premium  DE       2024-06-02 11:00:00
```

## Filtering With Pushdown

Simple equality and range conditions on scalar fields push down to MongoDB as query filters.

```sql
-- This filter runs on MongoDB, not ClickHouse
SELECT count(), uniq(country)
FROM mongo_users
WHERE plan IN ('pro', 'premium')
  AND created_at >= '2024-01-01'
  AND is_active = 1;
```

## Joining MongoDB With ClickHouse Analytics

```sql
-- MongoDB: user profiles (document store)
-- ClickHouse: event data (analytical store)

SELECT
    e.event_date,
    u.country,
    u.plan,
    count()          AS events,
    uniq(e.user_id)  AS unique_users,
    sum(e.revenue)   AS revenue
FROM daily_events AS e
JOIN mongo_users AS u ON toString(e.user_id) = u._id
WHERE e.event_date = yesterday()
  AND u.is_active = 1
GROUP BY e.event_date, u.country, u.plan
ORDER BY revenue DESC;
```

## Replicating MongoDB Data Into MergeTree

For high-frequency queries, copy MongoDB data into a local MergeTree table.

```sql
-- Local MergeTree for fast repeated queries
CREATE TABLE users_local
(
    mongo_id    String,
    username    String,
    email       String,
    plan        LowCardinality(String),
    country     LowCardinality(String),
    created_at  DateTime,
    is_active   UInt8
)
ENGINE = MergeTree
ORDER BY (mongo_id);

-- Initial load
INSERT INTO users_local
SELECT
    _id          AS mongo_id,
    username,
    email,
    plan,
    country,
    created_at,
    is_active
FROM mongo_users;

-- Incremental refresh (requires a created_at or updated_at field in MongoDB)
INSERT INTO users_local
SELECT _id, username, email, plan, country, created_at, is_active
FROM mongo_users
WHERE created_at > (SELECT max(created_at) FROM users_local);
```

## Querying Nested Documents

MongoDB documents often contain nested objects. ClickHouse reads nested fields as strings by default. Use JSON functions to extract values.

```sql
CREATE TABLE mongo_products
(
    _id         String,
    name        String,
    category    String,
    attributes  String,   -- nested object serialized as JSON string
    tags        String    -- array serialized as JSON string
)
ENGINE = MongoDB(
    'mongo-host:27017',
    'catalog',
    'products',
    'reader',
    'pass'
);

-- Extract nested fields using JSON functions
SELECT
    _id,
    name,
    JSONExtractString(attributes, 'color')    AS color,
    JSONExtractFloat(attributes, 'weight_kg') AS weight_kg,
    JSONExtractString(attributes, 'brand')    AS brand
FROM mongo_products
WHERE category = 'electronics'
  AND JSONExtractString(attributes, 'brand') = 'Acme'
LIMIT 10;
```

## Using the mongodb() Table Function

For one-off queries, use the `mongodb()` table function. Unlike the engine, the table function requires a `structure` parameter that defines column names and types.

```sql
SELECT
    username,
    email,
    plan
FROM mongodb(
    'mongo-host:27017',
    'ecommerce',
    'users',
    'ch_reader',
    'secret',
    '_id String, username String, email String, plan String, country String, created_at DateTime, is_active UInt8'
)
WHERE plan = 'free'
  AND is_active = 0
LIMIT 100;
```

## Replica Set Connection

Connect to a MongoDB replica set by specifying the replica set URI. When using the URI format, include the credentials and database in the URI itself. The engine takes only two parameters: the URI and the collection name.

```sql
CREATE TABLE mongo_orders_rs
(
    _id         String,
    customer_id String,
    status      String,
    amount      Float64,
    created_at  DateTime
)
ENGINE = MongoDB(
    'mongodb://reader:secret@mongo-rs-01:27017,mongo-rs-02:27017,mongo-rs-03:27017/orders_db?replicaSet=myReplSet',
    'orders'
);
```

## Aggregating MongoDB Data in ClickHouse

ClickHouse handles aggregations in its engine - MongoDB does not receive aggregation queries.

```sql
SELECT
    plan,
    country,
    count()                           AS user_count,
    countIf(is_active = 1)            AS active_users,
    countIf(is_active = 1) / count() AS active_rate
FROM mongo_users
GROUP BY plan, country
ORDER BY user_count DESC
LIMIT 10;
```

## Type Mapping Reference

```text
MongoDB BSON Type   ClickHouse Type
ObjectId            String
String              String
Int32               Int32
Int64               Int64
Double              Float64
Boolean             UInt8
Date                DateTime
Array               Array or String (JSON-serialized)
Document/Object     String (JSON-serialized)
Null                Nullable(T)
```

## Limitations

- Read-only: INSERT via the MongoDB engine is not supported in current versions.
- Complex nested documents arrive as JSON strings; extraction requires function calls.
- No ClickHouse-side indexes - queries that cannot push down to MongoDB require full collection scans.
- Aggregations always run in ClickHouse, not MongoDB.
- Very large collections should be replicated into MergeTree for performance.

## Summary

The `MongoDB` engine provides direct federated read access to MongoDB collections from ClickHouse. Use it for joining MongoDB document data with ClickHouse analytical tables, for exploratory queries, or as an ETL source for loading into MergeTree. For production analytical workloads against large collections, load the data into a local MergeTree table using incremental inserts to maximize query speed.
