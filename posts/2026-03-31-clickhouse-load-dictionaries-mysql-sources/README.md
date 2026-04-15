# How to Load Dictionaries from MySQL Sources in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, MySQL, Integration, Lookup

Description: Learn how to load ClickHouse dictionaries from MySQL tables, enabling real-time lookups against your MySQL reference data without manual syncing.

---

## Why Load from MySQL

Many teams store reference data (product catalogs, customer records, configuration tables) in MySQL. Loading these as ClickHouse dictionaries lets you do fast JOIN-like lookups in queries without ETL pipelines.

## MySQL Dictionary with Full Table Load

```sql
CREATE DICTIONARY product_catalog_dict (
    product_id UInt64,
    name String DEFAULT '',
    category String DEFAULT '',
    price Float64 DEFAULT 0.0,
    is_active UInt8 DEFAULT 0
)
PRIMARY KEY product_id
SOURCE(MYSQL(
    HOST 'mysql.internal.example.com'
    PORT 3306
    USER 'clickhouse_readonly'
    PASSWORD 'secure_password'
    DB 'catalog'
    TABLE 'products'
))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 600);
```

## MySQL with WHERE Filter

Load only active records to reduce dictionary size:

```sql
CREATE DICTIONARY active_users_dict (
    user_id UInt64,
    email String DEFAULT '',
    plan String DEFAULT 'free',
    country String DEFAULT ''
)
PRIMARY KEY user_id
SOURCE(MYSQL(
    HOST 'mysql.internal'
    PORT 3306
    USER 'ch_reader'
    PASSWORD 'secret'
    DB 'users_db'
    TABLE 'users'
    WHERE 'is_active = 1 AND deleted_at IS NULL'
))
LAYOUT(HASHED())
LIFETIME(600);
```

## MySQL with Custom QUERY

Use a custom SQL query to join or transform data from MySQL:

```sql
CREATE DICTIONARY customer_enriched_dict (
    customer_id UInt64,
    full_name String DEFAULT '',
    subscription_tier String DEFAULT 'free',
    region String DEFAULT ''
)
PRIMARY KEY customer_id
SOURCE(MYSQL(
    HOST 'mysql.internal'
    PORT 3306
    USER 'ch_reader'
    PASSWORD 'secret'
    DB 'crm'
    QUERY 'SELECT c.id AS customer_id, CONCAT(c.first_name, " ", c.last_name) AS full_name, s.tier AS subscription_tier, r.name AS region FROM customers c JOIN subscriptions s ON c.id = s.customer_id JOIN regions r ON c.region_id = r.id'
))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 600);
```

## Using the Dictionary in Queries

```sql
SELECT
    order_id,
    product_id,
    quantity,
    dictGetFloat64OrDefault('product_catalog_dict', 'price', product_id, 0.0) AS unit_price,
    dictGetString('product_catalog_dict', 'category', product_id) AS category,
    quantity * dictGetFloat64OrDefault('product_catalog_dict', 'price', product_id, 0.0) AS line_total
FROM order_items
WHERE order_date >= today() - 7;
```

## Check MySQL Dictionary Status

```sql
SELECT
    name,
    status,
    element_count,
    formatReadableSize(bytes_allocated) AS memory_used,
    last_successful_update_time,
    last_exception
FROM system.dictionaries
WHERE name LIKE '%mysql%' OR source LIKE '%MySQL%';
```

## Troubleshoot Connection Issues

If the dictionary fails to load, check the exception:

```sql
SELECT last_exception
FROM system.dictionaries
WHERE name = 'product_catalog_dict';
```

Common issues:
- MySQL user lacks SELECT permission on the table
- Firewall blocking port 3306 from ClickHouse server
- Wrong password or hostname

## Multiple Replicas

```sql
SOURCE(MYSQL(
    REPLICA(HOST 'mysql-primary' PRIORITY 1 PORT 3306 USER 'reader' PASSWORD 'secret')
    REPLICA(HOST 'mysql-replica' PRIORITY 2 PORT 3306 USER 'reader' PASSWORD 'secret')
    DB 'catalog'
    TABLE 'products'
))
```

## Summary

MySQL dictionary sources in ClickHouse provide a seamless way to use MySQL reference data in analytical queries. With proper read-only user permissions and periodic refresh intervals, you can enrich billions of ClickHouse rows with MySQL lookup data at query time - no ETL required.
