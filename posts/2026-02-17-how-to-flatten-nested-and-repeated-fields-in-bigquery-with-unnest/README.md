# How to Flatten Nested and Repeated Fields in BigQuery with UNNEST

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, UNNEST, Nested Data, SQL

Description: Learn how to flatten nested and repeated fields in BigQuery using UNNEST, including practical examples for arrays, structs, and complex nested hierarchies.

---

BigQuery supports nested and repeated fields, which is great for storing denormalized data. But when you need to analyze that data, you often need to flatten it into rows. That is where UNNEST comes in. It takes an array (repeated field) and expands each element into its own row.

If you have worked with BigQuery's nested schemas - especially data loaded from Avro, Parquet, or the Google Analytics export - you have probably wrestled with UNNEST. Let me clear up how it works.

## What UNNEST Does

UNNEST takes an ARRAY and converts it into a set of rows. Each element in the array becomes a separate row in the result.

```sql
-- Simple UNNEST example
-- Turns an array of 3 elements into 3 rows
SELECT number
FROM UNNEST([1, 2, 3]) AS number;
-- Returns:
-- number
-- 1
-- 2
-- 3
```

When combined with a table, UNNEST performs a cross join between each row and its array elements.

```sql
-- UNNEST with a table - each array element creates a new row
SELECT
  order_id,
  item
FROM `my_project.my_dataset.orders`,
UNNEST(items) AS item;
```

If an order has 3 items, this produces 3 rows for that order.

## Flattening Simple Arrays

Here is a practical example with a table that has an array column.

```sql
-- Create a sample table with an array column
CREATE TEMP TABLE products AS
SELECT 'P001' AS product_id, 'Laptop' AS name, ['electronics', 'computers', 'portable'] AS tags
UNION ALL
SELECT 'P002', 'Headphones', ['electronics', 'audio', 'accessories']
UNION ALL
SELECT 'P003', 'Desk', ['furniture', 'office'];

-- Flatten the tags array into individual rows
SELECT
  product_id,
  name,
  tag
FROM products,
UNNEST(tags) AS tag;
-- Returns:
-- P001  Laptop      electronics
-- P001  Laptop      computers
-- P001  Laptop      portable
-- P002  Headphones  electronics
-- P002  Headphones  audio
-- P002  Headphones  accessories
-- P003  Desk        furniture
-- P003  Desk        office
```

## Flattening Arrays of Structs

The more common case is arrays of structured objects. This is how nested data typically appears in BigQuery.

```sql
-- Table with an array of structs (nested repeated field)
CREATE TEMP TABLE orders AS
SELECT
  'ORD-001' AS order_id,
  '2026-02-17' AS order_date,
  [
    STRUCT('Widget A' AS name, 2 AS quantity, 29.99 AS price),
    STRUCT('Widget B' AS name, 1 AS quantity, 49.99 AS price),
    STRUCT('Cable' AS name, 3 AS quantity, 9.99 AS price)
  ] AS items;

-- Flatten the items array and access struct fields
SELECT
  order_id,
  order_date,
  item.name AS item_name,
  item.quantity,
  item.price,
  item.quantity * item.price AS line_total
FROM orders,
UNNEST(items) AS item;
```

Each struct field is accessible using dot notation on the alias.

## Using UNNEST with JOIN Syntax

You can use explicit CROSS JOIN or LEFT JOIN syntax with UNNEST, which gives you more control.

```sql
-- CROSS JOIN UNNEST - excludes rows with empty arrays
SELECT
  o.order_id,
  o.order_date,
  item.name AS item_name,
  item.price
FROM `my_project.my_dataset.orders` o
CROSS JOIN UNNEST(o.items) AS item;

-- LEFT JOIN UNNEST - includes rows even if the array is empty or NULL
SELECT
  o.order_id,
  o.order_date,
  item.name AS item_name,
  item.price
FROM `my_project.my_dataset.orders` o
LEFT JOIN UNNEST(o.items) AS item;
```

The LEFT JOIN variant is important - if you use a regular CROSS JOIN (or the comma syntax), rows with empty arrays are dropped entirely. LEFT JOIN preserves them with NULLs for the array fields.

## UNNEST with WITH OFFSET

To get the index of each element in the array, use WITH OFFSET.

```sql
-- Get the position of each element in the array
SELECT
  order_id,
  item.name AS item_name,
  item.price,
  pos AS item_position
FROM `my_project.my_dataset.orders`,
UNNEST(items) AS item WITH OFFSET AS pos
ORDER BY order_id, pos;
```

This is useful when the order of elements in the array matters, like ranking items or getting the first/last element.

## Flattening Multiple Levels of Nesting

Sometimes data is nested several levels deep. You chain multiple UNNEST operations.

```sql
-- Multi-level nested data
CREATE TEMP TABLE departments AS
SELECT
  'Engineering' AS dept_name,
  [
    STRUCT(
      'Backend' AS team_name,
      [
        STRUCT('Alice' AS name, 'Senior' AS level),
        STRUCT('Bob' AS name, 'Mid' AS level)
      ] AS members
    ),
    STRUCT(
      'Frontend' AS team_name,
      [
        STRUCT('Charlie' AS name, 'Lead' AS level),
        STRUCT('Diana' AS name, 'Junior' AS level),
        STRUCT('Eve' AS name, 'Mid' AS level)
      ] AS members
    )
  ] AS teams;

-- Flatten all the way to individual team members
SELECT
  dept_name,
  team.team_name,
  member.name AS member_name,
  member.level AS member_level
FROM departments,
UNNEST(teams) AS team,
UNNEST(team.members) AS member;
```

