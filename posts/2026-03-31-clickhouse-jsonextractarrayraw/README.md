# How to Use JSONExtractArrayRaw() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, JSON, Array, Analytics, Query

Description: Learn how JSONExtractArrayRaw() splits a JSON array into an Array(String) of raw JSON elements in ClickHouse, enabling per-element processing with arrayJoin and other array functions.

---

`JSONExtractArrayRaw` takes a JSON string that contains an array and returns an `Array(String)` where each element is the raw JSON representation of one array item. Unlike functions that parse arrays of a single scalar type, `JSONExtractArrayRaw` works on heterogeneous arrays and nested arrays of objects, making it the right starting point when you need to iterate over or inspect each element individually.

## Basic Usage

```sql
-- Split a JSON array into individual raw elements
SELECT JSONExtractArrayRaw('["alpha", 42, true, {"k": "v"}]') AS elements;
```

```text
elements
['"alpha"','42','true','{"k":"v"}']
```

Each element is a `String` containing the raw JSON literal. String elements include surrounding double quotes; numbers and booleans do not.

## Extracting an Array Field from a Column

```sql
-- Pull the raw items array out of an order JSON payload
SELECT
    order_id,
    JSONExtractArrayRaw(order_json, 'items') AS raw_items
FROM orders
LIMIT 5;
```

Pass the field name as the second argument to navigate directly to the array within the object.

## Exploding Array Elements with arrayJoin

`arrayJoin` turns each element of the array into its own row, enabling per-item aggregations.

```sql
-- One row per tag, extracted from a JSON tags array
SELECT
    post_id,
    arrayJoin(JSONExtractArrayRaw(metadata, 'tags')) AS raw_tag
FROM posts
LIMIT 20;
```

## Parsing Each Element Further

Because each element is raw JSON, you can apply `JSONExtractString` or `JSONExtractInt` on it.

```sql
-- Extract name and price from each item in an order
SELECT
    order_id,
    JSONExtractString(item, 'name')          AS item_name,
    JSONExtractFloat(item, 'price')          AS item_price,
    JSONExtractInt(item, 'quantity')         AS quantity
FROM (
    SELECT
        order_id,
        arrayJoin(JSONExtractArrayRaw(order_json, 'items')) AS item
    FROM orders
)
ORDER BY order_id, item_name;
```

## Counting Array Elements

```sql
-- Count how many permissions each user has
SELECT
    user_id,
    length(JSONExtractArrayRaw(profile, 'permissions')) AS permission_count
FROM users
ORDER BY permission_count DESC
LIMIT 10;
```

## Filtering Rows Based on Array Contents

```sql
-- Find orders that contain a specific item SKU
SELECT DISTINCT order_id
FROM (
    SELECT
        order_id,
        arrayJoin(JSONExtractArrayRaw(order_json, 'items')) AS item
    FROM orders
)
WHERE JSONExtractString(item, 'sku') = 'WIDGET-42';
```

## Checking Whether All Elements Meet a Condition

Use `arrayAll` on the extracted array to check every element without exploding rows.

```sql
-- Find orders where every item has a non-zero price
SELECT
    order_id
FROM orders
WHERE arrayAll(
    item -> JSONExtractFloat(item, 'price') > 0,
    JSONExtractArrayRaw(order_json, 'items')
);
```

## Summary

`JSONExtractArrayRaw` returns an `Array(String)` of raw JSON fragments from a JSON array field. Use `arrayJoin` to flatten the array into rows for per-element queries, and then apply other `JSONExtract*` functions on each element to parse specific fields. It handles heterogeneous and object-valued arrays that typed alternatives like `JSONExtract(json, 'Array(String)')` cannot, making it a versatile building block for JSON array processing in ClickHouse.
