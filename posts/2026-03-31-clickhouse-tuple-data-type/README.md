# How to Use Tuple Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Tuple

Description: Learn how to define and query Tuple(T1, T2, ...) columns in ClickHouse, including named tuples and element access by index or name.

---

`Tuple(T1, T2, ...)` is a fixed-length, ordered collection of elements where each position can have a different type. Tuples are useful for grouping related values - coordinates, min/max pairs, structured metadata - into a single column without creating separate tables. ClickHouse supports both anonymous tuples accessed by numeric index and named tuples accessed by field name.

## Defining Tuple Columns

Declare a tuple column by listing element types inside `Tuple(...)`. Use `(val1, val2, ...)` literal syntax to insert values.

```sql
CREATE TABLE measurements (
    sensor_id  UInt32,
    location   Tuple(Float64, Float64),   -- (latitude, longitude)
    range_vals Tuple(Float32, Float32),   -- (min, max)
    recorded_at DateTime
) ENGINE = MergeTree()
ORDER BY (sensor_id, recorded_at);

INSERT INTO measurements VALUES
    (1, (37.7749, -122.4194), (10.0, 95.0), '2026-01-15 08:00:00'),
    (2, (40.7128, -74.0060),  (5.0,  88.0), '2026-01-15 08:00:00');
```

## Accessing Tuple Elements by Index

Tuple elements are accessed using dot notation with a 1-based integer index.

```sql
-- Access latitude and longitude from the location tuple
SELECT
    sensor_id,
    location.1 AS latitude,
    location.2 AS longitude
FROM measurements;

-- Use tuple elements in expressions
SELECT
    sensor_id,
    range_vals.2 - range_vals.1 AS value_range
FROM measurements;
```

## Named Tuples

Named tuples allow accessing elements by field name instead of numeric index, making queries more readable.

```sql
CREATE TABLE events (
    event_id  UInt64,
    user_info Tuple(
        id       UInt64,
        name     String,
        country  LowCardinality(String)
    ),
    metadata  Tuple(
        source   String,
        version  UInt8
    ),
    created_at DateTime
) ENGINE = MergeTree()
ORDER BY event_id;

INSERT INTO events VALUES
    (1001, (42, 'Alice', 'US'), ('web', 3), '2026-02-01 10:00:00'),
    (1002, (43, 'Bob',   'DE'), ('app', 2), '2026-02-01 10:05:00');

-- Access named tuple fields
SELECT
    event_id,
    user_info.name    AS user_name,
    user_info.country AS country,
    metadata.source   AS source
FROM events;
```

## Tuple Functions

ClickHouse provides helper functions for working with tuples.

```sql
-- tuple(): construct a tuple from expressions
SELECT tuple(1, 'hello', 3.14) AS my_tuple;

-- tupleElement(): access element by index (equivalent to dot notation)
SELECT tupleElement((10, 20, 30), 2) AS second_element;

-- untuple(): expand tuple fields as separate columns
SELECT untuple(location) FROM measurements LIMIT 2;

-- tuplePlus / tupleMinus: element-wise arithmetic on numeric tuples
SELECT tuplePlus((1.0, 2.0), (3.0, 4.0)) AS summed;
SELECT tupleMinus((10.0, 5.0), (3.0, 2.0)) AS diffed;

-- dotProduct: dot product of two numeric tuples
SELECT dotProduct((1, 2, 3), (4, 5, 6)) AS result;
```

## Tuples as Function Return Values

Several ClickHouse aggregate and analysis functions return tuples, making it important to understand element access.

```sql
-- minMax returns a Tuple(min, max)
SELECT
    sensor_id,
    minMax(range_vals.1) AS reading_min_max
FROM measurements
GROUP BY sensor_id;

-- Accessing the returned tuple
SELECT
    sensor_id,
    minMax(range_vals.1).1 AS overall_min,
    minMax(range_vals.1).2 AS overall_max
FROM measurements
GROUP BY sensor_id;
```

## Comparing and Filtering on Tuples

Tuple comparisons are lexicographic - first element is compared first, then second, and so on.

```sql
-- Filter using a tuple comparison
SELECT sensor_id, location
FROM measurements
WHERE location > (37.0, -123.0);

-- Order by tuple (lexicographic order)
SELECT sensor_id, location
FROM measurements
ORDER BY location ASC;
```

## Summary

`Tuple(T1, T2, ...)` in ClickHouse bundles heterogeneous values into a single column with fixed structure. Named tuples improve query readability by replacing numeric indexes with descriptive field names. Tuples are particularly effective for coordinates, bounding boxes, value ranges, and any scenario where a small group of tightly related fields logically belong together.
