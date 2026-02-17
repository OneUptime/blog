# How to Query JSON Data in BigQuery Using JSON Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, JSON, SQL, Data Analysis

Description: A comprehensive guide to querying JSON data in BigQuery using native JSON functions including JSON_VALUE, JSON_QUERY, JSON_EXTRACT, and more with practical examples.

---

JSON data is everywhere. Event payloads, API responses, configuration objects, user preferences - chances are you have JSON columns in your BigQuery tables. BigQuery has a solid set of JSON functions that let you extract, filter, and transform JSON data directly in SQL.

I work with JSON columns constantly, and these functions save me from having to preprocess or flatten data before analysis. Let me walk through the most useful ones.

## JSON Data Types in BigQuery

BigQuery has two ways to store JSON data:

1. **JSON type**: A native JSON column type that stores parsed JSON. More efficient for querying.
2. **STRING type**: JSON stored as a string. Works but requires parsing at query time.

The native JSON type was introduced more recently and offers better performance. If you are designing a new table, use the JSON type.

```sql
-- Table with native JSON column
CREATE TABLE `my_project.my_dataset.events` (
  event_id STRING,
  event_type STRING,
  event_date DATE,
  properties JSON  -- Native JSON type
);

-- Table with JSON stored as STRING (legacy approach)
CREATE TABLE `my_project.my_dataset.events_legacy` (
  event_id STRING,
  event_type STRING,
  event_date DATE,
  properties STRING  -- JSON stored as string
);
```

## JSON_VALUE: Extract Scalar Values

`JSON_VALUE` extracts a scalar value (string, number, boolean) from JSON and returns it as a STRING.

```sql
-- Extract simple scalar values from a JSON column
SELECT
  event_id,
  JSON_VALUE(properties, '$.user_id') AS user_id,
  JSON_VALUE(properties, '$.page') AS page,
  JSON_VALUE(properties, '$.referrer') AS referrer,
  JSON_VALUE(properties, '$.duration_ms') AS duration_ms
FROM `my_project.my_dataset.events`
WHERE event_date = '2026-02-17'
LIMIT 10;
```

The `$` represents the root of the JSON document, and `.` navigates into nested objects.

For nested values, chain the path elements.

```sql
-- Extract deeply nested values
SELECT
  event_id,
  JSON_VALUE(properties, '$.user.name') AS user_name,
  JSON_VALUE(properties, '$.user.preferences.theme') AS theme,
  JSON_VALUE(properties, '$.device.browser.name') AS browser
FROM `my_project.my_dataset.events`
WHERE event_date = '2026-02-17';
```

## JSON_QUERY: Extract Objects and Arrays

While `JSON_VALUE` returns scalars as strings, `JSON_QUERY` returns JSON objects and arrays as JSON.

```sql
-- Extract a nested object from JSON
SELECT
  event_id,
  JSON_QUERY(properties, '$.user') AS user_object,
  JSON_QUERY(properties, '$.device') AS device_object,
  JSON_QUERY(properties, '$.items') AS items_array
FROM `my_project.my_dataset.events`
WHERE event_date = '2026-02-17';
```

This is useful when you want to pass a sub-object to another function or extract it for further processing.

```sql
-- Chain JSON_VALUE after JSON_QUERY for multi-step extraction
SELECT
  event_id,
  JSON_VALUE(JSON_QUERY(properties, '$.user'), '$.email') AS user_email,
  JSON_VALUE(JSON_QUERY(properties, '$.device'), '$.os') AS device_os
FROM `my_project.my_dataset.events`
WHERE event_date = '2026-02-17';
```

## Accessing Array Elements

Use array index notation to access specific elements.

```sql
-- Access array elements by index (0-based)
SELECT
  event_id,
  JSON_VALUE(properties, '$.items[0].name') AS first_item_name,
  JSON_VALUE(properties, '$.items[0].price') AS first_item_price,
  JSON_VALUE(properties, '$.items[1].name') AS second_item_name,
  JSON_VALUE(properties, '$.tags[0]') AS first_tag
FROM `my_project.my_dataset.events`
WHERE event_date = '2026-02-17';
```

## JSON_VALUE_ARRAY: Extract Arrays of Scalars

When you have an array of simple values, `JSON_VALUE_ARRAY` extracts them into a BigQuery ARRAY.

```sql
-- Extract a JSON array into a BigQuery ARRAY
SELECT
  event_id,
  JSON_VALUE_ARRAY(properties, '$.tags') AS tags,
  JSON_VALUE_ARRAY(properties, '$.categories') AS categories
FROM `my_project.my_dataset.events`
WHERE event_date = '2026-02-17';
```

You can then UNNEST the array to work with individual elements.

```sql
-- Unnest JSON arrays for analysis
SELECT
  event_id,
  tag
FROM `my_project.my_dataset.events`,
UNNEST(JSON_VALUE_ARRAY(properties, '$.tags')) AS tag
WHERE event_date = '2026-02-17';
```

## JSON_QUERY_ARRAY: Extract Arrays of Objects

For arrays of JSON objects, use `JSON_QUERY_ARRAY`.

```sql
-- Extract an array of objects and process each one
SELECT
  event_id,
  item,
  JSON_VALUE(item, '$.name') AS item_name,
  CAST(JSON_VALUE(item, '$.price') AS NUMERIC) AS item_price,
  CAST(JSON_VALUE(item, '$.quantity') AS INT64) AS item_quantity
FROM `my_project.my_dataset.events`,
UNNEST(JSON_QUERY_ARRAY(properties, '$.items')) AS item
WHERE event_date = '2026-02-17';
```

This is one of the most powerful patterns - it lets you "explode" an array of objects in JSON into rows, just like working with a nested table.

