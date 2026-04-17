# How to Use CAST with Nested Types in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Type Conversion, Array, Tuple, Map, Nested Type

Description: Learn how to use CAST with Array, Tuple, Map, and Nullable nested types in ClickHouse for complex type transformations and schema alignment.

---

ClickHouse's `CAST` function supports all nested and composite types: `Array(T)`, `Tuple(T1, T2, ...)`, `Map(K, V)`, `Nullable(T)`, and `FixedString(n)`. This makes it possible to transform string representations of complex data into properly typed structures, change element types within arrays, and build typed tuples from individual columns.

## CAST to Array Types

Cast a string representation of an array to a typed `Array(T)`.

```sql
-- Cast string to Array(Int32)
SELECT CAST('[1, 2, 3, 4, 5]' AS Array(Int32)) AS int_array;

-- Cast Array(Int32) to Array(Float64)
SELECT CAST([1, 2, 3] AS Array(Float64)) AS float_array;

-- Cast Array(String) to Array(UInt64)
SELECT CAST(['1', '2', '3'] AS Array(UInt64)) AS uint_array;

-- Verify the result type
SELECT toTypeName(CAST('[1, 2, 3]' AS Array(Int32))) AS array_type;
```

## CAST to Nullable Array Elements

```sql
-- Cast to an array with nullable elements
SELECT CAST([1, 2, 3] AS Array(Nullable(Int32))) AS nullable_int_array;

-- This allows the array to contain NULL elements
SELECT toTypeName(CAST([1, 2, 3] AS Array(Nullable(Int32)))) AS type;
-- Returns: 'Array(Nullable(Int32))'
```

## CAST to Tuple Types

Tuples are fixed-length, potentially heterogeneous structures. Cast from a string or an existing tuple.

```sql
-- Build a typed tuple from a string representation
-- Note: string elements must be quoted and there must be no spaces after commas
SELECT CAST('(1,\'hello\',3.14)' AS Tuple(UInt32, String, Float64)) AS typed_tuple;

-- Access tuple elements
SELECT
    user_id,
    CAST((user_id, email) AS Tuple(UInt64, String)) AS user_tuple
FROM users
LIMIT 5;
```

## Accessing Tuple Elements After CAST

```sql
-- Cast to Tuple and access named elements
SELECT
    t.1 AS first_element,
    t.2 AS second_element
FROM (
    SELECT CAST((42, 'hello') AS Tuple(UInt32, String)) AS t
);
```

## CAST to Map Types

Cast a string representation or compatible type to `Map(K, V)`.

```sql
-- Cast from a string representation of a map
SELECT CAST(map('key1', 1, 'key2', 2) AS Map(String, UInt64)) AS typed_map;

-- Check the type
SELECT toTypeName(CAST(map('a', 1) AS Map(String, UInt64))) AS map_type;
-- Returns: 'Map(String, UInt64)'
```

## Casting Map Value Types

```sql
-- Cast map with Int32 values to Float64 values
SELECT CAST(map('a', 1, 'b', 2) AS Map(String, Float64)) AS float_map;

-- Access map values after cast
SELECT
    m['key1'] AS value1,
    m['key2'] AS value2
FROM (
    SELECT CAST(map('key1', 10, 'key2', 20) AS Map(String, UInt64)) AS m
);
```

## CAST to Nullable

```sql
-- Cast a non-nullable column to Nullable
SELECT CAST(42 AS Nullable(Int32)) AS nullable_int;
SELECT toTypeName(CAST(42 AS Nullable(Int32))) AS type;
-- Returns: 'Nullable(Int32)'

-- Useful when aligning types in UNION ALL
SELECT
    user_id,
    CAST(age AS Nullable(Int32)) AS age
FROM table_a
UNION ALL
SELECT
    user_id,
    age  -- already Nullable(Int32)
FROM table_b
LIMIT 10;
```

## CAST JSON Field to Specific Types

When working with JSON data extracted as strings, cast to the appropriate type.

```sql
-- Extract a field from JSON and cast to the appropriate type
SELECT
    event_id,
    CAST(JSONExtractString(payload, 'user_id') AS UInt64)   AS user_id,
    CAST(JSONExtractString(payload, 'amount') AS Float64)   AS amount,
    CAST(JSONExtractString(payload, 'event_date') AS Date)  AS event_date
FROM json_events
LIMIT 10;
```

## Casting Array of Strings to Array of Typed Values

```sql
-- Convert an array of numeric strings to a properly typed array
SELECT
    CAST(
        splitByChar(',', raw_ids),  -- Array(String)
        'Array(UInt64)'
    ) AS id_array
FROM events_with_string_arrays
LIMIT 10;
```

## Nested Type Casting in Table Definitions

```sql
-- Create a table with complex nested types
CREATE TABLE typed_events
(
    event_id     UInt64,
    attributes   Map(String, String),
    metrics      Array(Float64),
    location     Tuple(Float64, Float64),  -- (latitude, longitude)
    event_time   DateTime
)
ENGINE = MergeTree()
ORDER BY (event_id, event_time);

-- Insert with CAST to ensure correct types
INSERT INTO typed_events
SELECT
    event_id,
    CAST(raw_map, 'Map(String, String)')       AS attributes,
    CAST(raw_metrics, 'Array(Float64)')        AS metrics,
    CAST(raw_location, 'Tuple(Float64, Float64)') AS location,
    event_time
FROM raw_events
LIMIT 1000;
```

## Summary

`CAST` with nested types enables powerful type transformations in ClickHouse. Use `CAST(x AS Array(T))` to type or re-type array elements. Use `CAST(x AS Tuple(T1, T2))` to build typed tuples. Use `CAST(x AS Map(K, V))` to create or recast maps. Use `CAST(x AS Nullable(T))` to widen a type for `UNION ALL` compatibility. These casts are essential when parsing JSON fields, aligning schemas across data sources, and working with dynamically structured data.
