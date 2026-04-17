# How to Create a Dictionary in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, Dictionary, Lookup, Join

Description: Learn how to create ClickHouse dictionaries with CREATE DICTIONARY, covering SOURCE options, LAYOUT types, LIFETIME, and fast key-value lookups.

---

Dictionaries in ClickHouse are in-memory key-value stores loaded from an external source - a flat file, another ClickHouse table, MySQL, PostgreSQL, HTTP endpoint, and more. They are designed for fast, low-latency lookups that would otherwise require expensive JOIN operations at query time. Common use cases include IP-to-country mapping, user ID to profile attribute enrichment, product code to product name resolution, and any other reference dataset that is read frequently but updated infrequently.

## Basic CREATE DICTIONARY Syntax

```sql
CREATE DICTIONARY [IF NOT EXISTS] [db.]dict_name
(
    key_column  DataType,
    attr1       DataType [DEFAULT value],
    attr2       DataType [DEFAULT value]
)
PRIMARY KEY key_column
SOURCE(source_definition)
LAYOUT(layout_type)
LIFETIME(MIN 0 MAX 3600);
```

## Source Types

### FILE Source

Load a dictionary from a local CSV or TSV file on the ClickHouse server:

```sql
CREATE DICTIONARY country_codes
(
    code    String,
    name    String,
    region  String DEFAULT 'Unknown'
)
PRIMARY KEY code
SOURCE(FILE(
    path '/var/lib/clickhouse/user_files/countries.csv'
    format 'CSV'
))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(MIN 3600 MAX 86400);
```

Because the primary key here is a `String`, we use `COMPLEX_KEY_HASHED` - the plain `HASHED` layout only accepts numeric (UInt64) keys.

### CLICKHOUSE Source

Load from another ClickHouse table (local or remote):

```sql
CREATE DICTIONARY user_lookup
(
    user_id   UInt64,
    email     String,
    plan      LowCardinality(String) DEFAULT 'free'
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(
    host 'localhost'
    port 9000
    user 'default'
    password ''
    db   'production'
    table 'users'
))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 600);
```

For a local table you can use `host 'localhost'` and omit the password if using trust authentication.

### MYSQL Source

```sql
CREATE DICTIONARY product_catalog
(
    product_id   UInt32,
    product_name String,
    category     String,
    price        Float64 DEFAULT 0
)
PRIMARY KEY product_id
SOURCE(MYSQL(
    host     'mysql-host'
    port     3306
    user     'reader'
    password 'secret'
    db       'catalog'
    table    'products'
))
LAYOUT(HASHED())
LIFETIME(MIN 600 MAX 1800);
```

### HTTP Source

Load from an HTTP or HTTPS endpoint returning a supported format (CSV, TSV, JSONEachRow, etc.):

```sql
CREATE DICTIONARY ip_asn
(
    ip_prefix String,
    asn       UInt32,
    org_name  String DEFAULT ''
)
PRIMARY KEY ip_prefix
SOURCE(HTTP(
    url    'https://data.example.com/ip-asn.csv'
    format 'CSV'
))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(MIN 3600 MAX 7200);
```

## Layout Types

The layout determines the in-memory data structure. Choose based on key type and cardinality.

### FLAT

The fastest layout. Uses a plain array indexed by a `UInt64` key. By default it holds up to 500,000 elements, configurable via the `max_array_size` parameter.

```sql
LAYOUT(FLAT())
```

### HASHED

Hash table for numeric (`UInt64`) keys. Good general-purpose choice for integer-keyed dictionaries.

```sql
LAYOUT(HASHED())
```

### SPARSE_HASHED

Like `HASHED` but uses less memory at the cost of slightly slower lookups. Good for large dictionaries.

```sql
LAYOUT(SPARSE_HASHED())
```

### COMPLEX_KEY_HASHED

Required when the primary key is a `String`, a composite of multiple columns, or any non-`UInt64` type:

