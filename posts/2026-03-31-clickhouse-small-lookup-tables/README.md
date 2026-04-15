# How to Handle Small Lookup Tables in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, Lookup Table, Join, Performance, Cache

Description: Use ClickHouse dictionaries and in-memory joins to efficiently handle small lookup tables without the overhead of distributed joins.

---

## Why Small Lookup Tables Are Different

In OLTP databases, you join lookup tables constantly without thinking. In ClickHouse, joins across distributed nodes are expensive. But small lookup tables (countries, currencies, product categories) are perfect candidates for dictionaries - ClickHouse's built-in in-memory key-value store.

## Creating a Dictionary from a ClickHouse Table

First, create the source table:

```sql
CREATE TABLE country_codes (
    code LowCardinality(String),
    name String,
    region String
) ENGINE = MergeTree()
ORDER BY code;

INSERT INTO country_codes VALUES
('US', 'United States', 'North America'),
('DE', 'Germany', 'Europe'),
('JP', 'Japan', 'Asia');
```

Then create a dictionary that loads from it:

```sql
CREATE DICTIONARY country_dict (
    code   String,
    name   String,
    region String
)
PRIMARY KEY code
SOURCE(CLICKHOUSE(TABLE 'country_codes'))
LIFETIME(MIN 300 MAX 600)
LAYOUT(HASHED());
```

## Querying with dictGet

Use dictionary lookup functions instead of JOINs:

```sql
SELECT
    user_id,
    country_code,
    dictGet('country_dict', 'name', country_code) AS country_name,
    dictGet('country_dict', 'region', country_code) AS region
FROM user_events
WHERE ts >= today();
```

This avoids a JOIN entirely and runs at memory speed.

## Dictionary Layout Options

Choose the right layout for your data size and access pattern:

| Layout | Best For | Memory |
|--------|----------|--------|
| `FLAT` | Small (<500K rows), UInt64 keys only | High |
| `HASHED` | Medium, string or integer keys | Medium |
| `CACHE` | Large dicts, partial cache | Low |
| `RANGE_HASHED` | Time-varying lookups | Medium |

For a small table with numeric IDs and a few hundred rows, `FLAT` is fastest:

```sql
LAYOUT(FLAT());
```

Since `FLAT` requires UInt64 keys, use `HASHED` for string-keyed dictionaries like country codes.

## Reloading Dictionaries

Force a reload after updating the source table:

```sql
SYSTEM RELOAD DICTIONARY country_dict;
```

Check dictionary status:

```sql
SELECT name, status, last_successful_update_time, bytes_allocated
FROM system.dictionaries
WHERE name = 'country_dict';
```

## Using JOIN for Small Tables

If you prefer standard SQL, ClickHouse can still handle small lookup table JOINs efficiently when the right table fits in memory:

```sql
SELECT e.user_id, c.name
FROM user_events e
JOIN country_codes c ON e.country_code = c.code
WHERE e.ts >= today()
SETTINGS join_algorithm = 'hash';
```

Set `join_use_nulls = 1` if you need LEFT JOIN semantics with NULL for unmatched rows.

## Summary

Dictionaries are the recommended way to handle small lookup tables in ClickHouse. They load data into memory, support automatic refresh, and replace JOINs with O(1) lookups. For tables under a few million rows, a `HASHED` or `FLAT` dictionary will outperform any JOIN-based approach.
