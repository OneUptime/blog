# How to Use JSONExtract with JSONPath Syntax in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, JSON, Analytics, Query

Description: Learn how to use JSONExtractString and related functions with JSONPath-style array index and path syntax in ClickHouse to access nested and array-indexed JSON values.

---

ClickHouse's `JSONExtract*` family supports a path syntax beyond simple key names. You can navigate arrays by numeric index and combine key and index steps to reach deeply nested values. Array indices are 1-based integers passed as additional arguments alongside string key names (negative integers count from the end). This guide shows how to use this path syntax to access indexed array elements, combine keys with array positions, and extract from complex nested structures.

## Accessing an Array Element by Index

Pass an integer as a path argument to select an element by its 1-based position.

```sql
-- Get the first and second elements of a JSON array
SELECT
    JSONExtractString('["alpha", "beta", "gamma"]', 1) AS first_element,
    JSONExtractString('["alpha", "beta", "gamma"]', 2) AS second_element;
```

```text
first_element  second_element
alpha          beta
```

Note: ClickHouse uses 1-based indexing in JSON path arguments, matching the convention used by the `JSONExtract` family.

## Navigating Key Then Array Index

```sql
-- Access the first tag from a tags array inside an object
SELECT JSONExtractString(
    '{"tags": ["analytics", "sql", "clickhouse"]}',
    'tags', 1
) AS first_tag;
```

```text
first_tag
analytics
```

## Accessing a Nested Array of Objects

```sql
-- Get the name field from the second item in an order
SELECT JSONExtractString(
    '{"items": [{"name": "Widget", "price": 9.99}, {"name": "Gadget", "price": 19.99}]}',
    'items', 2, 'name'
) AS second_item_name;
```

```text
second_item_name
Gadget
```

## Extracting Numeric Values from Indexed Positions

```sql
-- Extract the price of the first item in each order
SELECT
    order_id,
    JSONExtractFloat(order_json, 'items', 1, 'price') AS first_item_price
FROM orders
LIMIT 10;
```

## Extracting Multiple Indexed Values

```sql
-- Extract the first three scores from a JSON array column
SELECT
    student_id,
    JSONExtractInt(record, 'scores', 1) AS score_1,
    JSONExtractInt(record, 'scores', 2) AS score_2,
    JSONExtractInt(record, 'scores', 3) AS score_3
FROM students
LIMIT 10;
```

## Using JSONExtractRaw for Indexed Sub-Documents

```sql
-- Get the raw JSON object at position 2 in the events array
SELECT
    session_id,
    JSONExtractRaw(session_json, 'events', 2) AS second_event_raw
FROM sessions
LIMIT 5;
```

## Checking Index Existence Before Extraction

There is no direct `JSONHas` for array indices, but you can check array length first.

```sql
-- Only extract the third item if the array has at least 3 elements
SELECT
    order_id,
    if(
        JSONLength(order_json, 'items') >= 3,
        JSONExtractString(order_json, 'items', 3, 'sku'),
        ''
    ) AS third_item_sku
FROM orders
LIMIT 10;
```

## Combining Key Navigation and Array Flattening

For processing all elements, combine `JSONExtractArrayRaw` with `ARRAY JOIN` rather than hard-coding indices.

```sql
-- Full flatten: all items with their position
SELECT
    order_id,
    item_index,
    JSONExtractString(item, 'sku')   AS sku,
    JSONExtractFloat(item, 'price')  AS price
FROM (
    SELECT
        order_id,
        arrayEnumerate(JSONExtractArrayRaw(order_json, 'items')) AS indices,
        JSONExtractArrayRaw(order_json, 'items')                  AS items_arr
    FROM orders
)
ARRAY JOIN items_arr AS item, indices AS item_index
ORDER BY order_id, item_index;
```

## Summary

ClickHouse `JSONExtract*` functions accept integer path arguments for array index access, using 1-based indexing. Combine string key names and integer indices in any order to navigate complex nested structures. For dynamic iteration over all elements, `JSONExtractArrayRaw` with `ARRAY JOIN` is more flexible than hard-coded index arguments. Use `JSONLength` to guard against out-of-bounds index access before extracting.
