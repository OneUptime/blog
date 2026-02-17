# How to Store and Query JSON Data in Cloud Spanner with JSON Type Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, JSON, Database, Semi-Structured Data

Description: Learn how to use Cloud Spanner's native JSON column type to store, query, and index semi-structured data alongside your relational schema for flexible data modeling.

---

Relational databases are great when your schema is well-defined, but real-world applications rarely have that luxury. Configuration blobs, API responses, user preferences, event payloads - these things change shape constantly. You used to have two choices: add columns every time the shape changed, or serialize everything into a STRING column and lose the ability to query it. Cloud Spanner's JSON type gives you a third option that keeps the best of both worlds.

Spanner's JSON column type stores JSON documents natively and lets you query into them using SQL functions. You get the flexibility of a document store with the transactional guarantees and global distribution of Spanner.

## Creating Tables with JSON Columns

Adding a JSON column to a table is straightforward. Just use the JSON type in your DDL:

```sql
-- Create a table with both structured columns and a flexible JSON column
-- The metadata column stores semi-structured data that varies per event
CREATE TABLE Events (
  EventId STRING(36) NOT NULL,
  EventType STRING(64) NOT NULL,
  Timestamp TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
  UserId STRING(36),
  Metadata JSON,
) PRIMARY KEY (EventId);
```

You can also add a JSON column to an existing table:

```sql
-- Add a JSON column to an existing table without downtime
ALTER TABLE Users ADD COLUMN Preferences JSON;
```

## Inserting JSON Data

When inserting JSON data, you pass it as a JSON string. Spanner parses and validates it on insert:

```sql
-- Insert an event with a JSON metadata payload
-- Spanner validates the JSON is well-formed on insert
INSERT INTO Events (EventId, EventType, Timestamp, UserId, Metadata)
VALUES (
  'evt-001',
  'purchase',
  PENDING_COMMIT_TIMESTAMP(),
  'user-abc',
  JSON '{"product_id": "prod-123", "quantity": 2, "price": 29.99, "currency": "USD", "tags": ["electronics", "sale"]}'
);

-- Insert another event with a completely different metadata structure
-- This flexibility is the main advantage of JSON columns
INSERT INTO Events (EventId, EventType, Timestamp, UserId, Metadata)
VALUES (
  'evt-002',
  'page_view',
  PENDING_COMMIT_TIMESTAMP(),
  'user-def',
  JSON '{"url": "/products/123", "referrer": "https://google.com", "duration_ms": 4500}'
);
```

Notice that the two rows have different shapes in their Metadata column. This is perfectly valid with JSON columns.

## Querying JSON Fields

Spanner provides several functions for extracting data from JSON columns. The most commonly used ones are JSON_VALUE, JSON_QUERY, and JSON_QUERY_ARRAY.

JSON_VALUE extracts a scalar value as a string:

```sql
-- Extract scalar values from the JSON metadata
-- JSON_VALUE returns a STRING, so cast it if you need a numeric type
SELECT
  EventId,
  EventType,
  JSON_VALUE(Metadata, '$.product_id') AS ProductId,
  CAST(JSON_VALUE(Metadata, '$.price') AS FLOAT64) AS Price,
  JSON_VALUE(Metadata, '$.currency') AS Currency
FROM Events
WHERE EventType = 'purchase';
```

JSON_QUERY extracts a JSON object or array (keeping it as JSON):

```sql
-- Extract a nested JSON object or array
-- JSON_QUERY returns JSON type, not STRING
SELECT
  EventId,
  JSON_QUERY(Metadata, '$.tags') AS Tags
FROM Events
WHERE EventType = 'purchase';
```

JSON_QUERY_ARRAY returns an array that you can unnest:

```sql
-- Unnest a JSON array to get individual elements
-- This is useful for searching within arrays embedded in JSON
SELECT
  EventId,
  tag
FROM Events,
UNNEST(JSON_QUERY_ARRAY(Metadata, '$.tags')) AS tag
WHERE EventType = 'purchase';
```

## Filtering on JSON Fields

You can use JSON extraction in WHERE clauses to filter rows based on nested values:

```sql
-- Find all purchase events where the price exceeded 100
SELECT EventId, Timestamp, Metadata
FROM Events
WHERE EventType = 'purchase'
  AND CAST(JSON_VALUE(Metadata, '$.price') AS FLOAT64) > 100.0;
```

```sql
-- Find events with a specific nested value
SELECT EventId, Timestamp
FROM Events
WHERE JSON_VALUE(Metadata, '$.currency') = 'EUR';
```

