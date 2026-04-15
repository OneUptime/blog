# How to Use the New JSON Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, JSON, Data Type

Description: Learn how to use ClickHouse's new JSON data type for dot-notation path access, dynamic subcolumns, and efficient semi-structured data storage.

---

ClickHouse 24.8 introduced a native `JSON` data type designed to replace the earlier `Object('json')` experimental type. The new `JSON` type stores semi-structured data with automatic path inference, typed subcolumns, and efficient columnar compression. Each unique JSON path becomes a separate subcolumn stored independently, giving you the schema flexibility of JSON with performance close to fully typed columns.

## Enabling the JSON Type

The `JSON` type requires an experimental flag in current ClickHouse versions:

```sql
SET allow_experimental_json_type = 1;
```

For persistent use, add this to `users.xml` or a user profile:

```xml
<allow_experimental_json_type>1</allow_experimental_json_type>
```

## Creating a Table with a JSON Column

```sql
SET allow_experimental_json_type = 1;

CREATE TABLE events (
    id         UInt64,
    event_type LowCardinality(String),
    data       JSON,
    ts         DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (event_type, ts);
```

## Inserting JSON Data

The `JSON` column accepts any valid JSON object. Different rows can have different keys - the type is schema-flexible.

```sql
INSERT INTO events (id, event_type, data) FORMAT JSONEachRow
{"id": 1, "event_type": "login",    "data": {"user_id": 42, "ip": "192.168.1.1", "success": true}}
{"id": 2, "event_type": "purchase", "data": {"user_id": 42, "item_id": 99, "price": 29.99, "currency": "USD"}}
{"id": 3, "event_type": "error",    "data": {"user_id": 7,  "code": 500, "message": "Internal error"}}
{"id": 4, "event_type": "login",    "data": {"user_id": 18, "ip": "10.0.0.5", "success": false, "attempt": 3}};
```

## Accessing Fields with Dot Notation

Subfields are accessed using dot notation. ClickHouse resolves each path to its inferred type:

```sql
-- Access top-level fields
SELECT
    id,
    event_type,
    data.user_id,
    data.ip
FROM events
WHERE event_type = 'login';

-- Access nested fields
SELECT data.user_id, data.price, data.currency
FROM events
WHERE event_type = 'purchase';

-- Fields absent in a row return NULL
SELECT id, data.code, data.message, data.price
FROM events;
-- For login/purchase rows, data.code and data.message are NULL
-- For error rows, data.price is NULL
```

## Dynamic Subcolumns

The `JSON` type stores each distinct path as a separate subcolumn with its inferred type. You can inspect the structure of a JSON column:

```sql
-- View the paths and their types discovered in the column
SELECT DISTINCT arrayJoin(JSONAllPathsWithTypes(data)) AS path_info
FROM events;
```

Each subcolumn is stored and compressed independently, so querying `data.user_id` reads only the user_id subcolumn - not the full JSON blob.

## Filtering on JSON Subfields

Filters on JSON subfields use standard SQL operators:

```sql
-- Filter by a boolean subfield
SELECT id, data.user_id, data.ip
FROM events
WHERE data.success = true;

-- Filter by a numeric subfield
SELECT id, data.user_id, data.price
FROM events
WHERE data.price > 20.0;

-- Filter by presence of a field
SELECT id, event_type
FROM events
WHERE data.code IS NOT NULL;
```

## Using JSON with Aggregations

JSON subfields can be used in GROUP BY and aggregate functions:

```sql
-- Count events per user
SELECT
    data.user_id  AS user_id,
    count()       AS event_count
FROM events
GROUP BY data.user_id
ORDER BY event_count DESC;

-- Average purchase price
SELECT
    avg(data.price)  AS avg_price,
    count()          AS total_purchases
FROM events
WHERE event_type = 'purchase';

-- Count failed logins per IP
SELECT
    data.ip       AS ip,
    count()       AS failed_attempts
FROM events
WHERE event_type = 'login'
  AND data.success = false
GROUP BY data.ip
ORDER BY failed_attempts DESC;
```

## Handling Arrays and Nested Objects in JSON

The `JSON` type supports nested objects and arrays accessed via dot notation and array index:

```sql
INSERT INTO events (id, event_type, data) FORMAT JSONEachRow
{"id": 5, "event_type": "batch", "data": {"user_id": 42, "items": [{"id": 1, "qty": 2}, {"id": 3, "qty": 1}]}};

-- Access nested array elements
SELECT data.items FROM events WHERE id = 5;

-- Access a specific array path
SELECT data.items.id FROM events WHERE id = 5;
-- Result: [1, 3]
```

## Comparing JSON Type to String + JSONExtract

```sql
-- Old approach: store as String, extract at query time
SELECT JSONExtractInt(payload, 'user_id') FROM raw_events;

-- New approach: store as JSON, access via dot notation
SELECT data.user_id FROM events;
```

The `JSON` type stores subcolumns separately, avoiding repeated JSON parsing. For high-frequency queries on specific paths, the `JSON` type is significantly faster than `JSONExtract` on a `String` column.

## Summary

The new `JSON` type in ClickHouse 24.8+ stores semi-structured data as typed subcolumns indexed by path, allowing dot-notation access, NULL for missing fields, and efficient columnar storage per path. It combines the schema flexibility of JSON with the query performance of structured columns, making it the preferred choice over `String` + `JSONExtract` for semi-structured workloads on modern ClickHouse versions.
