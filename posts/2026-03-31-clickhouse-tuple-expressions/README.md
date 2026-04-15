# How to Use Tuple Expressions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Tuple, Data Type, SQL, Composite Key

Description: Learn how to create, access, and query Tuple expressions in ClickHouse for composite values, multi-column comparisons, and structured data.

---

## Creating Tuples

A Tuple in ClickHouse is an ordered collection of values with fixed types. Create a tuple using the `tuple()` function or the `(a, b, c)` shorthand.

```sql
SELECT
  tuple(1, 'hello', 3.14) AS my_tuple,
  (42, 'world') AS another_tuple,
  toTypeName(tuple(1, 'a')) AS tuple_type
-- Type: Tuple(UInt8, String)
```

## Accessing Tuple Elements

Access tuple elements by 1-based index using `.1`, `.2`, etc., or by named field if the tuple has named fields.

```sql
SELECT
  t.1 AS first_element,
  t.2 AS second_element
FROM (
  SELECT (100, 'Alice') AS t
)

-- Named tuple fields
SELECT
  t.id,
  t.name
FROM (
  SELECT tuple(1 AS id, 'Bob' AS name) AS t
)
```

## Tuples as Composite Keys in ORDER BY

Tuples enable composite key range comparisons in `WHERE` clauses, which is useful for cursor-based pagination.

```sql
-- Cursor-based pagination using tuple comparison
SELECT user_id, event_time, event_type
FROM events
WHERE (user_id, event_time) > (1000, '2025-06-01 12:00:00')
ORDER BY user_id, event_time
LIMIT 100
```

## Tuple Columns in Tables

You can store Tuple columns in a MergeTree table for embedding structured data.

```sql
CREATE TABLE geo_events (
  event_id UInt64,
  location Tuple(lat Float64, lon Float64),
  event_time DateTime
) ENGINE = MergeTree()
ORDER BY (event_id, event_time)
```

```sql
INSERT INTO geo_events VALUES (1, (37.7749, -122.4194), now())

SELECT
  event_id,
  location.lat AS latitude,
  location.lon AS longitude
FROM geo_events
```

## Combining Aggregates into Tuples

You can combine multiple aggregate results into a single tuple using the shorthand syntax.

```sql
SELECT
  (min(score), max(score)) AS score_range,
  min(score) AS min_score,
  max(score) AS max_score
FROM test_results
```

## Tuples in Arrays

Array of Tuples is a common pattern for storing structured lists.

```sql
SELECT
  order_id,
  arrayMap(item -> item.1, line_items) AS product_ids,
  arraySum(arrayMap(item -> item.2, line_items)) AS total_quantity
FROM (
  SELECT 1 AS order_id, [(101, 2), (202, 5)] AS line_items
)
```

## Summary

Tuple expressions in ClickHouse let you group multiple typed values into a single composite value. Access elements by 1-based index (`.1`, `.2`) or by named field. Use tuple comparisons in `WHERE` for cursor-based pagination against composite sort keys. Tuples can be stored as column types in MergeTree tables and are commonly used inside arrays for structured list data.
