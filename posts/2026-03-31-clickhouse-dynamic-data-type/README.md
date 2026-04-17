# How to Use Dynamic Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Dynamic

Description: Learn how ClickHouse's Dynamic type stores any value at runtime with type inference, how to access typed variants, and when to use it.

---

ClickHouse's `Dynamic` type is a flexible column type that can store values of any supported type without requiring the type to be declared at table creation time. Unlike `String`, which stores everything as text, `Dynamic` preserves the actual type of each value - a number is stored as a number, a date as a date, and so on. This makes it powerful for event streams, EAV (Entity-Attribute-Value) schemas, and any use case where column types are not known in advance.

## Enabling and Declaring Dynamic

The `Dynamic` type requires enabling the experimental setting in ClickHouse versions where it is not yet stable:

```sql
SET allow_experimental_dynamic_type = 1;
```

Declaring a table with a `Dynamic` column:

```sql
SET allow_experimental_dynamic_type = 1;

CREATE TABLE event_attributes
(
    event_id    UInt64,
    event_time  DateTime,
    attr_name   String,
    attr_value  Dynamic    -- stores any type
)
ENGINE = MergeTree()
ORDER BY (event_id, attr_name);
```

## Inserting Different Types

You can insert values of different types into the same `Dynamic` column. ClickHouse stores each with its inferred type:

```sql
INSERT INTO event_attributes VALUES
    (1, now(), 'user_id',      42),
    (2, now(), 'session_id',   'abc-123-xyz'),
    (3, now(), 'response_ms',  235.7),
    (4, now(), 'is_mobile',    true),
    (5, now(), 'event_date',   toDate('2026-03-31')),
    (6, now(), 'tags',         ['web', 'api', 'v2']),
    (7, now(), 'score',        toDecimal64(9.95, 2));
```

## Inspecting Stored Types with dynamicType()

The `dynamicType()` function returns the actual stored type of each value in a `Dynamic` column:

```sql
SELECT
    event_id,
    attr_name,
    attr_value,
    dynamicType(attr_value)  AS stored_type
FROM event_attributes
ORDER BY event_id;
```

Example output:

| event_id | attr_name | attr_value | stored_type |
|---|---|---|---|
| 1 | user_id | 42 | Int64 |
| 2 | session_id | abc-123-xyz | String |
| 3 | response_ms | 235.7 | Float64 |
| 4 | is_mobile | true | Bool |
| 5 | event_date | 2026-03-31 | Date |

## Accessing Typed Variants

To extract a value from a `Dynamic` column as a specific type, use `CAST` or the `Dynamic.type` path syntax:

```sql
-- Cast to specific types when you know the stored type
SELECT
    event_id,
    attr_name,
    CAST(attr_value, 'String')   AS as_string,
    CAST(attr_value, 'Float64')  AS as_float
FROM event_attributes
WHERE attr_name = 'response_ms';
```

Using the variant path accessor (ClickHouse 24.x+):

```sql
-- Access a specific type stored within Dynamic
SELECT
    event_id,
    attr_value.Int64    AS int64_value,
    attr_value.String   AS string_value,
    attr_value.Float64  AS float64_value
FROM event_attributes;
-- Fields not matching the type will be NULL
```

## Filtering by Stored Type

You can filter rows based on the actual type stored in a `Dynamic` column using `dynamicType()`:

```sql
-- Get only numeric attributes
SELECT
    event_id,
    attr_name,
    attr_value
FROM event_attributes
WHERE dynamicType(attr_value) IN ('UInt8', 'UInt16', 'UInt32', 'UInt64',
                                   'Int8',  'Int16',  'Int32',  'Int64',
                                   'Float32', 'Float64');
```

```sql
-- Count attributes by stored type
SELECT
    dynamicType(attr_value) AS value_type,
    count()                 AS occurrences
FROM event_attributes
GROUP BY value_type
ORDER BY occurrences DESC;
```

## EAV Schema with Dynamic

The Entity-Attribute-Value pattern is a natural fit for `Dynamic`:

```sql
SET allow_experimental_dynamic_type = 1;

CREATE TABLE product_properties
(
    product_id  UInt64,
    prop_name   String,
    prop_value  Dynamic
)
ENGINE = MergeTree()
ORDER BY (product_id, prop_name);

INSERT INTO product_properties VALUES
    (101, 'price',       29.99),
    (101, 'in_stock',    true),
    (101, 'sku',         'PROD-101-BLK'),
    (101, 'weight_kg',   0.45),
    (101, 'launch_date', toDate('2025-06-01')),
    (102, 'price',       149.00),
    (102, 'in_stock',    false),
    (102, 'sku',         'PROD-102-WHT');
```

Querying product properties with type-safe access:

```sql
SELECT
    p.product_id,
    maxIf(CAST(p.prop_value, 'Float64'), p.prop_name = 'price')   AS price,
    maxIf(CAST(p.prop_value, 'String'), p.prop_name = 'sku')      AS sku,
    maxIf(CAST(p.prop_value, 'UInt8'), p.prop_name = 'in_stock')  AS in_stock
FROM product_properties AS p
GROUP BY p.product_id;
```

## Dynamic with JSON

`Dynamic` columns work well alongside the new `JSON` type for mixed-schema payloads:

```sql
-- Representing a row where each column can hold different payload shapes
SELECT
    toJSONString(attr_value) AS json_repr,
    dynamicType(attr_value)  AS actual_type
FROM event_attributes
LIMIT 5;
```

## Limitations

- **Performance**: `Dynamic` columns are slower than typed columns because ClickHouse must handle type dispatch at query time.
- **Compression**: Mixed-type storage compresses less efficiently than homogeneous typed columns.
- **Sorting**: `Dynamic` columns cannot be used in `ORDER BY` keys.
- **Aggregation**: Direct aggregation on `Dynamic` requires explicit casting.
- **Experimental**: As of some ClickHouse versions, `Dynamic` is still experimental.

```sql
-- Best practice: cast before aggregating
SELECT
    attr_name,
    avg(CAST(attr_value, 'Float64')) AS avg_value
FROM event_attributes
WHERE dynamicType(attr_value) IN ('Float32', 'Float64', 'UInt8', 'UInt64')
GROUP BY attr_name;
```

## Summary

ClickHouse's `Dynamic` type provides schema-flexible storage that preserves the actual type of each value - unlike `String`, which loses type information. It is ideal for EAV schemas, event streams with varying attribute types, and exploratory data loading. Use `dynamicType()` to introspect stored types and explicit `CAST` or variant path accessors for type-safe retrieval. For performance-critical queries, prefer typed columns wherever the schema is known.
