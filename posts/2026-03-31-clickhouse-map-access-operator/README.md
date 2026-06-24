# How to Use the -> Operator for Map Access in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Map, Map Access, Operator, JSON

Description: Learn how to access Map type columns in ClickHouse using the subscript operator and helper functions for key lookup, iteration, and filtering.

---

## Map Type in ClickHouse

ClickHouse's `Map(K, V)` type stores key-value pairs with fixed key and value types. It is suitable for dynamic property bags, label sets, and tag collections.

```sql
CREATE TABLE metrics (
  metric_id UInt64,
  labels Map(String, String),
  values Map(String, Float64),
  ts DateTime
) ENGINE = MergeTree()
ORDER BY (metric_id, ts)
```

## Accessing Map Values with []

Use the subscript operator `map_col['key']` to retrieve a value by key. If the key does not exist, the default value for the value type is returned (empty string for String, 0 for numeric types).

```sql
SELECT
  metric_id,
  labels['env'] AS environment,
  labels['service'] AS service,
  values['cpu_usage'] AS cpu
FROM metrics
WHERE labels['env'] = 'production'
```

## Checking Key Existence with mapContains

To distinguish between a missing key and a key with a zero/empty value, use `mapContains(map_col, key)`.

```sql
SELECT metric_id
FROM metrics
WHERE mapContains(labels, 'region')
  AND labels['region'] = 'us-east-1'
```

## Getting All Keys and Values

`mapKeys(map_col)` and `mapValues(map_col)` return arrays of all keys and values respectively.

```sql
SELECT
  metric_id,
  mapKeys(labels) AS all_label_keys,
  mapValues(labels) AS all_label_values
FROM metrics
LIMIT 5
```

## Iterating over Map Entries

Use `arrayJoin` with `mapKeys` to unnest a map into rows.

```sql
SELECT
  metric_id,
  key,
  labels[key] AS value
FROM metrics
ARRAY JOIN mapKeys(labels) AS key
WHERE metric_id = 42
```

## Filtering by Map Contents

Find rows where any label value matches a pattern.

```sql
SELECT metric_id, labels
FROM metrics
WHERE hasAny(mapValues(labels), ['prod', 'production', 'live'])
```

## Building a Map with map() Function

```sql
SELECT
  user_id,
  map('region', region, 'plan', plan, 'tier', tier) AS user_labels
FROM users
```

## Merging Maps

`mapUpdate(map1, map2)` merges two maps, with values from `map2` overwriting `map1` on key conflicts.

```sql
SELECT mapUpdate(
  map('a', 1, 'b', 2),
  map('b', 99, 'c', 3)
) AS merged
-- {'a': 1, 'b': 99, 'c': 3}
```

## Summary

ClickHouse's `Map(K, V)` type supports key access via `map['key']`, key existence checks with `mapContains`, and iteration using `mapKeys`/`mapValues`. Use `arrayJoin` with `mapKeys` to unnest map entries into rows. Use `mapUpdate` to merge two maps. Map types are ideal for dynamic label sets and property bags where the schema is not fixed.