## Working with Nested JSON

JSON documents can be deeply nested, and you navigate through levels using dot notation in the JSON path:

```sql
-- Insert a document with nested objects
INSERT INTO Events (EventId, EventType, Timestamp, Metadata)
VALUES (
  'evt-003',
  'checkout',
  PENDING_COMMIT_TIMESTAMP(),
  JSON '{
    "cart": {
      "items": [
        {"sku": "A001", "qty": 1, "price": 19.99},
        {"sku": "B002", "qty": 3, "price": 5.99}
      ],
      "subtotal": 37.96
    },
    "shipping": {
      "method": "express",
      "address": {
        "city": "Portland",
        "state": "OR"
      }
    }
  }'
);

-- Query deeply nested values using dot notation
SELECT
  EventId,
  JSON_VALUE(Metadata, '$.shipping.address.city') AS City,
  JSON_VALUE(Metadata, '$.shipping.method') AS ShippingMethod,
  CAST(JSON_VALUE(Metadata, '$.cart.subtotal') AS FLOAT64) AS Subtotal
FROM Events
WHERE EventId = 'evt-003';
```

## Indexing JSON Fields with Generated Columns

JSON columns themselves cannot be directly indexed. But you can create generated columns that extract specific JSON paths, and then index those:

```sql
-- Add a generated column that extracts a frequently queried JSON field
-- This column is automatically populated and kept in sync
ALTER TABLE Events ADD COLUMN ProductId STRING(36)
  AS (JSON_VALUE(Metadata, '$.product_id')) STORED;

-- Now create an index on the generated column for fast lookups
CREATE INDEX EventsByProductId ON Events(ProductId);
```

With this in place, queries that filter on product_id will use the index instead of scanning every row:

```sql
-- This query now uses the EventsByProductId index
-- Much faster than scanning and extracting JSON from every row
SELECT EventId, Timestamp, Metadata
FROM Events
WHERE ProductId = 'prod-123';
```

This pattern is extremely useful. You keep the flexibility of JSON for the full document, but get index-backed performance on the fields you query most often.

## Updating JSON Fields

Spanner does not support partial updates to JSON columns - you need to replace the entire JSON value. If your application needs to update a single field within a JSON document, read the current value first, modify it in your application code, then write the whole thing back.

```sql
-- Replace the entire JSON value
-- There is no way to update just one field within the JSON in Spanner SQL
UPDATE Events
SET Metadata = JSON '{"product_id": "prod-123", "quantity": 3, "price": 29.99, "currency": "USD", "tags": ["electronics", "sale"]}'
WHERE EventId = 'evt-001';
```

In application code using the Spanner client library, this looks more natural:

```python
# Python example: read-modify-write a JSON field
from google.cloud import spanner
import json

instance = spanner.Client().instance('my-instance')
database = instance.database('my-database')

def update_json_field(transaction):
    # Read the current JSON value
    results = transaction.read(
        table='Events',
        columns=['EventId', 'Metadata'],
        keyset=spanner.KeySet(keys=[['evt-001']])
    )
    row = list(results)[0]

    # Parse, modify, and write back the full JSON
    metadata = json.loads(row[1])
    metadata['quantity'] = 3  # Update just the quantity

    transaction.update(
        table='Events',
        columns=['EventId', 'Metadata'],
        values=[['evt-001', json.dumps(metadata)]]
    )

database.run_in_transaction(update_json_field)
```

## JSON vs. Structured Columns

When should you use JSON instead of regular columns? Here are some rules of thumb.

Use JSON when the shape of the data varies between rows, when the schema changes frequently and you do not want DDL migrations, when you are storing third-party data whose structure you do not control, or when you are prototyping and the schema is not yet settled.

Use structured columns when you query the field in most of your queries, when the field is used in joins or as a foreign key, when you need strong type checking at the database level, or when the field is part of your primary access pattern.

Many production schemas use both. Core fields that define your data model are structured columns, while auxiliary or variable data goes into a JSON column. This gives you a stable schema for your main queries while retaining flexibility where you need it.

## Wrapping Up

Cloud Spanner's JSON type bridges the gap between rigid relational modeling and flexible document storage. You get to store semi-structured data without giving up transactions, strong consistency, or SQL querying. The combination of JSON columns with generated columns and secondary indexes means you can have flexible storage with index-backed query performance on the fields that matter most. For applications where data shapes vary across rows or change over time, this is a practical alternative to constant schema migrations.