## Filtering on JSON Values

Use JSON functions in WHERE clauses to filter based on JSON content.

```sql
-- Filter events based on JSON property values
SELECT
  event_id,
  event_type,
  JSON_VALUE(properties, '$.user.country') AS country,
  JSON_VALUE(properties, '$.device.platform') AS platform
FROM `my_project.my_dataset.events`
WHERE event_date = '2026-02-17'
  AND JSON_VALUE(properties, '$.user.country') = 'US'
  AND JSON_VALUE(properties, '$.device.platform') = 'mobile';
```

For numeric comparisons, cast the extracted value.

```sql
-- Filter on numeric JSON values
SELECT
  event_id,
  CAST(JSON_VALUE(properties, '$.duration_ms') AS INT64) AS duration_ms,
  CAST(JSON_VALUE(properties, '$.items_count') AS INT64) AS items_count
FROM `my_project.my_dataset.events`
WHERE event_date = '2026-02-17'
  AND CAST(JSON_VALUE(properties, '$.duration_ms') AS INT64) > 5000;
```

## JSON Type Checking

Check the type of a JSON value before processing it.

```sql
-- Check JSON value types to handle mixed data
SELECT
  event_id,
  JSON_TYPE(JSON_QUERY(properties, '$.amount')) AS amount_type,
  CASE JSON_TYPE(JSON_QUERY(properties, '$.amount'))
    WHEN 'number' THEN CAST(JSON_VALUE(properties, '$.amount') AS STRING)
    WHEN 'string' THEN JSON_VALUE(properties, '$.amount')
    WHEN 'null' THEN 'N/A'
    ELSE 'unknown'
  END AS amount_display
FROM `my_project.my_dataset.events`
WHERE event_date = '2026-02-17';
```

## Aggregating JSON Data

Combine JSON extraction with aggregation for analytics.

```sql
-- Aggregate metrics from JSON properties
SELECT
  JSON_VALUE(properties, '$.user.country') AS country,
  JSON_VALUE(properties, '$.device.platform') AS platform,
  COUNT(*) AS event_count,
  AVG(CAST(JSON_VALUE(properties, '$.duration_ms') AS FLOAT64)) AS avg_duration_ms,
  SUM(CAST(JSON_VALUE(properties, '$.revenue') AS NUMERIC)) AS total_revenue
FROM `my_project.my_dataset.events`
WHERE event_date BETWEEN '2026-02-01' AND '2026-02-17'
GROUP BY country, platform
ORDER BY event_count DESC;
```

## Working with STRING JSON (Legacy)

If your JSON is stored as a STRING column, the same functions work but you might need to be more careful with type handling.

```sql
-- JSON functions work on STRING columns containing JSON
SELECT
  event_id,
  JSON_VALUE(properties_string, '$.user_id') AS user_id,
  JSON_VALUE(properties_string, '$.event_name') AS event_name
FROM `my_project.my_dataset.events_legacy`
WHERE event_date = '2026-02-17'
  AND JSON_VALUE(properties_string, '$.user_id') IS NOT NULL;
```

## Building JSON in Queries

You can also construct JSON from regular columns.

```sql
-- Build JSON from regular columns
SELECT
  TO_JSON_STRING(
    STRUCT(
      event_id AS id,
      event_type AS type,
      event_date AS date,
      STRUCT(
        JSON_VALUE(properties, '$.user.name') AS name,
        JSON_VALUE(properties, '$.user.email') AS email
      ) AS user
    )
  ) AS event_json
FROM `my_project.my_dataset.events`
WHERE event_date = '2026-02-17'
LIMIT 5;
```

## LAX vs STRICT Mode

BigQuery JSON functions support lax (default) and strict modes. In lax mode, missing keys return NULL. In strict mode, missing keys cause an error.

```sql
-- Lax mode (default): returns NULL for missing keys
SELECT JSON_VALUE(JSON '{"name": "Alice"}', '$.age') AS age;
-- Returns: NULL

-- You can explicitly specify lax mode
SELECT JSON_VALUE(JSON '{"name": "Alice"}', 'lax $.age') AS age;
-- Returns: NULL
```

For most analytics use cases, lax mode is what you want. You do not want your query to fail just because one row is missing an optional field.

## Performance Tips

1. **Use native JSON type over STRING**: The JSON type is optimized for extraction operations.
2. **Extract once, use many times**: If you need multiple fields from the same JSON, use a CTE to extract them once.
3. **Create materialized columns for frequently accessed fields**: If you always query the same JSON path, add it as a regular column.
4. **Filter on non-JSON columns first**: Let BigQuery prune data using partition and clustering columns before applying JSON functions.

```sql
-- Extract commonly used fields into a materialized view
CREATE MATERIALIZED VIEW `my_project.my_dataset.events_extracted` AS
SELECT
  event_id,
  event_type,
  event_date,
  JSON_VALUE(properties, '$.user.country') AS country,
  JSON_VALUE(properties, '$.device.platform') AS platform,
  CAST(JSON_VALUE(properties, '$.duration_ms') AS INT64) AS duration_ms
FROM `my_project.my_dataset.events`;
```

## Wrapping Up

BigQuery's JSON functions make it practical to work with semi-structured data directly in SQL. Whether you are extracting fields from event payloads, filtering on nested properties, or aggregating data from JSON arrays, these functions cover the common use cases. Use the native JSON type for better performance, and consider materializing frequently accessed paths into regular columns for analytics-heavy workloads.

For monitoring your BigQuery queries and tracking performance across JSON-heavy workloads, [OneUptime](https://oneuptime.com) can help you stay on top of query costs and execution times.
