# What Is a Dictionary and How It Works in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, dictGet, JOIN Optimization, External Data

Description: Learn what dictionaries are in ClickHouse, how they provide fast in-memory key-value lookups, and how to use them to replace expensive JOIN queries.

---

Dictionaries in ClickHouse are in-memory key-value stores that serve as lookup tables. They are loaded from external sources (databases, files, HTTP endpoints) and refreshed on a configurable schedule. The main use case is replacing slow JOIN queries with fast `dictGet` lookups.

## Why Use Dictionaries Instead of JOINs?

Every time a query runs a JOIN against a dimension table, ClickHouse must build a hash table in memory. For small dimension tables queried millions of times per day, this is wasteful. Dictionaries load the dimension table once and keep it in RAM, making lookups O(1) per row.

## Creating a Dictionary

```sql
CREATE DICTIONARY ip_to_country (
  ip_range_start UInt32,
  ip_range_end   UInt32,
  country_code   String
)
PRIMARY KEY ip_range_start
SOURCE(CLICKHOUSE(TABLE 'ip_ranges' DATABASE 'geoip'))
LAYOUT(RANGE_HASHED())
RANGE(MIN ip_range_start MAX ip_range_end)
LIFETIME(MIN 3600 MAX 7200);
```

## Dictionary Layouts

The layout determines the in-memory data structure.

**FLAT** - Array indexed by integer key. Fastest lookup, uses most memory. Good for small integer-keyed tables (under a few million rows).

```sql
LAYOUT(FLAT())
```

**HASHED** - Hash map for single UInt64 key. Good for most dimension tables.

```sql
LAYOUT(HASHED())
```

**HASHED_ARRAY** - More memory-efficient hashed layout for large dictionaries.

```sql
LAYOUT(HASHED_ARRAY())
```

**COMPLEX_KEY_HASHED** - Supports composite primary keys.

```sql
LAYOUT(COMPLEX_KEY_HASHED())
```

## Using dictGet for Lookups

```sql
-- Lookup country from a user_id
SELECT
  user_id,
  dictGet('users_dict', 'country', user_id) AS country
FROM events;
```

With `COMPLEX_KEY_HASHED`:

```sql
SELECT
  session_id,
  dictGet('session_dict', 'plan_type', (user_id, session_id)) AS plan
FROM events;
```

## Dictionary Sources

Dictionaries can be loaded from multiple sources:

```sql
-- From a ClickHouse table
SOURCE(CLICKHOUSE(TABLE 'dim_users' DATABASE 'analytics'))

-- From a PostgreSQL table
SOURCE(POSTGRESQL(HOST 'pg-host' PORT 5432 USER 'reader'
  PASSWORD 'pass' DB 'mydb' TABLE 'users'))

-- From a CSV file
SOURCE(FILE(PATH '/etc/clickhouse-server/dicts/countries.csv' FORMAT CSV))

-- From an HTTP endpoint
SOURCE(HTTP(URL 'https://api.example.com/dict.csv' FORMAT CSV))
```

## LIFETIME - Refresh Interval

```sql
LIFETIME(MIN 3600 MAX 7200)
```

ClickHouse refreshes the dictionary after a random interval between MIN and MAX seconds. This prevents thundering herd refreshes when multiple dictionaries expire simultaneously.

## Checking Dictionary Status

```sql
SELECT name, status, bytes_allocated, element_count, last_successful_update_time
FROM system.dictionaries;
```

## Summary

Dictionaries are in-memory lookup tables that eliminate per-query hash table builds for dimension data. Use `HASHED` layout for general-purpose lookups, `FLAT` for small integer-keyed tables, and configure `LIFETIME` to keep data fresh. Replacing hot JOIN patterns with `dictGet` lookups can reduce query latency by 5-10x on high-concurrency dashboards.
