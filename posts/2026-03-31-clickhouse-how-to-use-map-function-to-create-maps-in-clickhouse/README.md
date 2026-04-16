# How to Use map() Function to Create Maps in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Map, Key-Value, SQL, Data Type

Description: Learn how to use the map() function in ClickHouse to create Map(key, value) typed structures for storing and querying key-value data inline.

---

## Overview

ClickHouse supports a `Map(K, V)` data type for storing key-value pairs. The `map()` function creates a Map literal inline. Maps are useful for flexible attribute storage, dynamic metadata, and label-based filtering without needing many columns.

## Creating Maps with map()

```sql
SELECT map('key1', 1, 'key2', 2, 'key3', 3) AS my_map
-- {'key1': 1, 'key2': 2, 'key3': 3}
```

The arguments alternate between keys and values. All keys must have the same type, and all values must have the same type.

## Accessing Map Values

Use bracket notation to access map values:

```sql
SELECT
    map('a', 10, 'b', 20, 'c', 30) AS m,
    m['a']   AS val_a,
    m['b']   AS val_b
```

Accessing a missing key returns the zero value for the value type:

```sql
SELECT map('x', 1)['missing_key'] AS result
-- 0
```

## Storing Maps in Tables

```sql
CREATE TABLE server_metrics
(
    server_id  String,
    labels     Map(String, String),
    counters   Map(String, UInt64)
)
ENGINE = MergeTree()
ORDER BY server_id;

INSERT INTO server_metrics VALUES
('srv-01', {'env': 'prod', 'region': 'us-east'}, {'requests': 10000, 'errors': 42}),
('srv-02', {'env': 'staging', 'region': 'eu-west'}, {'requests': 500, 'errors': 3});
```

## Querying Map Columns

Read specific keys from a Map column:

```sql
SELECT
    server_id,
    labels['env']      AS environment,
    labels['region']   AS region,
    counters['errors'] AS error_count
FROM server_metrics
```

## Filtering by Map Values

Use bracket access in WHERE clauses:

```sql
SELECT server_id, labels
FROM server_metrics
WHERE labels['env'] = 'prod'
```

## mapKeys() and mapValues()

Extract all keys or values as arrays:

```sql
SELECT
    server_id,
    mapKeys(labels)   AS label_keys,
    mapValues(labels) AS label_values
FROM server_metrics
```

## mapContains() - Safe Key Check

Before accessing a key, check if it exists:

```sql
SELECT
    server_id,
    mapContains(labels, 'env')    AS has_env,
    if(mapContains(labels, 'dc'), labels['dc'], 'unknown') AS datacenter
FROM server_metrics
```

## Merging Maps with mapUpdate()

`mapUpdate(map1, map2)` merges two maps; keys in `map2` overwrite those in `map1`:

```sql
SELECT mapUpdate(
    map('a', 1, 'b', 2),
    map('b', 99, 'c', 3)
) AS merged
-- {'a': 1, 'b': 99, 'c': 3}
```

## Building Maps from Arrays

Use `arrayZip` and cast to Map to build maps from two parallel arrays:

```sql
SELECT CAST((arrayZip(['k1','k2','k3'], [10, 20, 30])), 'Map(String, UInt32)') AS from_arrays
```

## Practical Use Case - Dynamic Tags

Store infrastructure tags as maps instead of creating many optional columns:

```sql
SELECT
    server_id,
    labels['env']    AS env,
    labels['team']   AS team,
    counters['requests'] AS total_requests
FROM server_metrics
WHERE mapContains(labels, 'team')
ORDER BY total_requests DESC
```

## Summary

The `map()` function in ClickHouse creates typed `Map(K, V)` structures inline. Map columns support bracket access, `mapKeys()`, `mapValues()`, `mapContains()`, and `mapUpdate()` for flexible key-value querying. Maps are an excellent alternative to wide schemas when attribute names are dynamic or sparse.
