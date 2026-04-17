# ClickHouse Dictionary Layouts Feature Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, HASHED, RANGE_HASHED, Cache, Memory, Lookup

Description: A comparison of ClickHouse dictionary layout types - flat, hashed, range_hashed, cache, ssd_cache, and ip_trie - with memory and performance characteristics.

---

## What Are Dictionaries

ClickHouse dictionaries are in-memory key-value lookup structures loaded from external or internal sources. They enable fast joins without the cost of a SQL JOIN operation. The layout controls how data is stored and looked up in memory.

## Layout Comparison Table

```text
Layout          | Key Type       | Memory Model     | Load Strategy | Best For
----------------|----------------|------------------|---------------|---------------------
flat            | UInt64         | Array (dense)    | Full          | Small (< 1M rows), sequential IDs
hashed          | UInt64         | Hash map         | Full          | Medium, integer keys
sparse_hashed   | UInt64         | Sparse hash map  | Full          | Large, memory-constrained
hashed_array    | UInt64         | Array of arrays  | Full          | Large UInt64 key sets
range_hashed    | UInt64 + range | Hash + interval  | Full          | Time-range lookups
cache           | UInt64         | Fixed cache      | On demand     | Very large, partial access
ssd_cache       | UInt64         | SSD-backed cache | On demand     | Larger than RAM datasets
complex_key_hashed | Composite   | Hash map         | Full          | Multi-column keys
ip_trie         | String (CIDR)  | Trie             | Full          | IP geolocation
```

## flat Layout - Dense Array

```sql
CREATE DICTIONARY country_dict (
  id      UInt64,
  name    String,
  code    String
)
PRIMARY KEY id
SOURCE(CLICKHOUSE(TABLE 'countries' DB 'ref'))
LAYOUT(FLAT())
LIFETIME(MIN 300 MAX 600);
```

Stores values in a plain array indexed by key. Only works for UInt64 keys with no large gaps. Fastest possible lookup.

## hashed Layout - Hash Map

```sql
CREATE DICTIONARY user_segment_dict (
  user_id UInt64,
  segment String
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(TABLE 'user_segments' DB 'analytics'))
LAYOUT(HASHED())
LIFETIME(MIN 60 MAX 120);
```

General-purpose layout. Requires a UInt64 key (use `complex_key_hashed` for composite or non-integer keys). Memory usage is higher than flat but handles gaps in key space.

## range_hashed - Time-Range Lookups

```sql
CREATE DICTIONARY exchange_rate_dict (
  currency   String,
  rate_from  Date,
  rate_to    Date,
  usd_rate   Float64
)
PRIMARY KEY currency
SOURCE(CLICKHOUSE(TABLE 'exchange_rates' DB 'finance'))
LAYOUT(COMPLEX_KEY_RANGE_HASHED())
RANGE(MIN rate_from MAX rate_to)
LIFETIME(MIN 3600 MAX 7200);
```

Look up values that were valid at a specific point in time:

```sql
SELECT dictGetFloat64('exchange_rate_dict', 'usd_rate',
  'EUR', toDate('2026-03-15')) AS rate;
```

## cache Layout - Partial Loading

```sql
CREATE DICTIONARY large_product_dict (
  product_id UInt64,
  name       String,
  category   String
)
PRIMARY KEY product_id
SOURCE(CLICKHOUSE(TABLE 'products' DB 'catalog'))
LAYOUT(CACHE(SIZE_IN_CELLS 100000))
LIFETIME(MIN 60 MAX 120);
```

Only caches recently accessed keys. Suitable when the full dictionary does not fit in RAM. Cache misses trigger source queries.

## ip_trie - IP Geolocation

```sql
CREATE DICTIONARY ip_geo_dict (
  prefix  String,
  country String,
  asn     UInt32
)
PRIMARY KEY prefix
SOURCE(FILE(PATH '/var/lib/clickhouse/geo_ip.csv' FORMAT CSV))
LAYOUT(IP_TRIE())
LIFETIME(MIN 3600 MAX 7200);

-- Lookup
SELECT dictGetString('ip_geo_dict', 'country', toIPv4('8.8.8.8')) AS country;
```

## Summary

Use `flat` for small dictionaries with sequential UInt64 keys, `hashed` for general-purpose medium-sized lookups, `range_hashed` for time-valid attribute lookups like exchange rates or pricing tiers, `cache` when the dataset is too large for RAM and access is sparse, and `ip_trie` for IP address to geolocation mapping. Always set `LIFETIME` to allow ClickHouse to reload updated dictionary data automatically.