Each UNNEST operates on the array from the level above.

## Aggregating After UNNEST

A common pattern is to flatten, filter, and then aggregate back.

```sql
-- Find the total value of electronics items per order
SELECT
  o.order_id,
  o.order_date,
  SUM(item.price * item.quantity) AS electronics_total,
  COUNT(*) AS electronics_item_count
FROM `my_project.my_dataset.orders` o,
UNNEST(o.items) AS item
WHERE item.category = 'electronics'
GROUP BY o.order_id, o.order_date;
```

## Filtering Arrays with UNNEST in Subqueries

Use UNNEST in a subquery to filter based on array contents without flattening the main result.

```sql
-- Find orders that contain at least one item over $100
SELECT
  order_id,
  order_date,
  total_amount
FROM `my_project.my_dataset.orders`
WHERE EXISTS (
  SELECT 1
  FROM UNNEST(items) AS item
  WHERE item.price > 100
);
```

```sql
-- Find orders where ALL items are in the 'electronics' category
SELECT
  order_id,
  order_date
FROM `my_project.my_dataset.orders`
WHERE (
  SELECT COUNT(*)
  FROM UNNEST(items) AS item
  WHERE item.category != 'electronics'
) = 0
AND ARRAY_LENGTH(items) > 0;
```

## Reconstructing Arrays After Transformation

After flattening and transforming data, you might want to re-nest it into arrays.

```sql
-- Flatten items, apply a discount, and re-aggregate into an array
SELECT
  order_id,
  order_date,
  ARRAY_AGG(
    STRUCT(
      item.name,
      item.quantity,
      ROUND(item.price * 0.9, 2) AS discounted_price  -- 10% discount
    )
  ) AS discounted_items
FROM `my_project.my_dataset.orders`,
UNNEST(items) AS item
GROUP BY order_id, order_date;
```

## Practical Example: Google Analytics Data

Google Analytics data exported to BigQuery is heavily nested. Here is how to work with it.

```sql
-- Flatten Google Analytics event parameters
SELECT
  event_date,
  event_name,
  user_pseudo_id,
  param.key AS param_key,
  COALESCE(
    param.value.string_value,
    CAST(param.value.int_value AS STRING),
    CAST(param.value.float_value AS STRING),
    CAST(param.value.double_value AS STRING)
  ) AS param_value
FROM `my_project.analytics_dataset.events_*`,
UNNEST(event_params) AS param
WHERE _TABLE_SUFFIX = '20260217'
  AND event_name = 'page_view';
```

```sql
-- Extract specific parameters using a pivot-style approach
SELECT
  event_date,
  user_pseudo_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') AS page_url,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_title') AS page_title,
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec') AS engagement_ms
FROM `my_project.analytics_dataset.events_*`
WHERE _TABLE_SUFFIX = '20260217'
  AND event_name = 'page_view';
```

## UNNEST with CROSS JOIN vs Comma Syntax

These two forms are equivalent.

```sql
-- Comma syntax (implicit cross join)
SELECT * FROM my_table, UNNEST(my_array) AS element;

-- Explicit CROSS JOIN syntax
SELECT * FROM my_table CROSS JOIN UNNEST(my_array) AS element;
```

I prefer the comma syntax for readability when there is one UNNEST. For multiple UNNEST operations or when mixing with LEFT JOINs, the explicit syntax is clearer.

## Common Mistakes

**Forgetting that UNNEST drops rows with empty arrays**: If an array is empty or NULL, the comma/CROSS JOIN syntax excludes that row entirely. Use LEFT JOIN UNNEST to preserve it.

**Not aliasing the UNNEST result**: Always alias the UNNEST output. Without an alias, accessing fields becomes awkward.

**Accidentally multiplying rows**: UNNEST creates a cross product. If you UNNEST two arrays from the same row, you get rows * array1_length * array2_length. Usually you want to UNNEST them separately or use WITH OFFSET to pair them.

```sql
-- Wrong: cross product of two arrays
SELECT a, b
FROM my_table, UNNEST(array_a) AS a, UNNEST(array_b) AS b;
-- If array_a has 3 elements and array_b has 3, you get 9 rows

-- Right: pair arrays by position
SELECT a, b
FROM my_table,
UNNEST(array_a) AS a WITH OFFSET pos_a,
UNNEST(array_b) AS b WITH OFFSET pos_b
WHERE pos_a = pos_b;
-- Returns 3 paired rows
```

## Wrapping Up

UNNEST is the essential tool for working with nested and repeated fields in BigQuery. Whether you are flattening simple arrays, navigating multi-level nested structs, or working with complex exports like Google Analytics data, UNNEST lets you bring nested data into a row-oriented format for analysis. Remember to use LEFT JOIN when you need to preserve rows with empty arrays, and be mindful of the row multiplication effect when unnesting multiple arrays.

For monitoring BigQuery query performance across your analytics pipelines, [OneUptime](https://oneuptime.com) provides observability tools to help you track costs and performance.
