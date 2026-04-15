# How to Use Variant Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Variant

Description: Learn how ClickHouse's Variant(T1, T2, ...) type works as a typed union, how to insert different types, use discriminators, and call variantType().

---

ClickHouse's `Variant` type is a discriminated union that can hold one of a fixed set of declared types. Unlike `Dynamic`, which accepts any type at runtime, `Variant(T1, T2, ...)` constrains the allowed types at schema definition time while still allowing a single column to store different types per row. This gives you the flexibility of union types combined with the predictability of a closed type set - useful for polymorphic event fields, configuration values, or any column that can hold a few known but distinct types.

## Enabling Variant

The `Variant` type may require an experimental flag in earlier ClickHouse versions:

```sql
SET allow_experimental_variant_type = 1;
```

In ClickHouse 25.3 and later, `Variant` is generally available without the experimental setting. For versions 24.x, you still need the flag.

## Declaring a Variant Column

Specify the allowed types as a comma-separated list in parentheses:

```sql
SET allow_experimental_variant_type = 1;

CREATE TABLE config_values
(
    config_id   UInt64,
    config_key  String,
    config_val  Variant(String, UInt64, Float64, Bool, Array(String))
)
ENGINE = MergeTree()
ORDER BY config_id;
```

## Inserting Different Types

Each row can hold a value of any of the declared variant types. ClickHouse determines which variant to use based on the value's type:

```sql
INSERT INTO config_values VALUES
    (1,  'max_connections',  100),
    (2,  'db_host',          'postgres.internal'),
    (3,  'enable_cache',     true),
    (4,  'timeout_secs',     30.5),
    (5,  'allowed_origins',  ['https://app.example.com', 'https://api.example.com']),
    (6,  'worker_count',     4),
    (7,  'log_level',        'INFO'),
    (8,  'debug_mode',       false);
```

## Using variantType() to Inspect Stored Type

The `variantType()` function returns the name of the variant that is currently stored in a given row:

```sql
SELECT
    config_id,
    config_key,
    config_val,
    variantType(config_val) AS stored_type
FROM config_values
ORDER BY config_id;
```

Example output:

| config_id | config_key | config_val | stored_type |
|---|---|---|---|
| 1 | max_connections | 100 | UInt64 |
| 2 | db_host | postgres.internal | String |
| 3 | enable_cache | true | Bool |
| 4 | timeout_secs | 30.5 | Float64 |

## Accessing Specific Variant Branches

Use the dot accessor syntax to retrieve a value as a specific variant type. If the stored type does not match, the result is `NULL`:

```sql
SELECT
    config_key,
    config_val.String   AS str_value,
    config_val.UInt64   AS uint_value,
    config_val.Float64  AS float_value,
    config_val.Bool     AS bool_value
FROM config_values
ORDER BY config_id;
```

Rows where the stored type does not match the accessor return `NULL` for that column:

| config_key | str_value | uint_value | float_value | bool_value |
|---|---|---|---|---|
| max_connections | NULL | 100 | NULL | NULL |
| db_host | postgres.internal | NULL | NULL | NULL |
| enable_cache | NULL | NULL | NULL | true |

## Filtering by Variant Type

Use `variantType()` in `WHERE` to filter rows by their stored type:

```sql
-- Only rows with a numeric value
SELECT config_key, config_val.UInt64 AS int_value
FROM config_values
WHERE variantType(config_val) = 'UInt64';

-- Only rows with a Float64
SELECT config_key, config_val.Float64 AS float_value
FROM config_values
WHERE variantType(config_val) = 'Float64';

-- All numeric variants
SELECT config_key, config_val
FROM config_values
WHERE variantType(config_val) IN ('UInt64', 'Float64');
```

## Variant in Aggregations

Aggregate on specific variant branches by filtering on the type discriminator:

```sql
SELECT
    variantType(config_val)    AS val_type,
    count()                    AS count,
    -- Only meaningful for numeric types
    avgIf(
        config_val.Float64,
        variantType(config_val) = 'Float64'
    )                          AS avg_float_value,
    avgIf(
        toFloat64(config_val.UInt64),
        variantType(config_val) = 'UInt64'
    )                          AS avg_uint_value
FROM config_values
GROUP BY val_type;
```

## Polymorphic Event Schema

A real-world use case is event attributes where the attribute type depends on the attribute name:

```sql
SET allow_experimental_variant_type = 1;

CREATE TABLE user_events
(
    event_id    UInt64,
    event_time  DateTime,
    user_id     UInt64,
    event_type  String,
    attr_key    String,
    attr_value  Variant(String, Int64, Float64, Bool, Date)
)
ENGINE = MergeTree()
ORDER BY (user_id, event_time);

INSERT INTO user_events VALUES
    (1, now(), 1001, 'purchase',    'amount',       99.99),
    (2, now(), 1001, 'purchase',    'item_id',      toInt64(5543)),
    (3, now(), 1001, 'login',       'success',      true),
    (4, now(), 1002, 'subscription','plan',         'premium'),
    (5, now(), 1002, 'subscription','start_date',   toDate('2026-04-01'));
```

Query purchase events to get numeric totals:

```sql
SELECT
    user_id,
    sum(attr_value.Float64) AS total_spend
FROM user_events
WHERE event_type = 'purchase'
  AND attr_key = 'amount'
  AND variantType(attr_value) = 'Float64'
GROUP BY user_id;
```

## NULL Handling in Variant

A `Variant` column can also hold `NULL` if no value is provided. The `variantType()` of a NULL is `'None'`:

```sql
INSERT INTO config_values VALUES (9, 'optional_setting', NULL);

SELECT
    config_key,
    config_val,
    variantType(config_val) AS stored_type,
    isNull(config_val)      AS is_null
FROM config_values
WHERE config_id = 9;
-- stored_type: 'None', is_null: 1
```

## Variant vs Dynamic

| Feature | Variant(T1, T2, ...) | Dynamic |
|---|---|---|
| Type set | Fixed at DDL time | Open, any type |
| Type safety | Enforced | Runtime only |
| Schema clarity | High | Low |
| Performance | Better | Slower |
| Sorting key use | No | No |

Prefer `Variant` when you know the set of possible types ahead of time. Use `Dynamic` only when the type set is truly unknown.

## Summary

ClickHouse's `Variant(T1, T2, ...)` type provides a closed discriminated union where each row holds exactly one of the declared types. Use `variantType()` to inspect the stored type and dot-accessor notation to retrieve typed values. It is ideal for polymorphic columns with a bounded set of types - offering better performance and schema clarity than `Dynamic` for these use cases.
