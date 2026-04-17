# How to Use dictGet() and dictHas() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, dictGet, dictHas, Function

Description: Learn how to use dictGet() and dictHas() to perform fast in-memory dictionary lookups in ClickHouse queries, replacing expensive JOIN operations.

---

`dictGet` and `dictHas` are the primary functions for querying ClickHouse dictionaries at query time. They replace the need for JOIN operations against dimension tables by performing in-memory lookups in microseconds.

## dictGet - Basic Lookup

```sql
dictGet('dictionary_name', 'attribute_name', key)
```

- `dictionary_name` - name of the dictionary
- `attribute_name` - column to retrieve
- `key` - value matching the primary key type

Example:

```sql
SELECT
    user_id,
    dictGet('user_dict', 'country', toUInt64(user_id)) AS country
FROM events
LIMIT 10;
```

## dictGet with String Keys

```sql
SELECT
    country_code,
    dictGet('country_dict', 'country_name', country_code) AS name
FROM sessions
LIMIT 10;
```

## dictGetOrDefault - Fallback Value

Returns a default when the key is not found:

```sql
SELECT
    product_id,
    dictGetOrDefault('product_dict', 'category', toUInt64(product_id), 'Unknown') AS category
FROM orders;
```

## dictGetOrNull - Null on Missing Key

Returns `NULL` when the key is not found (available in ClickHouse 21.4+):

```sql
SELECT
    product_id,
    dictGetOrNull('product_dict', 'category', toUInt64(product_id)) AS category
FROM orders;
```

## dictHas - Existence Check

Returns 1 if the key exists, 0 otherwise:

```sql
SELECT
    order_id,
    user_id,
    dictHas('user_dict', toUInt64(user_id)) AS is_known_user
FROM orders
WHERE dictHas('user_dict', toUInt64(user_id)) = 1;
```

## Multiple Attributes in One Pass

Avoid calling `dictGet` multiple times for the same key by using a subquery or multiple calls - ClickHouse caches the lookup:

```sql
SELECT
    order_id,
    user_id,
    dictGet('user_dict', 'email',   toUInt64(user_id)) AS email,
    dictGet('user_dict', 'plan',    toUInt64(user_id)) AS plan,
    dictGet('user_dict', 'country', toUInt64(user_id)) AS country
FROM orders
WHERE event_date = today();
```

## Tuple Keys for Complex Key Dictionaries

```sql
SELECT
    dictGet('product_region_prices', 'price', (ship_country, toUInt64(item_id))) AS price
FROM orders;
```

## dictGetHierarchy - Traverse Parent Chains

```sql
SELECT dictGetHierarchy('category_dict', toUInt64(leaf_id)) AS ancestor_ids;
```

## dictIsIn - Ancestor Check

```sql
SELECT dictIsIn('category_dict', toUInt64(leaf_id), toUInt64(root_id)) AS is_descendant;
```

## Performance Considerations

- `dictGet` performs an in-memory hash map lookup - typically sub-microsecond
- Calling `dictGet` inside `WHERE` is fine; ClickHouse pushes it down efficiently
- For very high cardinality keys, prefer `HASHED` layout over `FLAT`
- Use `dictGetOrDefault` to avoid exceptions on missing keys

## Comparing dictGet vs JOIN

| Approach | Latency | Memory | Freshness |
|----------|---------|--------|-----------|
| `dictGet` | ~1 us per lookup | Dictionary loaded in RAM | Refreshes on LIFETIME schedule |
| `JOIN` against table | Scans + merge | No extra memory | Always current |

## Summary

`dictGet`, `dictHas`, and `dictGetOrDefault` are the workhorses of ClickHouse dictionary usage. They turn dimension enrichment into a simple function call inside `SELECT`, eliminating the need for JOIN operations and delivering microsecond-level lookup latency for in-memory dictionaries.
