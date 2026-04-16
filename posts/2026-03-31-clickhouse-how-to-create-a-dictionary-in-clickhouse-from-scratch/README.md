# How to Create a Dictionary in ClickHouse from Scratch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionaries, Lookup Table, Performance, DDL

Description: Learn how to create, configure, and use ClickHouse dictionaries for fast key-value lookups that join reference data without expensive JOIN operations.

---

## What Are ClickHouse Dictionaries

Dictionaries in ClickHouse are in-memory key-value stores loaded from external sources (other ClickHouse tables, MySQL, files, etc.). They enable fast lookup operations that replace expensive JOIN queries with dictionary function calls.

Common use cases:
- Enriching event data with user or product metadata
- IP address to country/region lookup
- Code to label mapping (status codes, country codes, product categories)

## Creating a Dictionary from a ClickHouse Table

The most common pattern is loading a dictionary from another ClickHouse table:

```sql
-- Step 1: Create the source table
CREATE TABLE country_codes (
    code FixedString(2),
    name String,
    continent String,
    population UInt32
) ENGINE = MergeTree()
ORDER BY code;

-- Insert reference data
INSERT INTO country_codes VALUES
('US', 'United States', 'North America', 331000000),
('GB', 'United Kingdom', 'Europe', 67000000),
('DE', 'Germany', 'Europe', 83000000),
('JP', 'Japan', 'Asia', 126000000),
('AU', 'Australia', 'Oceania', 25000000);

-- Step 2: Create the dictionary
CREATE DICTIONARY country_dict (
    code FixedString(2),
    name String DEFAULT 'Unknown',
    continent String DEFAULT 'Unknown',
    population UInt32 DEFAULT 0
)
PRIMARY KEY code
SOURCE(CLICKHOUSE(TABLE 'country_codes' DB 'default'))
LAYOUT(FLAT())
LIFETIME(MIN 60 MAX 3600);
```

## Dictionary Layout Options

The layout controls how the dictionary is stored in memory:

```sql
-- FLAT: array-based, fastest, only for UInt64 keys (default max key value 500k)
LAYOUT(FLAT())

-- HASHED: hash table, good for string/integer keys up to millions
LAYOUT(HASHED())

-- SPARSE_HASHED: less memory, slightly slower than HASHED
LAYOUT(SPARSE_HASHED())

-- CACHE: LRU cache, loads on demand (good for huge datasets)
LAYOUT(CACHE(SIZE_IN_CELLS 10000))

-- RANGE_HASHED: range-based, for time-range lookups
LAYOUT(RANGE_HASHED())

-- COMPLEX_KEY_HASHED: for compound primary keys
LAYOUT(COMPLEX_KEY_HASHED())
```

## Using a Dictionary in Queries

```sql
-- dictGet: fetch a single attribute
SELECT
    country_code,
    dictGet('country_dict', 'name', country_code) AS country_name,
    dictGet('country_dict', 'continent', country_code) AS continent
FROM user_events
LIMIT 10;

-- dictGetOrDefault: return fallback when key not found
SELECT dictGetOrDefault('country_dict', 'name', 'XX', 'Unknown Country');

-- dictGetOrNull: return NULL when key not found
SELECT dictGetOrNull('country_dict', 'name', toFixedString('XX', 2));

-- dictHas: check if key exists
SELECT dictHas('country_dict', toFixedString('US', 2));  -- 1
SELECT dictHas('country_dict', toFixedString('ZZ', 2));  -- 0
```

## Creating a Dictionary from a File

```sql
-- Create dictionary from a CSV file
CREATE DICTIONARY product_dict (
    product_id UInt32,
    name String DEFAULT 'Unknown Product',
    category String DEFAULT 'Uncategorized',
    price Float32 DEFAULT 0.0
)
PRIMARY KEY product_id
SOURCE(FILE(PATH '/var/lib/clickhouse/user_files/products.csv' FORMAT CSVWithNames))
LAYOUT(HASHED())
LIFETIME(3600);
```

The CSV file at `/var/lib/clickhouse/user_files/products.csv`:

```text
product_id,name,category,price
1,Widget Pro,Electronics,29.99
2,Super Cable,Accessories,9.99
3,Mega Stand,Accessories,19.99
```

## Creating a Dictionary from MySQL

```sql
CREATE DICTIONARY user_dict (
    user_id UInt64,
    email String,
    plan LowCardinality(String),
    created_at DateTime
)
PRIMARY KEY user_id
SOURCE(MYSQL(
    HOST 'mysql-host'
    PORT 3306
    USER 'reader'
    PASSWORD 'secret'
    DB 'users_db'
    TABLE 'users'
))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 900);
```

## Compound (Complex) Keys

```sql
-- Dictionary with multiple keys
CREATE DICTIONARY ip_to_location (
    ip_prefix String,
    region String DEFAULT 'Unknown',
    country String DEFAULT 'Unknown'
)
PRIMARY KEY ip_prefix
SOURCE(CLICKHOUSE(TABLE 'ip_ranges' DB 'default'))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(3600);

-- Query with complex key
SELECT dictGet('ip_to_location', 'country', tuple('192.168.'));
```

## Managing Dictionaries

```sql
-- View all dictionaries
SELECT name, status, source, type, bytes_allocated, element_count
FROM system.dictionaries
WHERE database = currentDatabase();

-- Reload a dictionary manually
SYSTEM RELOAD DICTIONARY country_dict;

-- Reload all dictionaries
SYSTEM RELOAD DICTIONARIES;

-- Drop a dictionary
DROP DICTIONARY IF EXISTS country_dict;
```

## Practical Example: Enriching Event Data

```sql
-- Events with raw country codes
CREATE TABLE purchases (
    purchase_id UInt64,
    user_id UInt64,
    product_id UInt32,
    country_code FixedString(2),
    amount Float64,
    purchased_at DateTime
) ENGINE = MergeTree()
ORDER BY (purchased_at, user_id);

-- Enrich with dictionary lookups
SELECT
    purchased_at,
    dictGet('country_dict', 'name', country_code) AS country,
    dictGet('country_dict', 'continent', country_code) AS continent,
    dictGet('product_dict', 'category', product_id) AS category,
    sum(amount) AS revenue,
    count() AS transactions
FROM purchases
WHERE purchased_at >= now() - INTERVAL 30 DAY
GROUP BY
    purchased_at,
    country_code,
    product_id
ORDER BY revenue DESC;
```

## Summary

ClickHouse dictionaries are in-memory key-value lookups that replace slow JOINs against reference tables. Create them with `CREATE DICTIONARY`, specifying a source (ClickHouse table, file, MySQL, etc.), a memory layout (`FLAT`, `HASHED`, `CACHE`), a lifetime for refresh, and key/value columns. Use `dictGet`, `dictGetOrDefault`, and `dictHas` functions in queries for fast enrichment. Dictionaries are ideal for low-cardinality reference data like country codes, product catalogs, and user metadata.
