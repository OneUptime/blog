# How to Create Your First ClickHouse Dictionary

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, Join, Lookup, Performance

Description: Learn how to create a ClickHouse dictionary for fast key-value lookups, avoiding slow JOIN operations on large analytical tables.

---

ClickHouse dictionaries are in-memory or on-disk lookup tables that make it fast to enrich query results with dimensional data. Instead of joining a billion-row fact table with a dimension table, you load the dimension into a dictionary and look up values in microseconds.

## When to Use Dictionaries

Dictionaries are ideal for:
- Country code to country name mappings
- User ID to user attributes (name, tier, region)
- Product ID to product metadata
- IP address to geolocation data

## Creating a Source Table

Start with a dimension table in ClickHouse:

```sql
CREATE TABLE countries (
    code String,
    name String,
    region String
) ENGINE = MergeTree()
ORDER BY code;

INSERT INTO countries VALUES
    ('US', 'United States', 'Americas'),
    ('DE', 'Germany', 'Europe'),
    ('JP', 'Japan', 'Asia Pacific'),
    ('BR', 'Brazil', 'Americas');
```

## Defining the Dictionary

```sql
CREATE DICTIONARY country_dict (
    code String,
    name String,
    region String
)
PRIMARY KEY code
SOURCE(CLICKHOUSE(TABLE 'countries' DB 'default'))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(MIN 300 MAX 600);
```

The `LIFETIME` setting controls how often ClickHouse refreshes the dictionary from the source. `COMPLEX_KEY_HASHED` stores data as a hash map for O(1) lookups and is required here because the primary key is a `String` (the plain `HASHED` layout only supports `UInt64` keys).

## Using the Dictionary in Queries

Use `dictGet` to look up a single attribute:

```sql
SELECT
    user_id,
    country_code,
    dictGet('country_dict', 'name', country_code) AS country_name,
    dictGet('country_dict', 'region', country_code) AS region
FROM events
LIMIT 10;
```

Or use `dictGetOrDefault` when the key might not exist:

```sql
SELECT
    country_code,
    dictGetOrDefault('country_dict', 'name', country_code, 'Unknown') AS country_name
FROM events
GROUP BY country_code;
```

## Loading from External Sources

Dictionaries can also load from MySQL, PostgreSQL, HTTP endpoints, or flat files:

```sql
CREATE DICTIONARY geo_ip_dict (
    ip_prefix String,
    country String
)
PRIMARY KEY ip_prefix
SOURCE(HTTP(URL 'https://example.com/geoip.csv' FORMAT 'CSV'))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(86400);
```

## Checking Dictionary Status

```sql
SELECT name, status, element_count, bytes_allocated
FROM system.dictionaries
WHERE name = 'country_dict';
```

## Manually Reloading a Dictionary

```sql
SYSTEM RELOAD DICTIONARY country_dict;
```

## Summary

ClickHouse dictionaries replace slow JOIN operations with fast in-memory lookups using `dictGet`. By defining a hashed layout (`HASHED` for `UInt64` keys or `COMPLEX_KEY_HASHED` for `String`/composite keys) with appropriate `LIFETIME` settings, you get automatically refreshed dimension data that enriches analytical queries without impacting scan performance on your fact tables.