```sql
CREATE DICTIONARY composite_lookup
(
    country  String,
    city     String,
    timezone String DEFAULT 'UTC'
)
PRIMARY KEY (country, city)
SOURCE(CLICKHOUSE(
    host 'localhost' port 9000 user 'default' password ''
    db 'geo' table 'city_tz'
))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(MIN 3600 MAX 86400);
```

### HASHED_ARRAY

More memory-efficient than `HASHED` for multi-attribute dictionaries: keys live in a single hash table that maps to indices in parallel attribute arrays, rather than one hash table per attribute. Use `COMPLEX_KEY_HASHED_ARRAY` for non-`UInt64` or composite keys.

```sql
LAYOUT(HASHED_ARRAY())
```

### CACHE

Keeps only a fixed number of entries in memory (LRU cache). Good when the dictionary is very large but only a fraction of keys are hot.

```sql
LAYOUT(CACHE(SIZE_IN_CELLS 1000000))
```

Cache layout does not bulk pre-load the dictionary, so cache misses fetch from the source on demand and introduce lookup latency. Asynchronous refresh of expired keys can be enabled with `allow_read_expired_keys`.

### IP_TRIE

Specialized layout for IP prefix/CIDR lookups:

```sql
CREATE DICTIONARY geo_ip
(
    prefix    String,
    country   String,
    asn       UInt32
)
PRIMARY KEY prefix
SOURCE(FILE(
    path   '/var/lib/clickhouse/user_files/geoip.csv'
    format 'CSV'
))
LAYOUT(IP_TRIE())
LIFETIME(MIN 3600 MAX 86400);
```

## LIFETIME - Reload Schedule

`LIFETIME` controls how often ClickHouse reloads the dictionary from its source.

```sql
-- Reload between 300 and 600 seconds (randomized to spread load)
LIFETIME(MIN 300 MAX 600)

-- Never reload (static data)
LIFETIME(0)

-- Reload every hour
LIFETIME(MIN 3600 MAX 3600)
```

ClickHouse uses a random value between MIN and MAX to avoid synchronized reloads across multiple nodes.

## Querying with dictGet Functions

Use `dictGet` functions to look up values without a JOIN:

```sql
-- Single attribute lookup
SELECT
    user_id,
    dictGet('user_lookup', 'plan', user_id) AS user_plan
FROM events;

-- Multiple attributes
SELECT
    event_id,
    dictGet('country_codes', 'name', country_code)   AS country_name,
    dictGet('country_codes', 'region', country_code) AS region
FROM pageviews;

-- With a default for missing keys
SELECT dictGetOrDefault('user_lookup', 'email', toUInt64(999), 'unknown@example.com');

-- Null for missing keys
SELECT dictGetOrNull('user_lookup', 'email', toUInt64(999));
```

## JOIN with a Dictionary Table

Dictionaries are also accessible as tables via the `Dictionary` engine:

```sql
SELECT
    e.user_id,
    e.event_type,
    u.plan
FROM events e
LEFT JOIN user_lookup u ON e.user_id = u.user_id;
```

For large fact tables, `dictGet` is generally faster than a JOIN because it avoids materializing the join result.

## Managing Dictionaries

```sql
-- List all dictionaries
SELECT name, status, element_count, bytes_allocated
FROM system.dictionaries;

-- Force a reload
SYSTEM RELOAD DICTIONARY user_lookup;

-- Drop a dictionary
DROP DICTIONARY IF EXISTS user_lookup;
```

## Summary

ClickHouse dictionaries provide fast in-memory key-value lookups backed by external sources like files, ClickHouse tables, MySQL, or HTTP endpoints. The `LAYOUT` clause controls the in-memory structure - `HASHED` covers most use cases while `FLAT` is fastest for small integer keys and `IP_TRIE` handles CIDR lookups. The `LIFETIME` clause schedules automatic reloads. Use `dictGet` functions in queries for low-latency attribute enrichment that outperforms JOIN-based approaches on large datasets.
