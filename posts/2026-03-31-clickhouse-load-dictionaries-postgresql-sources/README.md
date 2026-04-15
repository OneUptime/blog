# How to Load Dictionaries from PostgreSQL Sources in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, PostgreSQL, Integration, Lookup

Description: Learn how to load ClickHouse dictionaries from PostgreSQL tables to enrich analytical queries with reference data stored in Postgres.

---

## PostgreSQL as a Dictionary Source

PostgreSQL is a common source of truth for transactional data. Loading PostgreSQL tables as ClickHouse dictionaries lets you enrich event data with customer records, product details, and configuration without data replication.

## Basic PostgreSQL Dictionary

```sql
CREATE DICTIONARY customer_dict (
    customer_id UInt64,
    name String DEFAULT '',
    email String DEFAULT '',
    plan String DEFAULT 'free',
    country String DEFAULT ''
)
PRIMARY KEY customer_id
SOURCE(POSTGRESQL(
    HOST 'postgres.internal.example.com'
    PORT 5432
    USER 'clickhouse_reader'
    PASSWORD 'secure_password'
    DB 'app_db'
    TABLE 'customers'
))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 600);
```

## PostgreSQL with WHERE Clause

Filter records at the source to reduce memory usage:

```sql
CREATE DICTIONARY active_subscriptions_dict (
    subscription_id UInt64,
    customer_id UInt64,
    plan String DEFAULT 'free',
    expires_at DateTime DEFAULT toDateTime(0)
)
PRIMARY KEY subscription_id
SOURCE(POSTGRESQL(
    HOST 'postgres.internal'
    PORT 5432
    USER 'ch_reader'
    PASSWORD 'secret'
    DB 'billing'
    TABLE 'subscriptions'
    WHERE 'status = ''active'''
))
LAYOUT(HASHED())
LIFETIME(300);
```

Note: escape single quotes in WHERE clause with `''`.

## PostgreSQL with Custom QUERY

Join multiple Postgres tables in the dictionary query:

```sql
CREATE DICTIONARY enriched_product_dict (
    product_id UInt64,
    product_name String DEFAULT '',
    brand String DEFAULT '',
    category String DEFAULT '',
    base_price Float64 DEFAULT 0.0
)
PRIMARY KEY product_id
SOURCE(POSTGRESQL(
    HOST 'postgres.internal'
    PORT 5432
    USER 'ch_reader'
    PASSWORD 'secret'
    DB 'catalog'
    QUERY 'SELECT p.id AS product_id, p.name AS product_name, b.name AS brand, c.name AS category, p.base_price FROM products p JOIN brands b ON p.brand_id = b.id JOIN categories c ON p.category_id = c.id'
))
LAYOUT(HASHED())
LIFETIME(600);
```

## Using the Dictionary

```sql
SELECT
    s.session_id,
    s.customer_id,
    dictGetString('customer_dict', 'name', s.customer_id) AS customer_name,
    dictGetString('customer_dict', 'plan', s.customer_id) AS plan,
    s.page_views,
    s.duration_seconds
FROM web_sessions s
WHERE s.session_date = today()
LIMIT 50;
```

## Monitor Dictionary Health

```sql
SELECT
    name,
    status,
    element_count,
    formatReadableSize(bytes_allocated) AS memory,
    loading_duration,
    last_successful_update_time,
    last_exception
FROM system.dictionaries
WHERE name = 'customer_dict';
```

## Configure SSL for Production

```sql
SOURCE(POSTGRESQL(
    HOST 'postgres.internal'
    PORT 5432
    USER 'ch_reader'
    PASSWORD 'secret'
    DB 'app_db'
    TABLE 'customers'
    SSLMODE 'require'
))
```

## Handle Large PostgreSQL Tables

For tables with millions of rows, use `sparse_hashed` layout and add a WHERE filter:

```sql
LAYOUT(SPARSE_HASHED())
```

Also consider adding a PostgreSQL index on the primary key column used in the dictionary source query.

## Reload on Demand

```sql
SYSTEM RELOAD DICTIONARY customer_dict;
```

## Summary

PostgreSQL dictionary sources in ClickHouse allow you to seamlessly enrich analytical queries with transactional reference data. Use filtered WHERE clauses to limit dictionary size, custom QUERY for joins, and appropriate layouts based on key distribution and memory constraints.
